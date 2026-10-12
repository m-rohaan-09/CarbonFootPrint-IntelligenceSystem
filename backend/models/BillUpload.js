const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BillUpload = sequelize.define('BillUpload', {
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
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'file_name',
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'original_name',
  },
  fileType: {
    type: DataTypes.ENUM('csv', 'excel', 'pdf'),
    allowNull: false,
    field: 'file_type',
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'file_path',
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size',
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending',
  },
  extractedData: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'extracted_data',
  },
  ocrText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'ocr_text',
  },
  recordsImported: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'records_imported',
  },
  errorLog: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_log',
  },
  uploadedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'uploaded_by_id',
  },
}, {
  tableName: 'bill_uploads',
  timestamps: true,
  underscored: true,
});

module.exports = BillUpload;
