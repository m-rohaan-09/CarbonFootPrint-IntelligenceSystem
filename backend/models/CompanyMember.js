const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CompanyMember = sequelize.define('CompanyMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
    references: {
      model: 'companies',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  role: {
    type: DataTypes.ENUM('company_rep', 'employee', 'auditor'),
    allowNull: false,
    defaultValue: 'employee',
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'rejected'),
    allowNull: false,
    defaultValue: 'active',
  },
  invitedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'invited_by',
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'joined_at',
  },
}, {
  tableName: 'company_members',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['company_id', 'user_id'],
    },
  ],
});

module.exports = CompanyMember;
