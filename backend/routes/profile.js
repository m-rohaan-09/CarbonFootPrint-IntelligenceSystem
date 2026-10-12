const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const logAudit = require('../utils/auditLogger');

const router = express.Router();

router.use(authenticate);

// ─── GET PROFILE ──────────────────────────────────────
router.get('/', async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

// ─── UPDATE PROFILE ───────────────────────────────────
router.put(
  '/',
  [
    body('firstName').optional().trim().notEmpty().escape(),
    body('lastName').optional().trim().notEmpty().escape(),
    body('phone').optional().trim().escape(),
    body('department').optional().trim().escape(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const allowed = ['firstName', 'lastName', 'phone', 'department'];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      await req.user.update(updates);

      await logAudit({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'UPDATE_PROFILE',
        resource: 'users',
        resourceId: req.user.id,
        details: updates,
        req,
      });

      res.json({ message: 'Profile updated', user: req.user.toSafeJSON() });
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── CHANGE PASSWORD ──────────────────────────────────
router.put(
  '/change-password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const isMatch = await req.user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      req.user.password = newPassword;
      await req.user.save();

      await logAudit({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'CHANGE_PASSWORD',
        resource: 'users',
        resourceId: req.user.id,
        req,
      });

      res.json({ message: 'Password changed successfully' });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
