const express = require('express');
const { EmissionData, Company, Department, CompanyMember } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logAudit = require('../utils/auditLogger');
const sequelize = require('../config/database');

const router = express.Router();

router.use(authenticate);

// ─── CALCULATE BASELINE EMISSIONS ─────────────────────
router.get('/calculate', authorize('company_rep', 'admin', 'employee', 'auditor'), async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const membership = await CompanyMember.findOne({
      where: { companyId: parseInt(companyId), userId: req.user.id, status: 'active' },
    });
    const hasAccess =
      company.ownerId === req.user.id ||
      req.user.role === 'admin' ||
      (membership && ['company_rep', 'employee', 'auditor'].includes(membership.role));

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get all emission records for this company
    const allRecords = await EmissionData.findAll({
      where: { companyId: parseInt(companyId) },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      order: [['periodStart', 'ASC']],
    });

    if (allRecords.length === 0) {
      return res.status(404).json({ message: 'No emission data found. Please add data first.' });
    }

    // Total emissions
    const totalCO2e = allRecords.reduce((sum, r) => sum + (r.co2Equivalent || 0), 0);

    // By scope
    const byScope = {};
    allRecords.forEach((r) => {
      if (!byScope[r.scope]) byScope[r.scope] = 0;
      byScope[r.scope] += r.co2Equivalent || 0;
    });

    // By category
    const byCategory = {};
    allRecords.forEach((r) => {
      if (!byCategory[r.category]) byCategory[r.category] = 0;
      byCategory[r.category] += r.co2Equivalent || 0;
    });

    // By department
    const byDepartment = {};
    allRecords.forEach((r) => {
      const deptName = r.department?.name || 'Unassigned';
      if (!byDepartment[deptName]) byDepartment[deptName] = 0;
      byDepartment[deptName] += r.co2Equivalent || 0;
    });

    // Monthly trend
    const monthlyTrend = {};
    allRecords.forEach((r) => {
      const month = r.periodStart?.substring(0, 7); // YYYY-MM
      if (month) {
        if (!monthlyTrend[month]) monthlyTrend[month] = 0;
        monthlyTrend[month] += r.co2Equivalent || 0;
      }
    });

    // By source
    const bySource = {};
    allRecords.forEach((r) => {
      if (!bySource[r.source]) bySource[r.source] = 0;
      bySource[r.source] += r.co2Equivalent || 0;
    });

    const baseline = {
      companyId: parseInt(companyId),
      companyName: company.name,
      baselineYear: company.baselineYear,
      totalRecords: allRecords.length,
      totalCO2e: Math.round(totalCO2e * 100) / 100,
      totalCO2eTonnes: Math.round((totalCO2e / 1000) * 100) / 100,
      byScope: Object.fromEntries(
        Object.entries(byScope).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      byDepartment: Object.fromEntries(
        Object.entries(byDepartment).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      monthlyTrend: Object.fromEntries(
        Object.entries(monthlyTrend)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      bySource: Object.fromEntries(
        Object.entries(bySource).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      calculatedAt: new Date().toISOString(),
    };

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'CALCULATE_BASELINE',
      resource: 'companies',
      resourceId: parseInt(companyId),
      details: { totalCO2e: baseline.totalCO2e, totalRecords: baseline.totalRecords },
      req,
    });

    res.json({ baseline });
  } catch (err) {
    console.error('Baseline calculation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET EMISSION SUMMARY (quick stats) ───────────────
router.get('/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    const company = await Company.findByPk(parseInt(companyId));
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const membership = await CompanyMember.findOne({
      where: { companyId: parseInt(companyId), userId: req.user.id, status: 'active' },
    });
    const hasAccess =
      company.ownerId === req.user.id ||
      req.user.role === 'admin' ||
      (membership && ['company_rep', 'employee', 'auditor'].includes(membership.role));

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const totalRecords = await EmissionData.count({ where: { companyId: parseInt(companyId) } });
    const allRecords = await EmissionData.findAll({
      where: { companyId: parseInt(companyId) },
      attributes: ['co2Equivalent', 'category', 'scope'],
    });

    const totalCO2e = allRecords.reduce((sum, r) => sum + (r.co2Equivalent || 0), 0);

    const categories = [...new Set(allRecords.map((r) => r.category))];
    const scopes = [...new Set(allRecords.map((r) => r.scope))];

    res.json({
      summary: {
        totalRecords,
        totalCO2e: Math.round(totalCO2e * 100) / 100,
        totalCO2eTonnes: Math.round((totalCO2e / 1000) * 100) / 100,
        categories,
        scopes,
      },
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
