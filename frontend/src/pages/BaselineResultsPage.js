import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import API from '../utils/api';

const SCOPE_COLORS = { scope_1: '#E85D4A', scope_2: '#0D5C63', scope_3: '#6C5CE7' };
const CATEGORY_COLORS = ['#0D5C63', '#0A4A50', '#E8A838', '#D4952E', '#6C5CE7', '#5A4BD6', '#E85D4A', '#00B894'];

export default function BaselineResultsPage() {
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchCompany(); }, []);

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

  const calculateBaseline = async () => {
    if (!company) return;
    setCalculating(true);
    setError('');
    try {
      const { data } = await API.get('/baseline/calculate', { params: { companyId: company.id } });
      setBaseline(data.baseline);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to calculate baseline');
    } finally {
      setCalculating(false);
    }
  };

  const scopeData = baseline ? Object.entries(baseline.byScope).map(([key, value]) => ({
    name: key.replace('_', ' ').toUpperCase(),
    value,
    color: SCOPE_COLORS[key] || '#999',
  })) : [];

  const categoryData = baseline ? Object.entries(baseline.byCategory).map(([key, value], i) => ({
    name: key.replace('_', ' '),
    value,
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  })) : [];

  const trendData = baseline ? Object.entries(baseline.monthlyTrend).map(([month, value]) => ({
    month,
    co2e: value,
  })) : [];

  const departmentData = baseline ? Object.entries(baseline.byDepartment).map(([key, value], i) => ({
    name: key,
    value,
    fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  })) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Baseline Emissions</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {company?.name} · Baseline Year: {company?.baselineYear || 'Not set'}
          </p>
        </div>
        <button onClick={calculateBaseline} disabled={calculating}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 self-start sm:self-auto">
          {calculating ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Calculating...</>
          ) : (
            <><span className="material-symbols-outlined text-[18px]">calculate</span> Calculate Baseline</>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-error-container/30 border border-error/20 rounded-xl text-error text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
          {error.includes('No emission data') && (
            <button onClick={() => navigate('/data-collection')} className="ml-auto text-primary underline text-xs">Add Data</button>
          )}
        </div>
      )}

      {!baseline && !calculating && (
        <div className="text-center py-16 bg-surface-bright rounded-2xl border border-outline-variant/30">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/30">analytics</span>
          <p className="text-on-surface-variant mt-4">Click "Calculate Baseline" to generate your emission report</p>
          <p className="text-xs text-on-surface-variant mt-1">Make sure you've entered emission data first</p>
        </div>
      )}

      {baseline && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-container/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">cloud</span>
                </div>
                <span className="text-sm text-on-surface-variant">Total CO2e</span>
              </div>
              <p className="text-2xl font-bold text-on-surface">{baseline.totalCO2eTonnes}</p>
              <p className="text-xs text-on-surface-variant">tonnes CO2e</p>
            </div>

            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-700 text-[20px]">local_fire_department</span>
                </div>
                <span className="text-sm text-on-surface-variant">Scope 1</span>
              </div>
              <p className="text-2xl font-bold text-on-surface">{((baseline.byScope.scope_1 || 0) / 1000).toFixed(2)}</p>
              <p className="text-xs text-on-surface-variant">tonnes (Direct)</p>
            </div>

            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-700 text-[20px]">bolt</span>
                </div>
                <span className="text-sm text-on-surface-variant">Scope 2</span>
              </div>
              <p className="text-2xl font-bold text-on-surface">{((baseline.byScope.scope_2 || 0) / 1000).toFixed(2)}</p>
              <p className="text-xs text-on-surface-variant">tonnes (Indirect Energy)</p>
            </div>

            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-700 text-[20px]">public</span>
                </div>
                <span className="text-sm text-on-surface-variant">Scope 3</span>
              </div>
              <p className="text-2xl font-bold text-on-surface">{((baseline.byScope.scope_3 || 0) / 1000).toFixed(2)}</p>
              <p className="text-xs text-on-surface-variant">tonnes (Value Chain)</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scope Breakdown Pie */}
            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-on-surface mb-4">Emissions by Scope</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={scopeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {scopeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `${val.toFixed(2)} kgCO2e`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown Bar */}
            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-on-surface mb-4">Emissions by Category</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D5D3CC" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90}
                    tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)} />
                  <Tooltip formatter={(val) => `${val.toFixed(2)} kgCO2e`} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trend */}
          {trendData.length > 1 && (
            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-on-surface mb-4">Monthly Emission Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D5D3CC" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val) => `${val.toFixed(2)} kgCO2e`} />
                  <Bar dataKey="co2e" fill="#0D5C63" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Department breakdown */}
          {departmentData.length > 1 && (
            <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-on-surface mb-4">Emissions by Department</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={departmentData} cx="50%" cy="50%" outerRadius={100}
                    paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {departmentData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `${val.toFixed(2)} kgCO2e`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Data Source breakdown */}
          <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-on-surface mb-4">Data Sources</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(baseline.bySource).map(([source, value]) => (
                <div key={source} className="p-3 bg-surface-container-low rounded-xl text-center">
                  <p className="text-xs text-on-surface-variant capitalize mb-1">{source.replace('_', ' ')}</p>
                  <p className="text-lg font-bold text-on-surface">{(value / 1000).toFixed(2)}</p>
                  <p className="text-xs text-on-surface-variant">tonnes</p>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="text-center text-xs text-on-surface-variant py-4">
            Based on {baseline.totalRecords} records · Calculated at {new Date(baseline.calculatedAt).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
