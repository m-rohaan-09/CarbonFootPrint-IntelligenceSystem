import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);

  const isValid = email.length > 0 && password.length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || 'Login failed');
      if (data?.attemptsRemaining !== undefined) setAttemptsRemaining(data.attemptsRemaining);
      if (data?.lockedUntil) setLockedUntil(data.lockedUntil);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row antialiased">
      {/* Left branding */}
      <div className="md:w-1/2 bg-primary flex flex-col justify-center items-center p-8 lg:p-12 relative overflow-hidden">
        <div className="absolute inset-0 border-r border-white/10 pointer-events-none" />
        <div className="max-w-md z-10 text-center md:text-left animate-fade-up">
          <h1 className="text-5xl font-bold text-white tracking-tight">CFIS</h1>
          <h2 className="text-2xl font-semibold text-white/90 mt-2 mb-6">
            Carbon Footprint Intelligence System
          </h2>
          <p className="text-base text-white/70 mb-10">
            AI-powered carbon emission tracking for smarter sustainability decisions.
          </p>
          <div className="w-full h-64 rounded-xl overflow-hidden shadow-glow border border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-white text-6xl mb-2">eco</span>
              <p className="text-sm text-white/80 font-medium">Track. Forecast. Reduce.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="md:w-1/2 bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-up">
          <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/30 p-8 lg:p-10">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-primary mb-2">Welcome Back</h2>
              <p className="text-sm text-on-surface-variant">
                Login to continue monitoring your organization's emissions.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-on-surface-variant mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none transition-all text-sm"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-on-surface-variant mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={`w-full px-4 py-3 rounded-lg border ${
                      error ? 'border-error bg-error-container/10' : 'border-outline-variant bg-surface-bright'
                    } text-on-surface focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none transition-all text-sm pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-4 flex items-center text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
                <div className="flex justify-between items-start mt-2">
                  <p className="text-[11px] text-outline">Minimum 8 characters</p>
                  <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                    Forgot Password?
                  </Link>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-error text-xs">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>
                    {error}
                    {attemptsRemaining !== null && attemptsRemaining > 0 && ` (${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining)`}
                  </span>
                </div>
              )}

              {/* Remember me */}
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-secondary-container border-outline-variant rounded"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-on-surface-variant">
                  Remember me
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!isValid || loading}
                className={`w-full py-3 rounded-lg font-semibold text-base transition-all ${
                  isValid && !loading
                    ? 'bg-primary text-white hover:bg-primary/90 cursor-pointer shadow-glow'
                    : 'bg-primary/40 text-white/60 opacity-50 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary-container border-t-transparent" />
                    Logging in...
                  </span>
                ) : 'Login'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-on-surface-variant">
                Don't have an account?{' '}
                <Link to="/signup" className="text-xs font-medium text-primary hover:underline">
                  Create Account
                </Link>
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-outline-variant/20 flex items-center justify-center gap-2 text-outline">
              <span className="material-symbols-outlined text-lg">lock</span>
              <p className="text-[11px]">Protected with secure authentication and role-based access.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
