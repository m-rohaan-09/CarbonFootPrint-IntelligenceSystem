const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logAudit = require('../utils/auditLogger');
const { sendOTPEmail, sendEmailVerificationOTP } = require('../utils/email');

const router = express.Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// Helper: generate tokens
const generateAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });

// ─── SIGNUP ────────────────────────────────────────────
router.post(
  '/signup',
  [
    body('firstName').trim().notEmpty().escape(),
    body('lastName').trim().notEmpty().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('role').optional().isIn(['company_rep', 'employee', 'auditor']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const { firstName, lastName, email, password, role } = req.body;

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        role: role || 'employee',
        isActive: false,
        isEmailVerified: false,
        otpCode: otp,
        otpExpiry,
      });

      const emailSent = await sendEmailVerificationOTP(email, firstName, otp);
      if (!emailSent) {
        console.warn(`[AUTH] Verification email failed for ${email}. OTP: ${otp}`);
      }

      await logAudit({
        userId: user.id,
        userEmail: email,
        action: 'SIGNUP',
        resource: 'users',
        resourceId: user.id,
        details: emailSent ? 'Verification OTP sent' : 'Verification OTP generated but email delivery failed',
        req,
      });

      const response = {
        message: emailSent
          ? 'Account created. Please check your email for the OTP to verify your account.'
          : 'Account created. OTP was generated, but email delivery failed. Please use the OTP shown in the server log or retry the verification email.',
        email,
      };

      if (!emailSent && process.env.NODE_ENV !== 'production') {
        response.debugOtp = otp;
      }

      res.status(201).json(response);
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── LOGIN ─────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Invalid input' });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check lock
      if (user.isLocked()) {
        const remainingMs = user.lockUntil - new Date();
        const remainingMin = Math.ceil(remainingMs / 60000);
        await logAudit({
          userId: user.id,
          userEmail: email,
          action: 'LOGIN_LOCKED',
          resource: 'auth',
          details: `Account locked. ${remainingMin} min remaining.`,
          req,
        });
        return res.status(423).json({
          message: `Account locked. Try again in ${remainingMin} minute(s).`,
          lockedUntil: user.lockUntil,
        });
      }

      if (!user.isEmailVerified) {
        return res.status(403).json({ message: 'Email not verified. Please verify your account first.', emailNotVerified: true, email: user.email });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account deactivated. Contact admin.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
          await user.save();
          await logAudit({
            userId: user.id,
            userEmail: email,
            action: 'LOGIN_LOCKOUT',
            resource: 'auth',
            details: `Locked after ${MAX_LOGIN_ATTEMPTS} failed attempts`,
            req,
          });
          return res.status(423).json({
            message: 'Account locked for 15 minutes due to too many failed attempts.',
            attemptsRemaining: 0,
          });
        }
        await user.save();
        await logAudit({
          userId: user.id,
          userEmail: email,
          action: 'LOGIN_FAILED',
          resource: 'auth',
          details: `Attempt ${user.loginAttempts} of ${MAX_LOGIN_ATTEMPTS}`,
          req,
        });
        return res.status(401).json({
          message: 'Invalid email or password',
          attemptsRemaining: MAX_LOGIN_ATTEMPTS - user.loginAttempts,
        });
      }

      // Success — reset attempts
      user.loginAttempts = 0;
      user.lockUntil = null;
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      user.refreshToken = refreshToken;
      await user.save();

      await logAudit({
        userId: user.id,
        userEmail: email,
        action: 'LOGIN_SUCCESS',
        resource: 'auth',
        req,
      });

      res.json({
        message: 'Login successful',
        user: user.toSafeJSON(),
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── REFRESH TOKEN ─────────────────────────────────────
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user || user.refreshToken !== refreshToken || !user.isActive) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

// ─── LOGOUT ────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  req.user.refreshToken = null;
  await req.user.save();

  await logAudit({
    userId: req.user.id,
    userEmail: req.user.email,
    action: 'LOGOUT',
    resource: 'auth',
    req,
  });

  res.json({ message: 'Logged out successfully' });
});

// ─── VERIFY EMAIL (account creation OTP) ──────────────
router.post(
  '/verify-email',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      }

      const { email, otp } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ message: 'Email is already verified. Please login.' });
      }

      if (user.otpCode !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      user.isEmailVerified = true;
      user.otpCode = null;
      user.otpExpiry = null;
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      user.refreshToken = refreshToken;
      await user.save();

      await logAudit({
        userId: user.id,
        userEmail: email,
        action: 'EMAIL_VERIFIED',
        resource: 'auth',
        details: 'Email verified on account creation',
        req,
      });

      res.json({
        message: 'Email verified successfully. Welcome to CFIS!',
        user: user.toSafeJSON(),
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error('Verify email error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── RESEND VERIFICATION OTP ───────────────────────────
router.post(
  '/resend-verification-otp',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user || user.isEmailVerified) {
        return res.json({ message: 'If your email is pending verification, a new OTP has been sent.' });
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      user.otpCode = otp;
      user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
      await user.save();

      const emailSent = await sendEmailVerificationOTP(email, user.firstName, otp);
      if (!emailSent) {
        console.warn(`[AUTH] Resend verification email failed for ${email}. OTP: ${otp}`);
      }

      const response = { message: 'If your email is pending verification, a new OTP has been sent.' };
      if (!emailSent && process.env.NODE_ENV !== 'production') {
        response.debugOtp = otp;
      }

      res.json(response);
    } catch (err) {
      console.error('Resend verification OTP error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── FORGOT PASSWORD (send OTP) ───────────────────────
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ where: { email } });

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: 'If the email exists, an OTP has been sent.' });
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      user.otpCode = otp;
      user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
      await user.save();

      const emailSent = await sendOTPEmail(email, otp);
      if (!emailSent) {
        console.warn(`[AUTH] Password reset email failed for ${email}. OTP: ${otp}`);
      }

      await logAudit({
        userId: user.id,
        userEmail: email,
        action: 'FORGOT_PASSWORD',
        resource: 'auth',
        details: emailSent ? 'OTP sent' : 'OTP generated but email delivery failed',
        req,
      });

      const response = { message: 'If the email exists, an OTP has been sent.' };
      if (!emailSent && process.env.NODE_ENV !== 'production') {
        response.debugOtp = otp;
      }

      res.json(response);
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── VERIFY OTP ────────────────────────────────────────
router.post(
  '/verify-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }),
  ],
  async (req, res) => {
    try {
      const { email, otp } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user || user.otpCode !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      // Generate a temporary reset token
      const resetToken = jwt.sign({ id: user.id, purpose: 'reset' }, process.env.JWT_SECRET, {
        expiresIn: '10m',
      });

      res.json({ message: 'OTP verified', resetToken });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── RESET PASSWORD ───────────────────────────────────
router.post(
  '/reset-password',
  [
    body('resetToken').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;
      const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

      if (decoded.purpose !== 'reset') {
        return res.status(400).json({ message: 'Invalid reset token' });
      }

      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      user.password = newPassword;
      user.otpCode = null;
      user.otpExpiry = null;
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();

      await logAudit({
        userId: user.id,
        userEmail: user.email,
        action: 'PASSWORD_RESET',
        resource: 'auth',
        req,
      });

      res.json({ message: 'Password reset successfully' });
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
  }
);

// ─── GET CURRENT USER ─────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

module.exports = router;
