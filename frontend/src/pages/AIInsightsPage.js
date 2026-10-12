import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const SEVERITY_STYLES = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-green-100 text-green-700 border-green-300',
  info: 'bg-blue-100 text-blue-700 border-blue-300',
};

const INSIGHT_ICONS = {
  overview: 'eco',
  forecast: 'auto_graph',
  anomaly: 'notification_important',
  hotspot: 'whatshot',
  context: 'public',
};

const PIE_COLORS = ['#0D5C63', '#E8A838', '#6C5CE7', '#E85D4A', '#00B894', '#0A4A50', '#D4952E', '#5A4BD6'];

export default function AIInsightsPage() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [hotspotData, setHotspotData] = useState(null);

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
    if (company) runAnalysis();
  }, [company]);

  const runAnalysis = async () => {
    if (!company) return;
    setAnalyzing(true);
    setError('');
    try {
      const [insightsRes, hotspotsRes] = await Promise.all([
        API.get('/ai/insights', { params: { companyId: company.id } }),
        API.get('/ai/hotspots', { params: { companyId: company.id } }),
      ]);
      setData(insightsRes.data);
      setHotspotData(hotspotsRes.data.hotspots);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed');
      setData(null);
      setHotspotData(null);
    } finally {
      setAnalyzing(false);
    }
  };

  // Prepare pie chart data for hotspots
  const categoryPieData = hotspotData?.categoryHotspots?.map((h) => ({
    name: h.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: h.totalCO2e,
    percentage: h.percentage,
  })) || [];

  const scopePieData = hotspotData?.scopeBreakdown?.map((s) => ({
    name: s.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: s.totalCO2e,
    percentage: s.percentage,
  })) || [];

  const deptBarData = hotspotData?.departmentHotspots?.map((d) => ({
    name: d.name,
    co2: d.totalCO2e,
    percentage: d.percentage,
  })) || [];

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
            <span className="material-symbols-outlined text-primary">lightbulb</span>
            AI Insights & Recommendations
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Smart analysis with hotspot detection, actionable recommendations & sustainability insights
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          {analyzing ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Analyzing...</>
          ) : (
            <><span className="material-symbols-outlined text-[18px]">psychology</span> Run Analysis</>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error-container/30 border border-error/20 rounded-xl text-error text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
        </div>
      )}

      {data && (
        <>
          {/* Quick Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card-hover bg-surface-bright rounded-xl border border-outline-variant/30 p-4 shadow-sm cursor-default">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-[18px]">database</span>
                <span className="text-xs font-medium text-on-surface-variant">Records Analyzed</span>
              </div>
              <p className="text-lg font-bold text-on-surface">{data.meta.totalRecords}</p>
            </div>
            <div className="card-hover bg-surface-bright rounded-xl border border-outline-variant/30 p-4 shadow-sm cursor-default">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-[18px]">whatshot</span>
                <span className="text-xs font-medium text-on-surface-variant">Top Hotspot</span>
              </div>
              <p className="text-lg font-bold text-on-surface capitalize">
                {data.hotspotSummary?.topCategory?.replace(/_/g, ' ') || '—'}
              </p>
              <p className="text-xs text-on-surface-variant">{data.hotspotSummary?.topPercentage}% of total</p>
            </div>
            <div className="card-hover bg-surface-bright rounded-xl border border-outline-variant/30 p-4 shadow-sm cursor-default">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>
                <span className="text-xs font-medium text-on-surface-variant">Trend</span>
              </div>
              <p className={`text-lg font-bold capitalize ${
                data.forecast?.trend === 'increasing' ? 'text-error' :
                data.forecast?.trend === 'decreasing' ? 'text-green-600' : 'text-on-surface'
              }`}>
                {data.forecast?.trend || 'N/A'}
              </p>
            </div>
            <div className="card-hover bg-surface-bright rounded-xl border border-outline-variant/30 p-4 shadow-sm cursor-default">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-error text-[18px]">warning</span>
                <span className="text-xs font-medium text-on-surface-variant">Anomalies</span>
              </div>
              <p className={`text-lg font-bold ${data.anomalySummary?.total > 0 ? 'text-error' : 'text-green-600'}`}>
                {data.anomalySummary?.total ?? 0}
              </p>
              {data.anomalySummary?.critical > 0 && (
                <p className="text-xs text-error">{data.anomalySummary.critical} critical</p>
              )}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
              AI-Generated Insights
            </h2>
            <div className="space-y-3">
              {data.insights.map((insight, i) => (
                <div key={i} className="p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/10">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-container/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        {INSIGHT_ICONS[insight.type] || insight.icon || 'info'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-on-surface">{insight.title}</h3>
                      <p className="text-sm text-on-surface-variant leading-relaxed mt-1">{insight.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hotspot Visualization */}
          {hotspotData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Pie */}
              <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
                <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">donut_large</span>
                  Emissions by Category
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                        labelLine={{ strokeWidth: 1 }}
                      >
                        {categoryPieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #D5D3CC', fontSize: '13px' }}
                        formatter={(value) => [`${value.toFixed(2)} kgCO₂e`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Scope Pie */}
              <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
                <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">layers</span>
                  Emissions by Scope
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scopePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                        labelLine={{ strokeWidth: 1 }}
                      >
                        {scopePieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #D5D3CC', fontSize: '13px' }}
                        formatter={(value) => [`${value.toFixed(2)} kgCO₂e`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Department breakdown bar chart */}
          {deptBarData.length > 0 && (
            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">business</span>
                Emissions by Department
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptBarData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D5D3CC" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #D5D3CC', fontSize: '13px' }}
                      formatter={(value) => [`${value.toFixed(2)} kgCO₂e`]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="co2" fill="#6C5CE7" radius={[6, 6, 0, 0]} name="CO₂e (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Hotspot Alerts */}
          {hotspotData?.categoryHotspots?.filter((h) => h.isHotspot).length > 0 && (
            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[20px]">local_fire_department</span>
                Emission Hotspots
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {hotspotData.categoryHotspots.filter((h) => h.isHotspot).map((hs, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${
                    hs.intensity === 'critical' ? 'bg-red-50 border-red-200' :
                    hs.intensity === 'high' ? 'bg-orange-50 border-orange-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold capitalize text-on-surface">
                        {hs.name.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        hs.intensity === 'critical' ? 'bg-red-200 text-red-700' :
                        hs.intensity === 'high' ? 'bg-orange-200 text-orange-700' :
                        'bg-yellow-200 text-yellow-700'
                      }`}>
                        {hs.intensity}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-on-surface">{hs.percentage}%</p>
                    <p className="text-xs text-on-surface-variant mt-1">{hs.totalCO2e} kgCO₂e ({hs.recordCount} records)</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 shadow-sm">
            <div className="p-5 border-b border-outline-variant/20">
              <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">tips_and_updates</span>
                AI Recommendations ({data.recommendations.length})
              </h2>
            </div>
            <div className="divide-y divide-outline-variant/10">
              {data.recommendations.map((rec) => {
                const sev = SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.info;
                return (
                  <div key={rec.id} className="p-4 sm:p-5 hover:bg-surface-container-low/30 transition-colors">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Icon + Priority */}
                      <div className="flex items-start gap-3 sm:w-auto">
                        <div className="w-10 h-10 rounded-xl bg-primary-container/30 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-[20px]">{rec.icon}</span>
                        </div>
                        <div className="sm:hidden">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${sev}`}>
                            {rec.severity}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-on-surface">{rec.title}</h3>
                          <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium border ${sev}`}>
                            {rec.severity}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed">{rec.description}</p>

                        {rec.potentialReduction && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                            <span className="material-symbols-outlined text-[14px]">savings</span>
                            Potential savings: {rec.potentialReduction} kgCO₂e
                          </div>
                        )}

                        {rec.actionItems?.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-on-surface-variant mb-1.5">Action Items:</p>
                            <ul className="space-y-1">
                              {rec.actionItems.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs text-on-surface-variant">
                                  <span className="material-symbols-outlined text-primary text-[14px] mt-0.5 shrink-0">check_circle</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!data && !error && !analyzing && (
        <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">lightbulb</span>
          <p className="text-on-surface-variant mt-3">Add emission data in Module 2, then run AI analysis here</p>
        </div>
      )}
    </div>
  );
}
