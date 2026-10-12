import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'employee' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const isValid =
    form.firstName && form.lastName && form.email && form.password.length >= 8 && form.password === form.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await signup({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, role: form.role });
      navigate('/verify-email', { state: { email: form.email }, replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'employee', label: 'Employee' },
    { value: 'company_rep', label: 'Company Representative' },
    { value: 'auditor', label: 'Auditor' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row antialiased">
      {/* Left branding */}
      <div className="md:w-1/2 bg-primary flex flex-col justify-center items-center p-8 lg:p-12 relative overflow-hidden">
        <div className="absolute inset-0 border-r border-white/10 pointer-events-none" />
        <div className="max-w-md z-10 text-center md:text-left animate-fade-up">
          <h1 className="text-5xl font-bold text-white tracking-tight">CFIS</h1>
          <h2 className="text-2xl font-semibold text-white/90 mt-2 mb-6">Join the Platform</h2>
          <p className="text-base text-white/70 mb-10">
            Create your account to start tracking and reducing your organization's carbon footprint with AI-powered insights.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: 'monitoring', label: 'Real-time Tracking' },
              { icon: 'psychology', label: 'AI Forecasting' },
              { icon: 'warning', label: 'Anomaly Alerts' },
              { icon: 'description', label: 'Auto Reports' },
            ].map((f) => (
              <div key={f.label} className="card-hover bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3 border border-white/20">
                <span className="material-symbols-outlined text-white text-2xl">{f.icon}</span>
                <span className="text-sm text-white/80 font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right signup form */}
      <div className="md:w-1/2 bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-up">
          <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/30 p-8 lg:p-10">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-primary mb-2">Create Account</h2>
              <p className="text-sm text-on-surface-variant">Fill in your details to get started.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">First Name</label>
                  <input value={form.firstName} onChange={set('firstName')} required
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Last Name</label>
                  <input value={form.lastName} onChange={set('lastName')} required
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Email Address</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="name@company.com" required
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Role</label>
                <select value={form.role} onChange={set('role')}
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none text-sm">
                  {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')}
                    placeholder="Min 8 characters" required
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none text-sm pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-4 flex items-center text-outline hover:text-on-surface">
                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Confirm Password</label>
                <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')}
                  placeholder="Re-enter password" required
                  className={`w-full px-4 py-3 rounded-lg border ${
                    form.confirmPassword && form.confirmPassword !== form.password ? 'border-error' : 'border-outline-variant'
                  } bg-surface-bright text-on-surface focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none text-sm`} />
                {form.confirmPassword && form.confirmPassword !== form.password && (
                  <p className="text-xs text-error mt-1">Passwords do not match</p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-error text-xs">
                  <span className="material-symbols-outlined text-sm">error</span>{error}
                </div>
              )}

              <button type="submit" disabled={!isValid || loading}
                className={`w-full py-3 rounded-lg font-semibold text-base transition-all ${
                  isValid && !loading
                    ? 'bg-primary text-white hover:bg-primary/90 cursor-pointer shadow-glow'
                    : 'bg-primary/40 text-white/60 opacity-50 cursor-not-allowed'
                }`}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Creating Account...
                  </span>
                ) : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-on-surface-variant">
                Already have an account?{' '}
                <Link to="/login" className="text-xs font-medium text-primary hover:underline">Login</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
