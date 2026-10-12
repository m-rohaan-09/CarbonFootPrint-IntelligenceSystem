import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

export default function ProfilePage() {
  const { user, fetchUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({
    firstName: user?.firstName || user?.first_name || '',
    lastName: user?.lastName || user?.last_name || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roleLabel = { admin: 'Administrator', company_rep: 'Company Representative', employee: 'Employee', auditor: 'Auditor' };

  const handleProfile = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      await API.put('/profile', form);
      await fetchUser();
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { setError('Passwords do not match'); return; }
    setError(''); setMessage(''); setLoading(true);
    try {
      await API.put('/profile/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setMessage('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-on-surface">Profile</h1>
        <p className="text-sm text-on-surface-variant mt-1">Manage your account settings</p>
      </div>

      {/* User card */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 mb-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-xl font-bold shrink-0">
          {(user?.firstName || user?.first_name)?.[0]}{(user?.lastName || user?.last_name)?.[0]}
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold text-on-surface">{user?.firstName || user?.first_name} {user?.lastName || user?.last_name}</h2>
          <p className="text-sm text-on-surface-variant">{user?.email}</p>
          <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{roleLabel[user?.role]}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-outline-variant/20">
        {['profile', 'password'].map((t) => (
          <button key={t} onClick={() => { setTab(t); setMessage(''); setError(''); }}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              tab === t ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}>
            {t === 'profile' ? 'Edit Profile' : 'Change Password'}
          </button>
        ))}
      </div>

      {message && <div className="mb-4 p-3 rounded-lg bg-secondary-container/30 text-sm text-primary">{message}</div>}
      {error && <div className="mb-4 p-3 rounded-lg bg-error-container/30 text-sm text-error">{error}</div>}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 shadow-sm max-w-lg">
        {tab === 'profile' ? (
          <form onSubmit={handleProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">First Name</label>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required
                  className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Last Name</label>
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required
                  className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Department</label>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none" />
            </div>
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-semibold text-sm hover:bg-primary hover:text-on-primary transition-colors">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Current Password</label>
              <input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">New Password</label>
              <input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={8}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Confirm New Password</label>
              <input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required
                className={`w-full px-3 py-2.5 rounded-lg border ${pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? 'border-error' : 'border-outline-variant'} bg-surface-bright text-on-surface text-sm focus:border-primary outline-none`} />
            </div>
            <button type="submit" disabled={loading || pwForm.newPassword.length < 8 || pwForm.newPassword !== pwForm.confirmPassword}
              className="px-6 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-semibold text-sm hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-50">
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
