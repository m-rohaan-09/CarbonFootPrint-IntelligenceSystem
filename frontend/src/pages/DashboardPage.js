import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [summary, setSummary] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [recentEmissions, setRecentEmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const compRes = await API.get('/company/mine');
      const comp = compRes.data?.company;
      setCompany(comp);

      if (comp?.id) {
        const [sumRes, deptRes, emRes] = await Promise.all([
          API.get(`/baseline/summary?companyId=${comp.id}`).catch(() => ({ data: null })),
          API.get('/departments/mine').catch(() => ({ data: { departments: [] } })),
          API.get(`/emissions?companyId=${comp.id}&limit=5`).catch(() => ({ data: { records: [] } })),
        ]);
        setSummary(sumRes.data?.summary || null);
        setDepartments(deptRes.data?.departments || []);
        setRecentEmissions(emRes.data?.records || []);
      }
    } catch {
      // Company might not exist yet
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = {
    admin: 'Administrator',
    company_rep: 'Company Representative',
    employee: 'Employee',
    auditor: 'Auditor',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasData = summary && summary.totalRecords > 0;

  const quickLinks = [
    { icon: 'edit_note', label: 'Data Entry', desc: 'Add emission records', path: '/data-collection', roles: ['company_rep', 'admin', 'auditor'] },
    { icon: 'upload_file', label: 'Bill Upload', desc: 'Upload bills & CSV', path: '/bill-upload', roles: ['company_rep', 'admin'] },
    { icon: 'auto_graph', label: 'AI Forecast', desc: 'Predict future emissions', path: '/ai/forecasting', roles: ['company_rep', 'admin', 'employee', 'auditor'] },
    { icon: 'lightbulb', label: 'AI Insights', desc: 'Get recommendations', path: '/ai/insights', roles: ['company_rep', 'admin', 'employee', 'auditor'] },
    { icon: 'analytics', label: 'Baseline', desc: 'View emission baseline', path: '/baseline', roles: ['company_rep', 'admin', 'employee', 'auditor'] },
    { icon: 'notification_important', label: 'Anomalies', desc: 'Detect outliers', path: '/ai/anomalies', roles: ['company_rep', 'admin', 'employee', 'auditor'] },
    { icon: 'group', label: 'Users', desc: 'Manage accounts', path: '/admin/users', roles: ['admin'] },
    { icon: 'history', label: 'Audit Logs', desc: 'View activity logs', path: '/admin/audit-logs', roles: ['admin'] },
  ].filter((l) => l.roles.includes(user?.role));

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {roleLabel[user?.role]} {company ? `· ${company.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-lowest px-4 py-2 rounded-xl border border-outline-variant/20">
          <span className="material-symbols-outlined text-primary text-[16px]">calendar_today</span>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-primary rounded-xl p-5 shadow-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/70">Total Emissions</span>
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">cloud</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{hasData ? `${summary.totalCO2eTonnes} t` : '—'}</p>
          <p className="text-xs text-white/60 mt-1">{hasData ? `${summary.totalRecords} records` : 'No data yet'}</p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/20 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-on-surface-variant">Departments</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[18px]">account_tree</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-on-surface">{departments.length}</p>
          <p className="text-xs text-on-surface-variant mt-1">Active divisions</p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/20 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-on-surface-variant">Categories</span>
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-[18px]">category</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-on-surface">{hasData ? summary.categories?.length || 0 : '—'}</p>
          <p className="text-xs text-on-surface-variant mt-1">Emission types tracked</p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/20 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-on-surface-variant">Scopes</span>
            <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-[18px]">layers</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-on-surface">{hasData ? summary.scopes?.length || 0 : '—'}</p>
          <p className="text-xs text-on-surface-variant mt-1">GHG Protocol scopes</p>
        </div>
      </div>

      {/* Company + Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Info Card */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">business</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">{company?.name || 'No Company'}</h3>
              <p className="text-xs text-on-surface-variant">{company?.industry || 'Set up your company'}</p>
            </div>
          </div>
          {company ? (
            <div className="space-y-3">
              {[
                { icon: 'location_on', label: 'Location', value: company.city ? `${company.city}, ${company.country}` : company.country || '—' },
                { icon: 'calendar_month', label: 'Baseline Year', value: company.baselineYear || 'Not set' },
                { icon: 'group', label: 'Employees', value: company.employeeCount ? company.employeeCount.toLocaleString() : '—' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-[16px]">{item.icon}</span>
                  <span className="text-xs text-on-surface-variant w-20">{item.label}</span>
                  <span className="text-sm text-on-surface font-medium">{item.value}</span>
                </div>
              ))}
              <Link to="/company/profile" className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                View Profile <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          ) : (
            <Link to="/company/onboarding" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors w-full justify-center">
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              Set Up Company
            </Link>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">apps</span>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="card-hover group flex flex-col items-center gap-2 p-4 rounded-xl border border-outline-variant/15 hover:border-primary/30 bg-surface-bright transition-all text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/8 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-primary text-xl">{link.icon}</span>
                </div>
                <span className="text-xs font-semibold text-on-surface">{link.label}</span>
                <span className="text-[10px] text-on-surface-variant leading-tight">{link.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity + Account Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Emissions */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm">
          <div className="p-5 border-b border-outline-variant/15 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">history</span>
              Recent Emissions
            </h3>
            <Link to="/data-collection" className="text-xs text-primary font-medium hover:underline">View All</Link>
          </div>
          {recentEmissions.length > 0 ? (
            <div className="divide-y divide-outline-variant/10">
              {recentEmissions.map((em, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-surface-bright/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[16px]">co2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface capitalize">{em.category?.replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {em.scope?.replace('_', ' ')} · {em.department?.name || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-on-surface">{em.co2Equivalent?.toFixed(1)} kg</p>
                    <p className="text-[11px] text-on-surface-variant">{em.periodStart?.substring(0, 7)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">inbox</span>
              <p className="text-sm text-on-surface-variant mt-2">No emission records yet</p>
              <Link to="/data-collection" className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                Add your first record <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          )}
        </div>

        {/* Account Info */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm">
          <div className="p-5 border-b border-outline-variant/15">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">person</span>
              Your Account
            </h3>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-lg font-bold shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div>
                <p className="text-base font-semibold text-on-surface">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-on-surface-variant">{user?.email}</p>
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full">
                  {roleLabel[user?.role]}
                </span>
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-outline-variant/15">
              {[
                { icon: 'verified', label: 'Email Verified', value: user?.isEmailVerified ? 'Yes' : 'No', color: user?.isEmailVerified ? 'text-primary' : 'text-error' },
                { icon: 'toggle_on', label: 'Account Status', value: user?.isActive ? 'Active' : 'Inactive', color: user?.isActive ? 'text-primary' : 'text-error' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-[16px]">{item.icon}</span>
                    <span className="text-xs text-on-surface-variant">{item.label}</span>
                  </div>
                  <span className={`text-sm font-medium ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
            <Link to="/profile" className="mt-4 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              Edit Profile <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Getting Started - only show if no data */}
      {!hasData && company && (
        <div className="bg-primary/5 rounded-xl border border-primary/15 p-6">
          <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">rocket_launch</span>
            Getting Started
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '1', icon: 'account_tree', title: 'Add Departments', desc: 'Create your organizational structure', path: '/departments', done: departments.length > 0 },
              { step: '2', icon: 'edit_note', title: 'Enter Emission Data', desc: 'Add records manually or upload CSV files', path: '/data-collection', done: false },
              { step: '3', icon: 'analytics', title: 'Calculate Baseline', desc: 'Generate your emission baseline report', path: '/baseline', done: false },
            ].map((s) => (
              <Link key={s.step} to={s.path} className="card-hover flex items-start gap-3 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/15 hover:border-primary/25 transition-all">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.done ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                  {s.done ? <span className="material-symbols-outlined text-[14px]">check</span> : s.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">{s.title}</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
