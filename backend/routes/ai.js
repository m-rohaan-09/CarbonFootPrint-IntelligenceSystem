const express = require('express');
const http = require('http');
const { EmissionData, Company, Department, CompanyMember } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logAudit = require('../utils/auditLogger');

// JS fallback engine (used when Python ML service is unavailable)
const jsEngine = require('../utils/aiEngine');

const router = express.Router();
router.use(authenticate);

const ML_PORT = process.env.ML_PORT || 5001;

// ─── Helper: call Python ML service ──────────────────
function callPython(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: '127.0.0.1',
      port: ML_PORT,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 30000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.error || 'ML service error'));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error('Invalid response from ML service'));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('ML service timeout'));
    });

    req.write(payload);
    req.end();
  });
}

// ─── Helper: fetch emission records for a company ─────
async function getCompanyEmissions(companyId, userId, userRole) {
  const company = await Company.findByPk(companyId);
  if (!company) return { error: 'Company not found', status: 404 };

  const membership = await CompanyMember.findOne({
    where: { companyId: parseInt(companyId), userId, status: 'active' },
  });

  if (company.ownerId !== userId && userRole !== 'admin' && !membership) {
    return { error: 'Access denied', status: 403 };
  }

  const records = await EmissionData.findAll({
    where: { companyId: parseInt(companyId) },
    include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
    order: [['periodStart', 'ASC']],
  });

  return { company, records };
}

