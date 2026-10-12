const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op, Transaction } = require('sequelize');
const sequelize = require('../config/database');
const { User, AuditLog, Company, Department, EmissionData, BillUpload } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logAudit = require('../utils/auditLogger');

const router = express.Router();

// All routes require admin
router.use(authenticate, authorize('admin'));

// ─── LIST USERS ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const { role, search, isActive } = req.query;

    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'otpCode', 'otpExpiry', 'refreshToken'] },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      users: rows,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit,
      },
    });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET SINGLE USER ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'otpCode', 'otpExpiry', 'refreshToken'] },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── CREATE USER (Admin) ──────────────────────────────
router.post(
  '/',
  [
    body('firstName').trim().notEmpty().escape(),
    body('lastName').trim().notEmpty().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('role').isIn(['admin', 'company_rep', 'employee', 'auditor']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const { firstName, lastName, email, password, role, phone, department } = req.body;

      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(409).json({ message: 'Email already registered' });

      const user = await User.create({ firstName, lastName, email, password, role, phone, department, isEmailVerified: true });

      await logAudit({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'CREATE_USER',
        resource: 'users',
        resourceId: user.id,
        details: { createdRole: role, createdEmail: email },
        req,
      });

      res.status(201).json({ message: 'User created', user: user.toSafeJSON() });
    } catch (err) {
      console.error('Create user error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── UPDATE USER ──────────────────────────────────────
router.put(
  '/:id',
  [
    body('firstName').optional().trim().notEmpty().escape(),
    body('lastName').optional().trim().notEmpty().escape(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'company_rep', 'employee', 'auditor']),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const allowed = ['firstName', 'lastName', 'email', 'role', 'isActive', 'phone', 'department'];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      await user.update(updates);

      await logAudit({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'UPDATE_USER',
        resource: 'users',
        resourceId: user.id,
        details: updates,
        req,
      });

      res.json({ message: 'User updated', user: user.toSafeJSON() });
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── DELETE USER ──────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const adminCount = await User.count({ where: { role: 'admin' } });
    if (user.role === 'admin' && adminCount <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last remaining admin user' });
    }

    await sequelize.transaction(async (transaction) => {
      await AuditLog.destroy({ where: { userId: user.id }, transaction });

      const company = await Company.findOne({ where: { ownerId: user.id }, transaction });
      if (company) {
        await EmissionData.destroy({ where: { companyId: company.id }, transaction });
        await BillUpload.destroy({ where: { companyId: company.id }, transaction });
        await Department.destroy({ where: { companyId: company.id }, transaction });
        await company.destroy({ transaction });
      }

      await EmissionData.destroy({ where: { enteredById: user.id }, transaction });
      await BillUpload.destroy({ where: { uploadedById: user.id }, transaction });
      await user.destroy({ transaction });
    });

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'DELETE_USER',
      resource: 'users',
      resourceId: user.id,
      details: { deletedEmail: user.email, deletedRole: user.role },
      req,
    });

    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── UNLOCK USER ──────────────────────────────────────
router.post('/:id/unlock', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'UNLOCK_USER',
      resource: 'users',
      resourceId: user.id,
      req,
    });

    res.json({ message: 'User unlocked' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── AUDIT LOGS ───────────────────────────────────────
router.get('/audit/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.action) where.action = req.query.action;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }],
    });

    res.json({
      logs: rows,
      pagination: { total: count, page, pages: Math.ceil(count / limit), limit },
    });
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
