const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  industry: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  registrationNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'registration_number',
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  province: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  employeeCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'employee_count',
  },
  fiscalYearStart: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'fiscal_year_start',
  },
  baselineYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'baseline_year',
  },
  onboardingCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'onboarding_completed',
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'owner_id',
  },
}, {
  tableName: 'companies',
  timestamps: true,
  underscored: true,
});

module.exports = Company;