// ─── EMISSION FORECASTING ─────────────────────────────
router.get('/forecast', authorize('company_rep', 'admin', 'employee', 'auditor'), async (req, res) => {
  try {
    const { companyId, months, category } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    const result = await getCompanyEmissions(companyId, req.user.id, req.user.role);
    if (result.error) return res.status(result.status).json({ message: result.error });

    let records = result.records;

    // Optional category filter
    if (category && category !== 'all') {
      records = records.filter((r) => r.category === category);
    }

    if (records.length < 3) {
      return res.status(400).json({
        message: 'Need at least 3 data points for forecasting. Please add more emission data.',
      });
    }

    // Aggregate by month
    const monthlyMap = {};
    for (const r of records) {
      const month = r.periodStart?.substring(0, 7);
      if (month) {
        if (!monthlyMap[month]) monthlyMap[month] = 0;
        monthlyMap[month] += r.co2Equivalent || 0;
      }
    }

    const monthlyData = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, co2]) => ({ month, co2 }));

    const forecastMonths = Math.min(parseInt(months) || 6, 24);

    // Category breakdown
    const categoryBreakdown = {};
    for (const r of records) {
      if (!categoryBreakdown[r.category]) categoryBreakdown[r.category] = 0;
      categoryBreakdown[r.category] += r.co2Equivalent || 0;
    }

    let forecast;
    let engine = 'python';
    try {
      // Try Python ML service first (sklearn + statsmodels ARIMA)
      forecast = await callPython('/forecast', {
        monthly_data: monthlyData,
        forecast_months: forecastMonths,
      });
    } catch (pyErr) {
      // Fallback to JS engine
      console.log(`[AI] Python ML unavailable (${pyErr.message}), using JS fallback`);
      engine = 'javascript';
      forecast = jsEngine.forecastEmissions(monthlyData, forecastMonths);
    }

    if (forecast.error) {
      return res.status(400).json({ message: forecast.error });
    }

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'AI_FORECAST',
      resource: 'ai_module',
      resourceId: parseInt(companyId),
      details: { forecastMonths, dataPoints: monthlyData.length, engine, category: category || 'all' },
      req,
    });

    res.json({
      forecast,
      categoryBreakdown,
      meta: {
        companyId: parseInt(companyId),
        companyName: result.company.name,
        filteredCategory: category || null,
        forecastMonths,
        engine,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Forecast error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── ANOMALY DETECTION ────────────────────────────────
router.get('/anomalies', authorize('company_rep', 'admin', 'employee', 'auditor'), async (req, res) => {
  try {
    const { companyId, threshold } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    const result = await getCompanyEmissions(companyId, req.user.id, req.user.role);
    if (result.error) return res.status(result.status).json({ message: result.error });

    if (result.records.length < 5) {
      return res.status(400).json({
        message: 'Need at least 5 data points for anomaly detection.',
      });
    }

    // Prepare records
    const flatRecords = result.records.map((r) => ({
      id: r.id,
      month: r.periodStart?.substring(0, 7),
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      category: r.category,
      scope: r.scope,
      co2: r.co2Equivalent || 0,
      quantity: r.quantity,
      unit: r.unit,
      departmentName: r.department?.name || 'Unassigned',
      source: r.source,
    }));

    // Overall anomalies
    let overall, byCategory;
    let engine = 'python';
    try {
      // Python ML service (IsolationForest + Z-Score + IQR)
      const pyResult = await callPython('/anomalies', {
        records: flatRecords,
        threshold: parseFloat(threshold) || 2.0,
      });
      overall = { anomalies: pyResult.anomalies, statistics: pyResult.statistics };
      byCategory = pyResult.byCategory || [];
    } catch (pyErr) {
      console.log(`[AI] Python ML unavailable (${pyErr.message}), using JS fallback`);
      engine = 'javascript';
      overall = jsEngine.detectAnomalies(flatRecords, parseFloat(threshold) || 2.0);
      const recordsByCategory = {};
      for (const r of flatRecords) {
        if (!recordsByCategory[r.category]) recordsByCategory[r.category] = [];
        recordsByCategory[r.category].push(r);
      }
      byCategory = jsEngine.detectCategoryAnomalies(recordsByCategory);
    }

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'AI_ANOMALY_DETECTION',
      resource: 'ai_module',
      resourceId: parseInt(companyId),
      details: {
        totalRecords: result.records.length,
        anomaliesFound: overall.anomalies?.length || 0,
        engine,
      },
      req,
    });

    res.json({
      overall,
      byCategory,
      meta: {
        companyId: parseInt(companyId),
        companyName: result.company.name,
        threshold: parseFloat(threshold) || 2.0,
        engine,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Anomaly detection error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── HOTSPOT DETECTION ────────────────────────────────
router.get('/hotspots', authorize('company_rep', 'admin', 'employee', 'auditor'), async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    const result = await getCompanyEmissions(companyId, req.user.id, req.user.role);
    if (result.error) return res.status(result.status).json({ message: result.error });

    if (result.records.length === 0) {
      return res.status(400).json({ message: 'No emission data available for hotspot analysis.' });
    }

    const emissionData = result.records.map((r) => ({
      id: r.id,
      category: r.category,
      scope: r.scope,
      co2Equivalent: r.co2Equivalent || 0,
      quantity: r.quantity,
      departmentName: r.department?.name || 'Unassigned',
    }));

    let hotspots;
    let engine = 'python';
    try {
      hotspots = await callPython('/hotspots', { emission_data: emissionData });
    } catch (pyErr) {
      console.log(`[AI] Python ML unavailable (${pyErr.message}), using JS fallback`);
      engine = 'javascript';
      hotspots = jsEngine.detectHotspots(emissionData);
    }

    res.json({
      hotspots,
      meta: {
        companyId: parseInt(companyId),
        companyName: result.company.name,
        engine,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Hotspot detection error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── AI INSIGHTS & RECOMMENDATIONS (full analysis) ───
router.get('/insights', authorize('company_rep', 'admin', 'employee', 'auditor'), async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    const result = await getCompanyEmissions(companyId, req.user.id, req.user.role);
    if (result.error) return res.status(result.status).json({ message: result.error });

    if (result.records.length === 0) {
      return res.status(400).json({ message: 'No emission data available. Please add data first.' });
    }

    const records = result.records;

    // Prepare data
    const emissionData = records.map((r) => ({
      id: r.id,
      category: r.category,
      scope: r.scope,
      co2Equivalent: r.co2Equivalent || 0,
      quantity: r.quantity,
      departmentName: r.department?.name || 'Unassigned',
      periodStart: r.periodStart,
    }));

    // Build monthly aggregates for forecasting
    const monthlyMap = {};
    for (const r of records) {
      const month = r.periodStart?.substring(0, 7);
      if (month) {
        if (!monthlyMap[month]) monthlyMap[month] = 0;
        monthlyMap[month] += r.co2Equivalent || 0;
      }
    }
    const monthlyData = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, co2]) => ({ month, co2 }));

    const flatRecords = records.map((r) => ({
      id: r.id,
      month: r.periodStart?.substring(0, 7),
      category: r.category,
      scope: r.scope,
      co2: r.co2Equivalent || 0,
      quantity: r.quantity,
    }));

    let forecastResult, anomalies, hotspots, recommendations, insights;
    let engine = 'python';

    try {
      // Run all analyses via Python ML service
      const [forecastRes, anomalyRes, hotspotRes] = await Promise.all([
        monthlyData.length >= 3
          ? callPython('/forecast', { monthly_data: monthlyData, forecast_months: 6 })
          : Promise.resolve(null),
        flatRecords.length >= 5
          ? callPython('/anomalies', { records: flatRecords, threshold: 2.0 })
          : Promise.resolve(null),
        callPython('/hotspots', { emission_data: emissionData }),
      ]);

      forecastResult = forecastRes;
      anomalies = anomalyRes;
      hotspots = hotspotRes;

      // Get insights & recommendations from Python
      const insightRes = await callPython('/insights', {
        emission_data: emissionData,
        forecast: forecastResult,
        anomalies,
        hotspots,
      });

      recommendations = insightRes.recommendations;
      insights = insightRes.insights;
    } catch (pyErr) {
      console.log(`[AI] Python ML unavailable (${pyErr.message}), using JS fallback`);
      engine = 'javascript';

      forecastResult = monthlyData.length >= 3 ? jsEngine.forecastEmissions(monthlyData, 6) : null;
      anomalies = flatRecords.length >= 5 ? jsEngine.detectAnomalies(flatRecords) : null;
      hotspots = jsEngine.detectHotspots(emissionData);
      recommendations = jsEngine.generateRecommendations(emissionData, forecastResult, anomalies, hotspots);
      insights = jsEngine.generateInsights(emissionData, forecastResult, anomalies, hotspots);
    }

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'AI_INSIGHTS',
      resource: 'ai_module',
      resourceId: parseInt(companyId),
      details: {
        totalRecords: records.length,
        insightsGenerated: insights?.length || 0,
        recommendationsGenerated: recommendations?.length || 0,
        engine,
      },
      req,
    });

    res.json({
      insights,
      recommendations,
      forecast: forecastResult ? {
        trend: forecastResult.statistics?.trend,
        monthlyGrowthRate: forecastResult.statistics?.monthlyGrowthRate,
        nextMonthPrediction: forecastResult.forecasts?.[0],
      } : null,
      anomalySummary: anomalies ? {
        total: anomalies.anomalies?.length || 0,
        critical: (anomalies.anomalies || []).filter((a) => a.severity === 'critical').length,
        high: (anomalies.anomalies || []).filter((a) => a.severity === 'high').length,
      } : null,
      hotspotSummary: {
        topCategory: hotspots.topHotspot?.name,
        topPercentage: hotspots.topHotspot?.percentage,
      },
      meta: {
        companyId: parseInt(companyId),
        companyName: result.company.name,
        totalRecords: records.length,
        engine,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
