const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',
  },
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'user_email',
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  resource: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  resourceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'resource_id',
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'user_agent',
  },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false, // immutable
  underscored: true,
});

module.exports = AuditLog;
