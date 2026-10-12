import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', roles: ['admin', 'company_rep', 'employee', 'auditor'] },
  { label: 'Company', path: '/company/profile', icon: 'business', roles: ['company_rep', 'admin'] },
  { label: 'Departments', path: '/departments', icon: 'account_tree', roles: ['company_rep', 'admin'] },
  { label: 'Data Entry', path: '/data-collection', icon: 'edit_note', roles: ['company_rep', 'admin', 'auditor'] },
  { label: 'Bill Upload', path: '/bill-upload', icon: 'upload_file', roles: ['company_rep', 'admin'] },
  { label: 'Baseline', path: '/baseline', icon: 'analytics', roles: ['company_rep', 'admin', 'employee', 'auditor'] },
  { label: 'AI Forecast', path: '/ai/forecasting', icon: 'auto_graph', roles: ['company_rep', 'admin', 'employee', 'auditor'] },
  { label: 'Anomaly Alerts', path: '/ai/anomalies', icon: 'notification_important', roles: ['company_rep', 'admin', 'employee', 'auditor'] },
  { label: 'AI Insights', path: '/ai/insights', icon: 'lightbulb', roles: ['company_rep', 'admin', 'employee', 'auditor'] },
  { label: 'Users', path: '/admin/users', icon: 'group', roles: ['admin'] },
  { label: 'Companies', path: '/admin/companies', icon: 'business', roles: ['admin'] },
  { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'history', roles: ['admin'] },
  { label: 'Profile', path: '/profile', icon: 'person', roles: ['admin', 'company_rep', 'employee', 'auditor'] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel = {
    admin: 'Administrator',
    company_rep: 'Company Representative',
    employee: 'Employee',
    auditor: 'Auditor',
  };

  return (
    <div className="min-h-screen bg-background surface-sheen flex">
      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-primary backdrop-blur flex flex-col shadow-card transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-white/15">
          <h1 className="text-2xl font-bold text-white">CFIS</h1>
          <p className="text-xs text-white/60 mt-1">Carbon Footprint Intelligence</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-white text-primary shadow-glow'
                    : 'text-white/75 hover:bg-white/10 hover:text-white hover:translate-x-1'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/15">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-white/60 truncate">{roleLabel[user?.role]}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:-translate-y-0.5 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-outline-variant/20 px-4 lg:px-8 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-primary hover:text-primary/80"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">schedule</span>
            Session: 15 min timeout
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
