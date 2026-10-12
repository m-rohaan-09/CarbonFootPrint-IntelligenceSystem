const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name',
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name',
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'company_rep', 'employee', 'auditor'),
    allowNull: false,
    defaultValue: 'employee',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'login_attempts',
  },
  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'lock_until',
  },
  otpCode: {
    type: DataTypes.STRING(6),
    allowNull: true,
    field: 'otp_code',
  },
  otpExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'otp_expiry',
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_email_verified',
  },
  refreshToken: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'refresh_token',
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  avatarUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'avatar_url',
  },
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, 12);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.isLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

User.prototype.toSafeJSON = function () {
  const obj = this.toJSON();
  delete obj.password;
  delete obj.otpCode;
  delete obj.otpExpiry;
  delete obj.refreshToken;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

module.exports = User;
