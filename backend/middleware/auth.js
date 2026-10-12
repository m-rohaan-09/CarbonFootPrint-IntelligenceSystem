const jwt = require('jsonwebtoken');
const { User, CompanyMember } = require('../models');

const ROLE_PERMISSIONS = {
  admin: {
    viewCompanyDetails: true,
    manageCompanyDetails: true,
    manageDepartments: true,
    manageCompanyMembers: true,
    viewDataAndAnalytics: true,
    editCarbonFootprintData: true,
    exportCarbonFootprintData: true,
    removeCompany: true,
  },
  company_rep: {
    viewCompanyDetails: true,
    manageCompanyDetails: true,
    manageDepartments: true,
    manageCompanyMembers: true,
    viewDataAndAnalytics: true,
    editCarbonFootprintData: true,
    exportCarbonFootprintData: true,
    removeCompany: false,
  },
  employee: {
    viewCompanyDetails: false,
    manageCompanyDetails: false,
    manageDepartments: false,
    manageCompanyMembers: false,
    viewDataAndAnalytics: true,
    editCarbonFootprintData: false,
    exportCarbonFootprintData: false,
    removeCompany: false,
  },
  auditor: {
    viewCompanyDetails: false,
    manageCompanyDetails: false,
    manageDepartments: false,
    manageCompanyMembers: false,
    viewDataAndAnalytics: true,
    editCarbonFootprintData: true,
    exportCarbonFootprintData: true,
    removeCompany: false,
  },
};

const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  return Boolean(ROLE_PERMISSIONS[user.role]?.[permission]);
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
};

const requireCompanyAccess = (allowedRoles = ['company_rep', 'employee', 'auditor']) => {
  return async (req, res, next) => {
    try {
      const companyId = Number(req.params.companyId || req.body.companyId || req.query.companyId);

      if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
      }

      if (req.user.role === 'admin') {
        return next();
      }

      const membership = await CompanyMember.findOne({
        where: {
          companyId,
          userId: req.user.id,
          status: 'active',
        },
      });

      if (!membership || !allowedRoles.includes(membership.role)) {
        return res.status(403).json({ message: 'You are not assigned to this company' });
      }

      req.companyMembership = membership;
      next();
    } catch (err) {
      console.error('Company access check failed:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  };
};

module.exports = { authenticate, authorize, requirePermission, requireCompanyAccess, hasPermission, ROLE_PERMISSIONS };
