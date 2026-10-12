import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await API.post('/auth/forgot-password', { email });
      setMessage(data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await API.post('/auth/verify-otp', { email, otp });
      setResetToken(data.resetToken);
      setMessage('OTP verified! Set your new password.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setError(''); setLoading(true);
    try {
      await API.post('/auth/reset-password', { resetToken, newPassword });
      setMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally { setLoading(false); }
  };

  const stepTitles = ['Enter your email', 'Verify OTP', 'New Password'];

  return (
    <div className="min-h-screen flex flex-col md:flex-row antialiased">
      {/* Left branding */}
      <div className="md:w-1/2 bg-primary flex flex-col justify-center items-center p-8 lg:p-12 relative overflow-hidden">
        <div className="absolute inset-0 border-r border-white/10 pointer-events-none" />
        <div className="max-w-md z-10 text-center md:text-left animate-fade-up">
          <h1 className="text-5xl font-bold text-white tracking-tight">CFIS</h1>
          <h2 className="text-2xl font-semibold text-white/90 mt-2 mb-6">Password Recovery</h2>
          <p className="text-base text-white/70 mb-10">
            We'll send a one-time password (OTP) to your registered email. The code expires in 15 minutes.
          </p>
          {/* Progress */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s ? 'bg-white text-primary' : 'bg-white/20 text-white/60'
                }`}>{s}</div>
                {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-white' : 'bg-white/20'}`} />}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between text-xs text-white/70 mt-2">
            <span>Email</span><span>OTP</span><span>Reset</span>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="md:w-1/2 bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-up">
          <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/30 p-8 lg:p-10">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-primary mb-2">{stepTitles[step - 1]}</h2>
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-2">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none text-sm" />
                </div>
                {error && <p className="text-xs text-error flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span>{error}</p>}
                <button type="submit" disabled={!email || loading}
                  className={`w-full py-3 rounded-lg font-semibold text-base transition-all ${email && !loading ? 'bg-primary text-white hover:bg-primary/90 shadow-glow' : 'bg-primary/40 text-white/60 opacity-50 cursor-not-allowed'}`}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {message && <p className="text-sm text-primary bg-secondary-container/30 p-3 rounded-lg">{message}</p>}
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-2">Enter 6-digit OTP</label>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000" required maxLength={6}
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none text-sm text-center text-2xl tracking-[0.5em] font-bold" />
                  <p className="text-xs text-outline mt-2">Check your email for the OTP. Expires in 15 minutes.</p>
                </div>
                {error && <p className="text-xs text-error flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span>{error}</p>}
                <button type="submit" disabled={otp.length !== 6 || loading}
                  className={`w-full py-3 rounded-lg font-semibold text-base transition-all ${otp.length === 6 && !loading ? 'bg-primary text-white hover:bg-primary/90 shadow-glow' : 'bg-primary/40 text-white/60 opacity-50 cursor-not-allowed'}`}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                {message && <p className="text-sm text-primary bg-secondary-container/30 p-3 rounded-lg">{message}</p>}
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-2">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters" required
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-bright text-on-surface focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-2">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password" required
                    className={`w-full px-4 py-3 rounded-lg border ${confirmPassword && confirmPassword !== newPassword ? 'border-error' : 'border-outline-variant'} bg-surface-bright text-on-surface focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none text-sm`} />
                </div>
                {error && <p className="text-xs text-error flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span>{error}</p>}
                <button type="submit" disabled={newPassword.length < 8 || newPassword !== confirmPassword || loading}
                  className={`w-full py-3 rounded-lg font-semibold text-base transition-all ${newPassword.length >= 8 && newPassword === confirmPassword && !loading ? 'bg-primary text-white hover:bg-primary/90 shadow-glow' : 'bg-primary/40 text-white/60 opacity-50 cursor-not-allowed'}`}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            <div className="mt-8 text-center">
              <Link to="/login" className="text-xs font-medium text-primary hover:underline">
                ← Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
