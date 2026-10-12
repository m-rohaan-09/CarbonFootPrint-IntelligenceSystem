const User = require('./User');
const AuditLog = require('./AuditLog');
const Company = require('./Company');
const CompanyMember = require('./CompanyMember');
const Department = require('./Department');
const EmissionData = require('./EmissionData');
const BillUpload = require('./BillUpload');

// User ↔ AuditLog
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User ↔ Company (owner)
User.hasOne(Company, { foreignKey: 'owner_id', as: 'company' });
Company.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// User ↔ Company memberships
User.hasMany(CompanyMember, { foreignKey: 'user_id', as: 'companyMemberships' });
CompanyMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Company.hasMany(CompanyMember, { foreignKey: 'company_id', as: 'members' });
CompanyMember.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Company ↔ Department
Company.hasMany(Department, { foreignKey: 'company_id', as: 'departments' });
Department.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Company ↔ EmissionData
Company.hasMany(EmissionData, { foreignKey: 'company_id', as: 'emissionData' });
EmissionData.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// Department ↔ EmissionData
Department.hasMany(EmissionData, { foreignKey: 'department_id', as: 'emissionData' });
EmissionData.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Company ↔ BillUpload
Company.hasMany(BillUpload, { foreignKey: 'company_id', as: 'billUploads' });
BillUpload.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// BillUpload ↔ EmissionData
BillUpload.hasMany(EmissionData, { foreignKey: 'bill_upload_id', as: 'emissionRecords' });
EmissionData.belongsTo(BillUpload, { foreignKey: 'bill_upload_id', as: 'billUpload' });

// User ↔ EmissionData (entered by)
User.hasMany(EmissionData, { foreignKey: 'entered_by_id', as: 'enteredEmissions' });
EmissionData.belongsTo(User, { foreignKey: 'entered_by_id', as: 'enteredBy' });

// User ↔ BillUpload (uploaded by)
User.hasMany(BillUpload, { foreignKey: 'uploaded_by_id', as: 'uploads' });
BillUpload.belongsTo(User, { foreignKey: 'uploaded_by_id', as: 'uploadedBy' });

module.exports = { User, AuditLog, Company, CompanyMember, Department, EmissionData, BillUpload };
