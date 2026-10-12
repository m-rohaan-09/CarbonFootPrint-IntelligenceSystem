import React, { useState, useEffect, useCallback } from 'react';
import API from '../utils/api';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'natural_gas', label: 'Natural Gas' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'water', label: 'Water' },
  { value: 'waste', label: 'Waste' },
  { value: 'transport', label: 'Transport' },
  { value: 'refrigerants', label: 'Refrigerants' },
  { value: 'other', label: 'Other' },
];

export default function ForecastingPage() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forecasting, setForecasting] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [category, setCategory] = useState('');
  const [months, setMonths] = useState(6);

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

  const runForecast = useCallback(async () => {
    if (!company) return;
    setForecasting(true);
    setError('');
    try {
      const params = { companyId: company.id, months };
      if (category) params.category = category;
      const { data: res } = await API.get('/ai/forecast', { params });
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Forecast failed');
      setData(null);
    } finally {
      setForecasting(false);
    }
  }, [company, months, category]);

  useEffect(() => {
    if (company) runForecast();
  }, [company, runForecast]);

  // Merge historical + forecast for chart
  const chartData = data ? [
    ...data.forecast.historical.map((h) => ({
      month: h.month,
      actual: h.actual,
      smoothed: h.smoothed,
      type: 'historical',
    })),
    ...data.forecast.forecasts.map((f) => ({
      month: f.month,
      predicted: f.predicted,
      upperBound: f.upperBound,
      lowerBound: f.lowerBound,
      type: 'forecast',
    })),
  ] : [];

  // Category breakdown for pie-like bar chart
  const categoryData = data?.categoryBreakdown
    ? Object.entries(data.categoryBreakdown).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        co2: Math.round(value * 100) / 100,
      })).sort((a, b) => b.co2 - a.co2)
    : [];

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
            <span className="material-symbols-outlined text-primary">auto_graph</span>
            AI Emission Forecasting
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            ML-powered predictions using linear regression, exponential smoothing & ensemble methods
          </p>
        </div>
        <button
          onClick={runForecast}
          disabled={forecasting}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          {forecasting ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Running...</>
          ) : (
            <><span className="material-symbols-outlined text-[18px]">psychology</span> Run Forecast</>
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
            <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Category Filter</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Forecast Horizon</label>
            <select
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
              <option value={24}>24 Months</option>
            </select>
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Trend', value: data.forecast.statistics.trend, icon: 'trending_up',
                color: data.forecast.statistics.trend === 'increasing' ? 'text-error' : data.forecast.statistics.trend === 'decreasing' ? 'text-primary' : 'text-on-surface' },
              { label: 'Monthly Growth', value: `${data.forecast.statistics.monthlyGrowthRate}%`, icon: 'speed', color: 'text-on-surface' },
              { label: 'Model Fit (R²)', value: data.forecast.statistics.r2, icon: 'analytics', color: 'text-primary' },
              { label: 'Avg Emission', value: `${data.forecast.statistics.avgEmission} kg`, icon: 'co2', color: 'text-on-surface' },
            ].map((card) => (
              <div key={card.label} className="card-hover bg-surface-bright rounded-xl border border-outline-variant/30 p-4 shadow-sm cursor-default">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">{card.icon}</span>
                  <span className="text-xs font-medium text-on-surface-variant">{card.label}</span>
                </div>
                <p className={`text-lg font-bold capitalize ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Forecast Chart */}
          <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">show_chart</span>
              Emission Forecast
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D5C63" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#0D5C63" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E8A838" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#E8A838" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D5D3CC" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #D5D3CC', background: '#FFFFFF', color: '#1A1A2E', fontSize: '13px' }}
                    formatter={(value) => [`${value?.toFixed(2)} kgCO₂e`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine
                    x={data.forecast.historical[data.forecast.historical.length - 1]?.month}
                    stroke="#8888A0" strokeDasharray="3 3" label={{ value: 'Now', fontSize: 11, fill: '#4A4A6A' }}
                  />
                  <Area type="monotone" dataKey="actual" stroke="#0D5C63" fill="url(#colorActual)"
                    strokeWidth={2} name="Actual" connectNulls={false} />
                  <Line type="monotone" dataKey="smoothed" stroke="#0A4A50" strokeWidth={1.5}
                    strokeDasharray="4 4" dot={false} name="Smoothed" connectNulls={false} />
                  <Area type="monotone" dataKey="predicted" stroke="#E8A838" fill="url(#colorPredicted)"
                    strokeWidth={2} strokeDasharray="6 3" name="Predicted" connectNulls={false} />
                  <Line type="monotone" dataKey="upperBound" stroke="#8888A0" strokeWidth={1}
                    strokeDasharray="2 2" dot={false} name="Upper Bound" connectNulls={false} />
                  <Line type="monotone" dataKey="lowerBound" stroke="#8888A0" strokeWidth={1}
                    strokeDasharray="2 2" dot={false} name="Lower Bound" connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Forecast Table + Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Forecast Table */}
            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 shadow-sm">
              <div className="p-5 border-b border-outline-variant/20">
                <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
                  Monthly Predictions
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/20 text-left text-on-surface-variant">
                      <th className="px-5 py-3 font-medium">Month</th>
                      <th className="px-4 py-3 font-medium">Predicted</th>
                      <th className="px-4 py-3 font-medium">Range</th>
                      <th className="px-4 py-3 font-medium">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {data.forecast.forecasts.map((f) => (
                      <tr key={f.month} className="hover:bg-surface-container-low/50">
                        <td className="px-5 py-3 font-medium text-on-surface">{f.month}</td>
                        <td className="px-4 py-3 text-on-surface">{f.predicted.toFixed(1)} kg</td>
                        <td className="px-4 py-3 text-xs text-on-surface-variant">
                          {f.lowerBound.toFixed(0)} – {f.upperBound.toFixed(0)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-surface-container-high rounded-full max-w-[60px]">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.max(0, f.confidence * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-on-surface-variant">{(f.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 shadow-sm">
              <div className="p-5 border-b border-outline-variant/20">
                <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">donut_large</span>
                  Emission by Category
                </h2>
              </div>
              <div className="p-5">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D5D3CC" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #D5D3CC', background: '#FFFFFF', color: '#1A1A2E', fontSize: '13px' }}
                        formatter={(value) => [`${value.toFixed(2)} kgCO₂e`]}
                      />
                      <Bar dataKey="co2" fill="#0D5C63" radius={[0, 6, 6, 0]} name="CO₂e (kg)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!data && !error && !forecasting && (
        <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">auto_graph</span>
          <p className="text-on-surface-variant mt-3">Add emission data in Module 2, then run forecasting here</p>
        </div>
      )}
    </div>
  );
}
