import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend,
} from 'recharts';

const SEVERITY_COLORS = {
  critical: { bg: 'bg-error-container/60', text: 'text-on-error-container', border: 'border-error/40', dot: '#E85D4A' },
  high: { bg: 'bg-orange-100/80', text: 'text-orange-700', border: 'border-orange-400/40', dot: '#fb923c' },
  medium: { bg: 'bg-yellow-100/80', text: 'text-yellow-700', border: 'border-yellow-400/40', dot: '#facc15' },
  low: { bg: 'bg-secondary-container/70', text: 'text-on-secondary-container', border: 'border-secondary/40', dot: '#E8A838' },
};

export default function AnomalyAlertsPage() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [threshold, setThreshold] = useState(2.0);
  const [filterSeverity, setFilterSeverity] = useState('');

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      const { data } = await API.get('/company/mine');
      setCompany(data.company);
    } catch {
      setError('Please complete company onboarding first');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (company) runDetection();
  }, [company]);

  const runDetection = async () => {
    if (!company) return;
    setAnalyzing(true);
    setError('');
    try {
      const { data: res } = await API.get('/ai/anomalies', {
        params: { companyId: company.id, threshold },
      });
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Anomaly detection failed');
      setData(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredAnomalies = data?.overall?.anomalies?.filter(
    (a) => !filterSeverity || a.severity === filterSeverity
  ) || [];

  // Chart data: scatter plot of all records showing anomalies
  const scatterData = data?.overall?.anomalies?.map((a, i) => ({
    index: i,
    co2: a.co2,
    zScore: a.zScore,
    severity: a.severity,
    category: a.category?.replace(/_/g, ' '),
    month: a.month,
  })) || [];

  // Severity counts for bar chart
  const severityCounts = data?.overall?.anomalies ? [
    { name: 'Critical', count: data.overall.anomalies.filter((a) => a.severity === 'critical').length, fill: '#E85D4A' },
    { name: 'High', count: data.overall.anomalies.filter((a) => a.severity === 'high').length, fill: '#fb923c' },
    { name: 'Medium', count: data.overall.anomalies.filter((a) => a.severity === 'medium').length, fill: '#facc15' },
    { name: 'Low', count: data.overall.anomalies.filter((a) => a.severity === 'low').length, fill: '#E8A838' },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-error">notification_important</span>
            Anomaly Detection & Alerts
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Statistical anomaly detection using Z-Score and IQR methods
          </p>
        </div>
        <button
          onClick={runDetection}
          disabled={analyzing}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          {analyzing ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Analyzing...</>
          ) : (
            <><span className="material-symbols-outlined text-[18px]">search</span> Detect Anomalies</>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error-container/30 border border-error/20 rounded-xl text-error text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
        </div>
      )}

      {/* Controls */}
      <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
              Sensitivity (Z-Score Threshold)
            </label>
            <select
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
            >
              <option value={1.5}>High Sensitivity (1.5σ)</option>
              <option value={2.0}>Normal (2.0σ)</option>
              <option value={2.5}>Low Sensitivity (2.5σ)</option>
              <option value={3.0}>Very Low (3.0σ)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Filter by Severity</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Records', value: data.overall.statistics.totalRecords, icon: 'database', color: 'text-on-surface' },
              { label: 'Anomalies Found', value: data.overall.statistics.anomalyCount, icon: 'warning',
                color: data.overall.statistics.anomalyCount > 0 ? 'text-error' : 'text-primary' },
              { label: 'Anomaly Rate', value: `${data.overall.statistics.anomalyRate}%`, icon: 'percent', color: 'text-on-surface' },
              { label: 'Avg Emission', value: `${data.overall.statistics.mean} kg`, icon: 'co2', color: 'text-primary' },
            ].map((card) => (
              <div key={card.label} className="card-hover bg-surface-bright rounded-xl border border-outline-variant/30 p-4 shadow-sm cursor-default">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">{card.icon}</span>
                  <span className="text-xs font-medium text-on-surface-variant">{card.label}</span>
                </div>
                <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scatter: Z-Score vs CO2 */}
            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">scatter_plot</span>
                Anomaly Distribution
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D5D3CC" />
                    <XAxis dataKey="co2" name="CO₂e" tick={{ fontSize: 11 }} label={{ value: 'CO₂e (kg)', position: 'bottom', fontSize: 11 }} />
                    <YAxis dataKey="zScore" name="Z-Score" tick={{ fontSize: 11 }} label={{ value: 'Z-Score', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #D5D3CC', background: '#FFFFFF', color: '#1A1A2E', fontSize: '13px' }}
                      formatter={(value, name) => [typeof value === 'number' ? value.toFixed(2) : value, name]}
                    />
                    <Scatter data={scatterData} name="Anomalies">
                      {scatterData.map((entry, i) => (
                        <Cell key={i} fill={SEVERITY_COLORS[entry.severity]?.dot || '#8888A0'} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar: Severity breakdown */}
            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">bar_chart</span>
                Severity Breakdown
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityCounts} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D5D3CC" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #D5D3CC', background: '#FFFFFF', color: '#1A1A2E', fontSize: '13px' }} />
                    <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]}>
                      {severityCounts.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Statistical Context */}
          <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">query_stats</span>
              Statistical Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              {[
                { label: 'Mean', value: `${data.overall.statistics.mean} kg` },
                { label: 'Std Dev', value: `${data.overall.statistics.stdDev} kg` },
                { label: 'Q1 (25th)', value: `${data.overall.statistics.q1} kg` },
                { label: 'Q3 (75th)', value: `${data.overall.statistics.q3} kg` },
                { label: 'Lower Fence', value: `${data.overall.statistics.lowerFence} kg` },
                { label: 'Upper Fence', value: `${data.overall.statistics.upperFence} kg` },
              ].map((stat) => (
                <div key={stat.label} className="p-3 bg-surface-container-low rounded-xl">
                  <p className="text-xs text-on-surface-variant">{stat.label}</p>
                  <p className="text-sm font-semibold text-on-surface mt-1">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Anomaly Alerts List */}
          <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 shadow-sm">
            <div className="p-5 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[20px]">report</span>
                Anomaly Alerts ({filteredAnomalies.length})
              </h2>
            </div>

            {filteredAnomalies.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-primary">check_circle</span>
                <p className="text-on-surface-variant mt-3 font-medium">No anomalies detected</p>
                <p className="text-on-surface-variant text-xs mt-1">All emission records are within expected ranges</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {filteredAnomalies.map((anomaly, i) => {
                  const sev = SEVERITY_COLORS[anomaly.severity] || SEVERITY_COLORS.low;
                  return (
                    <div key={i} className="p-4 sm:p-5 hover:bg-surface-container-low/30 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Severity badge */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${sev.bg} ${sev.text} border ${sev.border} self-start shrink-0`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {anomaly.severity === 'critical' ? 'crisis_alert' : anomaly.severity === 'high' ? 'warning' : 'info'}
                          </span>
                          {anomaly.severity.toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Category + direction */}
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-on-surface capitalize">
                              {anomaly.category?.replace(/_/g, ' ')}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              anomaly.direction === 'spike' ? 'bg-error-container/60 text-error' : 'bg-secondary-container/70 text-on-secondary-container'
                            }`}>
                              {anomaly.direction === 'spike' ? '↑ Spike' : '↓ Drop'} ({anomaly.deviation}%)
                            </span>
                          </div>

                          {/* Explanation */}
                          <p className="text-sm text-on-surface-variant leading-relaxed">{anomaly.explanation}</p>

                          {/* Meta */}
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                              {anomaly.month || anomaly.periodStart}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">co2</span>
                              {anomaly.co2?.toFixed(2)} kgCO₂e
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">functions</span>
                              Z-Score: {anomaly.zScore}
                            </span>
                            {anomaly.departmentName && (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">business</span>
                                {anomaly.departmentName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!data && !error && !analyzing && (
        <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">search</span>
          <p className="text-on-surface-variant mt-3">Add emission data in Module 2, then run anomaly detection here</p>
        </div>
      )}
    </div>
  );
}
