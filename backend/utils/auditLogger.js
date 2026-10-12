const { AuditLog } = require('../models');

const logAudit = async ({ userId, userEmail, action, resource, resourceId, details, req }) => {
  try {
    await AuditLog.create({
      userId,
      userEmail,
      action,
      resource,
      resourceId,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.get?.('User-Agent') || null,
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = logAudit;
