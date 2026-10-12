/**
 * CFIS Module 3 — AI Engine
 * Pure JavaScript ML algorithms for emission forecasting, anomaly detection,
 * hotspot identification, and smart recommendations.
 * No external ML libraries needed.
 */

// ─── LINEAR REGRESSION ────────────────────────────────
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const { x, y } of points) {
    ssTot += (y - yMean) ** 2;
    ssRes += (y - (slope * x + intercept)) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

// ─── MOVING AVERAGE ───────────────────────────────────
function movingAverage(values, window = 3) {
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

// ─── EXPONENTIAL SMOOTHING ────────────────────────────
function exponentialSmoothing(values, alpha = 0.3) {
  if (values.length === 0) return [];
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// ─── FORECAST EMISSIONS ──────────────────────────────
function forecastEmissions(monthlyData, forecastMonths = 6) {
  // monthlyData: [{ month: 'YYYY-MM', co2: number }] sorted ascending
  if (monthlyData.length < 3) {
    return { error: 'Need at least 3 months of data for forecasting' };
  }

  // Assign numeric indices
  const points = monthlyData.map((d, i) => ({ x: i, y: d.co2 }));
  const values = monthlyData.map((d) => d.co2);

  // Linear regression forecast
  const lr = linearRegression(points);

  // Moving average smoothed
  const ma = movingAverage(values, 3);

  // Exponential smoothing
  const es = exponentialSmoothing(values, 0.3);

  // Generate future predictions
  const lastMonth = monthlyData[monthlyData.length - 1].month;
  const forecasts = [];

  for (let i = 1; i <= forecastMonths; i++) {
    const idx = points.length - 1 + i;
    const nextMonth = addMonths(lastMonth, i);

    // Linear regression prediction
    const lrPred = Math.max(0, lr.slope * idx + lr.intercept);

    // Weighted ensemble: 50% LR + 30% ES trend + 20% MA trend
    const esLast = es[es.length - 1];
    const esTrend = es.length >= 2 ? (es[es.length - 1] - es[es.length - 2]) : 0;
    const esPred = Math.max(0, esLast + esTrend * i);

    const maLast = ma[ma.length - 1];
    const maTrend = ma.length >= 2 ? (ma[ma.length - 1] - ma[ma.length - 2]) : 0;
    const maPred = Math.max(0, maLast + maTrend * i);

    const ensemble = 0.5 * lrPred + 0.3 * esPred + 0.2 * maPred;

    // Confidence interval (wider for further out)
    const stdDev = calculateStdDev(values);
    const confidenceWidth = stdDev * Math.sqrt(i) * 1.96;

    forecasts.push({
      month: nextMonth,
      predicted: round(ensemble),
      lowerBound: round(Math.max(0, ensemble - confidenceWidth)),
      upperBound: round(ensemble + confidenceWidth),
      confidence: round(Math.max(0.5, lr.r2 - i * 0.05), 2),
      method: 'ensemble',
    });
  }

  // Trend analysis
  const trend = lr.slope > 0.5 ? 'increasing' : lr.slope < -0.5 ? 'decreasing' : 'stable';
  const monthlyGrowthRate = values.length >= 2
    ? ((values[values.length - 1] - values[0]) / values[0] / (values.length - 1)) * 100
    : 0;

  return {
    historical: monthlyData.map((d, i) => ({
      month: d.month,
      actual: round(d.co2),
      smoothed: round(ma[i]),
    })),
    forecasts,
    statistics: {
      trend,
      r2: round(lr.r2, 3),
      slope: round(lr.slope, 3),
      monthlyGrowthRate: round(monthlyGrowthRate, 2),
      avgEmission: round(values.reduce((a, b) => a + b, 0) / values.length),
      maxEmission: round(Math.max(...values)),
      minEmission: round(Math.min(...values)),
      totalDataPoints: values.length,
    },
  };
}

// ─── ANOMALY DETECTION (Z-Score + IQR) ────────────────
function detectAnomalies(records, threshold = 2.0) {
  // records: [{ id, month, category, co2, quantity, ... }]
  if (records.length < 5) {
    return { anomalies: [], message: 'Need at least 5 records for anomaly detection' };
  }

  const co2Values = records.map((r) => r.co2);
  const mean = co2Values.reduce((a, b) => a + b, 0) / co2Values.length;
  const stdDev = calculateStdDev(co2Values);

  // IQR method
  const sorted = [...co2Values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const anomalies = [];

  for (const record of records) {
    const zScore = stdDev === 0 ? 0 : (record.co2 - mean) / stdDev;
    const isZAnomaly = Math.abs(zScore) > threshold;
    const isIQRAnomaly = record.co2 < lowerFence || record.co2 > upperFence;

    if (isZAnomaly || isIQRAnomaly) {
      let severity = 'low';
      if (Math.abs(zScore) > 3 || record.co2 > upperFence + iqr) severity = 'critical';
      else if (Math.abs(zScore) > 2.5 || record.co2 > upperFence + 0.5 * iqr) severity = 'high';
      else if (Math.abs(zScore) > 2) severity = 'medium';

      const direction = record.co2 > mean ? 'spike' : 'drop';

      anomalies.push({
        ...record,
        zScore: round(zScore, 2),
        severity,
        direction,
        deviation: round(((record.co2 - mean) / mean) * 100, 1),
        explanation: generateAnomalyExplanation(record, mean, zScore, direction, severity),
      });
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    anomalies,
    statistics: {
      mean: round(mean),
      stdDev: round(stdDev),
      q1: round(q1),
      q3: round(q3),
      iqr: round(iqr),
      lowerFence: round(lowerFence),
      upperFence: round(upperFence),
      totalRecords: records.length,
      anomalyCount: anomalies.length,
      anomalyRate: round((anomalies.length / records.length) * 100, 1),
    },
  };
}

// ─── CATEGORY-LEVEL ANOMALY DETECTION ─────────────────
function detectCategoryAnomalies(recordsByCategory) {
  const allAnomalies = [];

  for (const [category, records] of Object.entries(recordsByCategory)) {
    if (records.length < 3) continue;

    const co2Values = records.map((r) => r.co2);
    const mean = co2Values.reduce((a, b) => a + b, 0) / co2Values.length;
    const stdDev = calculateStdDev(co2Values);

    for (const record of records) {
      const zScore = stdDev === 0 ? 0 : (record.co2 - mean) / stdDev;
      if (Math.abs(zScore) > 1.8) {
        allAnomalies.push({
          ...record,
          category,
          zScore: round(zScore, 2),
          categoryMean: round(mean),
          severity: Math.abs(zScore) > 3 ? 'critical' : Math.abs(zScore) > 2.5 ? 'high' : 'medium',
          direction: record.co2 > mean ? 'spike' : 'drop',
        });
      }
    }
  }

  return allAnomalies;
}

// ─── HOTSPOT DETECTION ────────────────────────────────
function detectHotspots(emissionData) {
  // Group by category
  const byCat = {};
  const byDept = {};
  const byScope = {};

  for (const r of emissionData) {
    const cat = r.category || 'unknown';
    const dept = r.departmentName || 'Unassigned';
    const scope = r.scope || 'unknown';

    if (!byCat[cat]) byCat[cat] = { total: 0, count: 0, records: [] };
    byCat[cat].total += r.co2Equivalent || 0;
    byCat[cat].count++;
    byCat[cat].records.push(r);

    if (!byDept[dept]) byDept[dept] = { total: 0, count: 0 };
    byDept[dept].total += r.co2Equivalent || 0;
    byDept[dept].count++;

    if (!byScope[scope]) byScope[scope] = { total: 0, count: 0 };
    byScope[scope].total += r.co2Equivalent || 0;
    byScope[scope].count++;
  }

  const totalEmissions = emissionData.reduce((s, r) => s + (r.co2Equivalent || 0), 0);

  // Category hotspots
  const categoryHotspots = Object.entries(byCat)
    .map(([name, data]) => ({
      name,
      totalCO2e: round(data.total),
      percentage: round((data.total / totalEmissions) * 100, 1),
      recordCount: data.count,
      avgPerRecord: round(data.total / data.count),
      isHotspot: (data.total / totalEmissions) > 0.25,
      intensity: data.total / totalEmissions > 0.4 ? 'critical' :
                 data.total / totalEmissions > 0.25 ? 'high' :
                 data.total / totalEmissions > 0.15 ? 'medium' : 'low',
    }))
    .sort((a, b) => b.totalCO2e - a.totalCO2e);

  // Department hotspots
  const departmentHotspots = Object.entries(byDept)
    .map(([name, data]) => ({
      name,
      totalCO2e: round(data.total),
      percentage: round((data.total / totalEmissions) * 100, 1),
      recordCount: data.count,
      isHotspot: (data.total / totalEmissions) > 0.3,
    }))
    .sort((a, b) => b.totalCO2e - a.totalCO2e);

  // Scope breakdown
  const scopeBreakdown = Object.entries(byScope)
    .map(([name, data]) => ({
      name,
      totalCO2e: round(data.total),
      percentage: round((data.total / totalEmissions) * 100, 1),
    }))
    .sort((a, b) => b.totalCO2e - a.totalCO2e);

  return {
    totalEmissions: round(totalEmissions),
    categoryHotspots,
    departmentHotspots,
    scopeBreakdown,
    topHotspot: categoryHotspots[0] || null,
  };
}

// ─── AI RECOMMENDATIONS ──────────────────────────────
function generateRecommendations(emissionData, forecast, anomalies, hotspots) {
  const recommendations = [];
  let priority = 1;

  // 1. Hotspot-based recommendations
  if (hotspots?.categoryHotspots) {
    for (const hs of hotspots.categoryHotspots.filter((h) => h.isHotspot)) {
      recommendations.push({
        id: priority,
        priority: priority++,
        category: 'hotspot',
        severity: hs.intensity,
        title: `Reduce ${formatCategory(hs.name)} emissions`,
        description: `${formatCategory(hs.name)} accounts for ${hs.percentage}% of your total emissions (${hs.totalCO2e} kgCO2e). ` +
          getReductionStrategy(hs.name),
        potentialReduction: round(hs.totalCO2e * 0.15),
        icon: 'local_fire_department',
        actionItems: getActionItems(hs.name),
      });
    }
  }

  // 2. Trend-based recommendations
  if (forecast?.statistics) {
    const { trend, monthlyGrowthRate } = forecast.statistics;
    if (trend === 'increasing' && monthlyGrowthRate > 2) {
      recommendations.push({
        id: priority,
        priority: priority++,
        category: 'trend',
        severity: monthlyGrowthRate > 5 ? 'critical' : 'high',
        title: 'Emissions are rising significantly',
        description: `Your emissions are growing at ${monthlyGrowthRate}% per month. ` +
          'Immediate intervention is recommended to reverse this trend. Consider energy audits and efficiency upgrades.',
        potentialReduction: null,
        icon: 'trending_up',
        actionItems: [
          'Conduct an energy efficiency audit',
          'Set monthly reduction targets',
          'Implement real-time monitoring for high-emission activities',
        ],
      });
    } else if (trend === 'decreasing') {
      recommendations.push({
        id: priority,
        priority: priority++,
        category: 'trend',
        severity: 'low',
        title: 'Good progress — emissions declining',
        description: `Emissions are decreasing at ${Math.abs(monthlyGrowthRate)}% per month. ` +
          'Continue current practices and look for further optimization.',
        potentialReduction: null,
        icon: 'trending_down',
        actionItems: [
          'Document current successful strategies',
          'Share best practices across departments',
          'Set more ambitious reduction targets',
        ],
      });
    }
  }

  // 3. Anomaly-based recommendations
  if (anomalies?.anomalies?.length > 0) {
    const criticalAnomalies = anomalies.anomalies.filter((a) => a.severity === 'critical' || a.severity === 'high');
    if (criticalAnomalies.length > 0) {
      recommendations.push({
        id: priority,
        priority: priority++,
        category: 'anomaly',
        severity: 'high',
        title: `${criticalAnomalies.length} critical emission anomalies detected`,
        description: 'Unusual spikes or drops in emissions have been detected. ' +
          'These may indicate equipment malfunction, data entry errors, or operational changes that need investigation.',
        potentialReduction: null,
        icon: 'warning',
        actionItems: [
          'Review flagged records for data entry errors',
          'Check equipment maintenance logs for the anomaly periods',
          'Verify meter readings and billing statements',
        ],
      });
    }
  }

  // 4. Scope-based recommendations
  if (hotspots?.scopeBreakdown) {
    const scope1 = hotspots.scopeBreakdown.find((s) => s.name === 'scope_1');
    const scope2 = hotspots.scopeBreakdown.find((s) => s.name === 'scope_2');
    const scope3 = hotspots.scopeBreakdown.find((s) => s.name === 'scope_3');

    if (scope2 && scope2.percentage > 40) {
      recommendations.push({
        id: priority,
        priority: priority++,
        category: 'scope',
        severity: 'medium',
        title: 'High Scope 2 (indirect) emissions',
        description: `Scope 2 emissions represent ${scope2.percentage}% of total. ` +
          'Consider renewable energy procurement, on-site solar, or green power purchase agreements.',
        potentialReduction: round(scope2.totalCO2e * 0.2),
        icon: 'bolt',
        actionItems: [
          'Evaluate on-site solar or wind installation',
          'Explore green energy tariffs from utility providers',
          'Invest in energy-efficient equipment (LED, HVAC upgrades)',
        ],
      });
    }

    if (scope1 && scope1.percentage > 30) {
      recommendations.push({
        id: priority,
        priority: priority++,
        category: 'scope',
        severity: 'medium',
        title: 'Significant Scope 1 (direct) emissions',
        description: `Scope 1 emissions represent ${scope1.percentage}% of total. ` +
          'Focus on fuel switching, fleet electrification, and process efficiency.',
        potentialReduction: round(scope1.totalCO2e * 0.15),
        icon: 'local_gas_station',
        actionItems: [
          'Switch to lower-carbon fuels where possible',
          'Electrify company fleet vehicles',
          'Optimize heating and cooling systems',
          'Regular maintenance of combustion equipment',
        ],
      });
    }

    if (scope3 && scope3.percentage > 20) {
      recommendations.push({
        id: priority,
        priority: priority++,
        category: 'scope',
        severity: 'low',
        title: 'Supply chain (Scope 3) emissions to watch',
        description: `Scope 3 emissions represent ${scope3.percentage}% of total. ` +
          'Engage suppliers on their carbon footprint and consider waste reduction programs.',
        potentialReduction: round(scope3.totalCO2e * 0.1),
        icon: 'local_shipping',
        actionItems: [
          'Map your supply chain emission sources',
          'Engage key suppliers on carbon reduction',
          'Implement waste reduction and recycling programs',
          'Consider local sourcing to reduce transport emissions',
        ],
      });
    }
  }

  // 5. General best-practice recommendations
  if (emissionData.length > 0) {
    recommendations.push({
      id: priority,
      priority: priority++,
      category: 'general',
      severity: 'info',
      title: 'Set science-based reduction targets',
      description: 'Align your emission reduction goals with the Paris Agreement. ' +
        'Aim for at least 4.2% annual reduction to be on a 1.5°C pathway.',
      potentialReduction: null,
      icon: 'science',
      actionItems: [
        'Define a base year for target-setting',
        'Set short-term (2030) and long-term (2050) targets',
        'Report progress publicly for accountability',
      ],
    });
  }

  return recommendations;
}

// ─── SUSTAINABILITY INSIGHTS (NLP-style) ──────────────
function generateInsights(emissionData, forecast, anomalies, hotspots) {
  const insights = [];

  const totalCO2e = emissionData.reduce((s, r) => s + (r.co2Equivalent || 0), 0);
  const totalTonnes = totalCO2e / 1000;

  // Carbon footprint context
  insights.push({
    type: 'overview',
    icon: 'eco',
    title: 'Carbon Footprint Summary',
    text: `Your total recorded emissions are ${round(totalTonnes, 2)} tonnes CO₂e across ${emissionData.length} records. ` +
      equivalentComparison(totalTonnes),
  });

  // Forecast insight
  if (forecast?.forecasts?.length > 0) {
    const lastForecast = forecast.forecasts[forecast.forecasts.length - 1];
    const trend = forecast.statistics?.trend;
    insights.push({
      type: 'forecast',
      icon: 'auto_graph',
      title: 'Emission Trajectory',
      text: `Based on current trends, emissions are projected to be ${round(lastForecast.predicted)} kgCO₂e/month ` +
        `in ${forecast.forecasts.length} months. The overall trend is ${trend}. ` +
        (trend === 'increasing' ? 'Consider accelerating reduction measures.' : 
         trend === 'decreasing' ? 'Your reduction efforts are showing results.' : 
         'Emissions are relatively stable.'),
    });
  }

  // Anomaly insight
  if (anomalies?.anomalies?.length > 0) {
    const critCount = anomalies.anomalies.filter((a) => a.severity === 'critical').length;
    const highCount = anomalies.anomalies.filter((a) => a.severity === 'high').length;
    insights.push({
      type: 'anomaly',
      icon: 'notification_important',
      title: 'Anomaly Overview',
      text: `${anomalies.anomalies.length} anomalies detected in your data` +
        (critCount > 0 ? ` (${critCount} critical, ${highCount} high severity)` : '') +
        '. These unusual patterns may indicate operational issues or data quality problems that warrant investigation.',
    });
  }

  // Hotspot insight
  if (hotspots?.topHotspot) {
    const top = hotspots.topHotspot;
    insights.push({
      type: 'hotspot',
      icon: 'whatshot',
      title: 'Biggest Emission Source',
      text: `${formatCategory(top.name)} is your largest emission source at ${top.percentage}% of total emissions. ` +
        `Targeting this category for a 15% reduction could save approximately ${round(top.totalCO2e * 0.15)} kgCO₂e.`,
    });
  }

  // Pakistan context
  insights.push({
    type: 'context',
    icon: 'public',
    title: 'Pakistan Climate Context',
    text: 'Pakistan contributes less than 1% of global emissions but ranks among the top 10 most climate-vulnerable nations. ' +
      'Corporate emission tracking and reduction is critical for national climate resilience and ESG compliance.',
  });

  return insights;
}

// ─── HELPER FUNCTIONS ─────────────────────────────────

function calculateStdDev(values) {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function round(val, decimals = 2) {
  return Math.round(val * 10 ** decimals) / 10 ** decimals;
}

function addMonths(monthStr, n) {
  const [y, m] = monthStr.split('-').map(Number);
  const date = new Date(y, m - 1 + n, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatCategory(cat) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateAnomalyExplanation(record, mean, zScore, direction, severity) {
  const cat = formatCategory(record.category || 'unknown');
  const pct = round(Math.abs(((record.co2 - mean) / mean) * 100), 0);
  if (direction === 'spike') {
    return `${cat} emission of ${round(record.co2)} kgCO₂e is ${pct}% above average — ` +
      `a ${severity} severity ${direction}. Check for unusual activity or meter errors in ${record.month || 'this period'}.`;
  }
  return `${cat} emission of ${round(record.co2)} kgCO₂e is ${pct}% below average — ` +
    `a ${severity} severity ${direction}. Verify if operations were reduced or data is missing for ${record.month || 'this period'}.`;
}

function equivalentComparison(tonnes) {
  if (tonnes < 1) return 'That is equivalent to about ' + round(tonnes * 2481, 0) + ' km driven by car.';
  if (tonnes < 10) return `That is equivalent to about ${round(tonnes * 2.3, 0)} return flights from Karachi to Islamabad.`;
  if (tonnes < 100) return `That is equivalent to powering ${round(tonnes / 4.6, 0)} Pakistani homes for a year.`;
  return `That is equivalent to about ${round(tonnes / 4.6, 0)} Pakistani households' annual electricity consumption.`;
}

function getReductionStrategy(category) {
  const strategies = {
    electricity: 'Switch to LED lighting, install smart meters, optimize HVAC schedules, and consider renewable energy sources.',
    natural_gas: 'Improve boiler efficiency, insulate heating systems, and explore electrification of gas-powered processes.',
    fuel: 'Optimize fleet routes, transition to electric or hybrid vehicles, and implement anti-idling policies.',
    water: 'Fix leaks, install low-flow fixtures, recycle process water, and implement rainwater harvesting.',
    waste: 'Implement zero-waste targets, improve recycling programs, and compost organic waste.',
    transport: 'Encourage carpooling, provide cycling infrastructure, promote remote work, and optimize logistics routes.',
    refrigerants: 'Switch to low-GWP refrigerants, improve leak detection, and maintain equipment regularly.',
    other: 'Conduct a detailed audit to identify specific reduction opportunities.',
  };
  return strategies[category] || strategies.other;
}

function getActionItems(category) {
  const actions = {
    electricity: [
      'Conduct an energy audit of all facilities',
      'Replace lighting with LED fixtures',
      'Install programmable thermostats and smart building controls',
      'Evaluate rooftop solar potential',
    ],
    natural_gas: [
      'Schedule boiler efficiency inspections',
      'Improve insulation in heated areas',
      'Explore heat pump alternatives',
    ],
    fuel: [
      'Track fleet fuel consumption per vehicle',
      'Optimize delivery routes with routing software',
      'Evaluate electric vehicle feasibility',
    ],
    water: [
      'Conduct a water audit to identify leaks',
      'Install water-efficient fixtures',
      'Implement water recycling in processes',
    ],
    waste: [
      'Conduct a waste audit by type',
      'Set up separated recycling stations',
      'Partner with waste-to-energy providers',
    ],
    transport: [
      'Survey employee commute patterns',
      'Offer remote work days to reduce commuting',
      'Install bicycle parking and shower facilities',
    ],
    refrigerants: [
      'Inventory all refrigerant types and quantities',
      'Schedule regular leak detection inspections',
      'Plan transition to low-GWP alternatives (R-32, R-290)',
    ],
    other: [
      'Identify and categorize "other" emission sources',
      'Set up measurement and tracking systems',
    ],
  };
  return actions[category] || actions.other;
}

module.exports = {
  forecastEmissions,
  detectAnomalies,
  detectCategoryAnomalies,
  detectHotspots,
  generateRecommendations,
  generateInsights,
  linearRegression,
  movingAverage,
};
