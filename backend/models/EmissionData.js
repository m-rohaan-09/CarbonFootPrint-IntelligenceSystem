const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmissionData = sequelize.define('EmissionData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
  },
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'department_id',
  },
  category: {
    type: DataTypes.ENUM(
      'electricity', 'natural_gas', 'fuel', 'water',
      'waste', 'transport', 'refrigerants', 'other'
    ),
    allowNull: false,
  },
  subCategory: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'sub_category',
  },
  scope: {
    type: DataTypes.ENUM('scope_1', 'scope_2', 'scope_3'),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  emissionFactor: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'emission_factor',
  },
  emissionFactorUnit: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'emission_factor_unit',
  },
  co2Equivalent: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'co2_equivalent',
  },
  periodStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'period_start',
  },
  periodEnd: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'period_end',
  },
  source: {
    type: DataTypes.ENUM('manual', 'csv_upload', 'excel_upload', 'ocr_extraction'),
    allowNull: false,
    defaultValue: 'manual',
  },
  billUploadId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'bill_upload_id',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  enteredById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'entered_by_id',
  },
}, {
  tableName: 'emission_data',
  timestamps: true,
  underscored: true,
});

module.exports = EmissionData;
