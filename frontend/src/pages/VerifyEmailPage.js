import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmailPage() {
  const { verifyEmail, resendVerificationOtp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) navigate('/signup', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter the 6-digit OTP'); return; }
    setError(''); setLoading(true);
    try {
      await verifyEmail(email, code);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true); setError(''); setSuccess('');
    try {
      await resendVerificationOtp(email);
      setSuccess('A new OTP has been sent to your email.');
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const otpComplete = otp.every(Boolean);

  return (
    <div className="min-h-screen flex flex-col md:flex-row antialiased">
      {/* Left branding */}
      <div className="md:w-1/2 bg-primary flex flex-col justify-center items-center p-8 lg:p-12 relative overflow-hidden">
        <div className="absolute inset-0 border-r border-white/10 pointer-events-none" />
        <div className="max-w-md z-10 text-center md:text-left animate-fade-up">
          <h1 className="text-5xl font-bold text-white tracking-tight">CFIS</h1>
          <h2 className="text-2xl font-semibold text-white/90 mt-2 mb-6">Verify Your Email</h2>
          <p className="text-base text-white/70 mb-10">
            One last step — enter the 6-digit code we sent to your inbox to activate your account.
          </p>
          <div className="flex flex-col gap-4">
            {[
              { icon: 'mark_email_read', label: 'Check your inbox' },
              { icon: 'timer', label: 'Code valid for 15 min' },
              { icon: 'lock', label: 'Secure verification' },
              { icon: 'refresh', label: 'Resend if needed' },
            ].map((f) => (
              <div key={f.label} className="card-hover bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3 border border-white/20">
                <span className="material-symbols-outlined text-white text-2xl">{f.icon}</span>
                <span className="text-sm text-white/80 font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right OTP form */}
      <div className="md:w-1/2 bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-up">
          <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/30 p-8 lg:p-10">
            <div className="mb-8">
              <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">mark_email_read</span>
              </div>
              <h2 className="text-3xl font-bold text-primary mb-2">Check Your Email</h2>
              <p className="text-sm text-on-surface-variant">
                We sent a 6-digit verification code to
              </p>
              <p className="text-sm font-semibold text-on-surface mt-1 break-all">{email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-3">
                  Enter verification code
                </label>
                <div className="flex gap-2 justify-between" onPaste={handlePaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className={`w-12 h-14 text-center text-xl font-bold rounded-lg border-2 ${
                        digit
                          ? 'border-primary bg-secondary-container text-on-secondary-container'
                          : 'border-outline-variant bg-surface-bright text-on-surface'
                      } focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none transition-all`}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-error text-xs">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={!otpComplete || loading}
                className={`w-full py-3 rounded-lg font-semibold text-base transition-all ${
                  otpComplete && !loading
                    ? 'bg-primary text-white hover:bg-primary/90 cursor-pointer shadow-glow'
                    : 'bg-primary/40 text-white/60 opacity-50 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Verifying...
                  </span>
                ) : 'Verify Email'}
              </button>

              <div className="text-center">
                <p className="text-sm text-on-surface-variant">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resendLoading}
                    className={`text-xs font-medium ${
                      resendCooldown > 0 || resendLoading
                        ? 'text-outline cursor-not-allowed'
                        : 'text-primary hover:underline cursor-pointer'
                    }`}
                  >
                    {resendLoading
                      ? 'Sending...'
                      : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend OTP'}
                  </button>
                </p>
              </div>
            </form>

            <div className="mt-6 text-center">
              <Link to="/signup" className="text-xs font-medium text-on-surface-variant hover:text-primary hover:underline">
                ← Back to Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
