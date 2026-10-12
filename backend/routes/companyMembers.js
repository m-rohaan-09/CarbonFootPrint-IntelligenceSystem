const express = require('express');
const { body, validationResult } = require('express-validator');
const { Company, CompanyMember, User } = require('../models');
const { authenticate, authorize, requirePermission } = require('../middleware/auth');
const logAudit = require('../utils/auditLogger');

const router = express.Router();

router.use(authenticate);

// Company rep or admin can manage company members
router.get('/company/:companyId', requirePermission('manageCompanyMembers'), async (req, res) => {
  try {
    const companyId = Number(req.params.companyId);
    const company = await Company.findByPk(companyId);

    if (!company) return res.status(404).json({ message: 'Company not found' });
    const membership = await CompanyMember.findOne({ where: { companyId, userId: req.user.id, status: 'active' } });
    const canManage = req.user.role === 'admin' || company.ownerId === req.user.id || (membership && membership.role === 'company_rep');
    if (!canManage) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const members = await CompanyMember.findAll({
      where: { companyId },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
    });

    res.json({ members });
  } catch (err) {
    console.error('List company members error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post(
  '/company/:companyId/invite',
  requirePermission('manageCompanyMembers'),
  [
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['employee', 'auditor']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const companyId = Number(req.params.companyId);
      const { email, role = 'employee' } = req.body;

      const company = await Company.findByPk(companyId);
      if (!company) return res.status(404).json({ message: 'Company not found' });
      const membership = await CompanyMember.findOne({ where: { companyId, userId: req.user.id, status: 'active' } });
      const canManage = req.user.role === 'admin' || company.ownerId === req.user.id || (membership && membership.role === 'company_rep');
      if (!canManage) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({ message: 'User with this email does not exist. Ask them to sign up first.' });
      }

      const existing = await CompanyMember.findOne({ where: { companyId, userId: user.id } });
      if (existing) {
        return res.status(409).json({ message: 'This user is already assigned to the company' });
      }

      const member = await CompanyMember.create({
        companyId,
        userId: user.id,
        role,
        status: 'active',
        invitedBy: req.user.id,
        joinedAt: new Date(),
      });

      await logAudit({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'INVITE_COMPANY_MEMBER',
        resource: 'company_members',
        resourceId: member.id,
        details: { companyId, userId: user.id, role },
        req,
      });

      res.status(201).json({ message: 'User added to company', member });
    } catch (err) {
      console.error('Invite company member error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

router.delete('/company/:companyId/member/:userId', requirePermission('manageCompanyMembers'), async (req, res) => {
  try {
    const companyId = Number(req.params.companyId);
    const userId = Number(req.params.userId);

    if (req.user.id === userId) {
      return res.status(403).json({ message: 'You cannot remove yourself from the company member list' });
    }

    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const membership = await CompanyMember.findOne({ where: { companyId, userId: req.user.id, status: 'active' } });
    const canManage = req.user.role === 'admin' || company.ownerId === req.user.id || (membership && membership.role === 'company_rep');
    if (!canManage) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const member = await CompanyMember.findOne({ where: { companyId, userId } });
    if (!member) return res.status(404).json({ message: 'Company member not found' });

    await member.destroy();

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'REMOVE_COMPANY_MEMBER',
      resource: 'company_members',
      resourceId: member.id,
      details: { companyId, userId },
      req,
    });

    res.json({ message: 'User removed from company' });
  } catch (err) {
    console.error('Remove company member error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
