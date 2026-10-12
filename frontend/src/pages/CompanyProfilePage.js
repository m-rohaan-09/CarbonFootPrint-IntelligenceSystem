import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

export default function CompanyProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({});
  const [members, setMembers] = useState([]);
  const [memberForm, setMemberForm] = useState({ email: '', role: 'employee' });
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');
  const canManageCompany = user?.role === 'admin' || user?.role === 'company_rep';
  const canManageMembers = canManageCompany;

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      const { data } = await API.get('/company/mine');
      setCompany(data.company);
      setForm(data.company);
      await fetchMembers(data.company.id);
    } catch (err) {
      if (err.response?.data?.needsOnboarding) {
        navigate('/onboarding');
        return;
      }
      setError('Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (companyId) => {
    try {
      const { data } = await API.get(`/company-members/company/${companyId}`);
      setMembers(data.members || []);
    } catch (err) {
      console.error('Failed to load company members', err);
      setMembers([]);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await API.put(`/company/${company.id}`, form);
      setCompany(data.company);
      setEditing(false);
      setSuccess('Company profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!company || !memberForm.email.trim()) {
      setMemberError('Please enter an email address');
      return;
    }

    setMemberLoading(true);
    setMemberError('');
    setMemberSuccess('');

    try {
      await API.post(`/company-members/company/${company.id}/invite`, memberForm);
      setMemberForm({ email: '', role: 'employee' });
      setMemberSuccess('Member added to company');
      await fetchMembers(company.id);
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setMemberLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!company) return;

    try {
      await API.delete(`/company-members/company/${company.id}/member/${userId}`);
      setMemberSuccess('Member removed');
      await fetchMembers(company.id);
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant/40">domain_disabled</span>
        <p className="text-on-surface-variant mt-4">No company profile found.</p>
        <button onClick={() => navigate('/onboarding')}
          className="mt-4 px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          Start Onboarding
        </button>
      </div>
    );
  }

  const InfoRow = ({ label, value, name, type = 'text' }) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-outline-variant/10 last:border-0">
      <span className="text-sm text-on-surface-variant w-40 mb-1 sm:mb-0">{label}</span>
      {editing ? (
        <input name={name} type={type} value={form[name] || ''} onChange={handleChange}
          className="flex-1 px-3 py-2 rounded-lg border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm" />
      ) : (
        <span className="flex-1 text-sm font-medium text-on-surface">{value || '—'}</span>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Company Profile</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage your company information and settings</p>
        </div>
        <div className="flex gap-3">
          {canManageCompany && (editing ? (
            <>
              <button onClick={() => { setEditing(false); setForm(company); }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit Profile
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error-container/30 border border-error/20 rounded-xl text-error text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>{error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-primary-container/20 border border-primary/20 rounded-xl text-primary text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>{success}
        </div>
      )}

      {/* Company Info Card */}
      <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">business</span>
          General Information
        </h2>
        <InfoRow label="Company Name" value={company.name} name="name" />
        <InfoRow label="Industry" value={company.industry} name="industry" />
        <InfoRow label="Registration #" value={company.registrationNumber} name="registrationNumber" />
        <InfoRow label="Website" value={company.website} name="website" />
        <InfoRow label="Employees" value={company.employeeCount} name="employeeCount" type="number" />
        <InfoRow label="Baseline Year" value={company.baselineYear} name="baselineYear" type="number" />
      </div>

      {/* Location Card */}
      <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
          Location
        </h2>
        <InfoRow label="Country" value={company.country} name="country" />
        <InfoRow label="Province" value={company.province} name="province" />
        <InfoRow label="City" value={company.city} name="city" />
        <InfoRow label="Address" value={company.address} name="address" />
      </div>

      {/* Departments Card */}
      <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">account_tree</span>
            Departments ({company.departments?.length || 0})
          </h2>
          {canManageCompany && (
            <button onClick={() => navigate('/departments')}
              className="text-sm text-primary font-medium hover:underline">
              Manage Departments
            </button>
          )}
        </div>
        {company.departments?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {company.departments.map((dept) => (
              <span key={dept.id} className="px-3 py-1.5 bg-primary-container/20 text-on-surface rounded-lg text-sm font-medium">
                {dept.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">No departments added yet.</p>
        )}
      </div>

      {/* Company Members */}
      <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">group</span>
            Company Members
          </h2>
          <span className="text-xs text-on-surface-variant">{members.length} total</span>
        </div>

        {canManageMembers ? (
          <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 mb-5">
            <input
              type="email"
              value={memberForm.email}
              onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
              placeholder="Add user by email"
              className="px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface text-sm"
            />
            <select
              value={memberForm.role}
              onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface text-sm"
            >
              <option value="employee">Employee</option>
              <option value="auditor">Auditor</option>
            </select>
            <button
              type="submit"
              disabled={memberLoading}
              className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {memberLoading ? 'Adding...' : 'Add Member'}
            </button>
          </form>
        ) : (
          <p className="text-sm text-on-surface-variant mb-5">Read-only access: only company representatives and admins can manage company membership.</p>
        )}

        {memberError && (
          <div className="mb-4 p-3 bg-error-container/30 border border-error/20 rounded-xl text-error text-sm">
            {memberError}
          </div>
        )}
        {memberSuccess && (
          <div className="mb-4 p-3 bg-primary-container/20 border border-primary/20 rounded-xl text-primary text-sm">
            {memberSuccess}
          </div>
        )}

        {members.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No members assigned to this company yet.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const isCurrentUser = member.userId === user?.id;

              return (
                <div key={member.id} className="flex items-center justify-between gap-3 p-3 border border-outline-variant/30 rounded-xl bg-surface-container-low">
                  <div>
                    <p className="font-medium text-on-surface">
                      {member.user?.firstName} {member.user?.lastName}
                    </p>
                    <p className="text-xs text-on-surface-variant">{member.user?.email}</p>
                    <p className="text-xs text-primary mt-1 uppercase tracking-wide">{member.role}</p>
                  </div>
                  {canManageMembers && !isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.userId)}
                      className="px-3 py-2 text-xs font-medium text-error border border-error/30 rounded-lg hover:bg-error-container/20 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => navigate('/data-collection')}
          className="flex items-center gap-3 p-4 bg-surface-bright rounded-xl border border-outline-variant/30 hover:border-primary/40 hover:shadow-sm transition-all text-left">
          <span className="material-symbols-outlined text-primary text-[24px]">edit_note</span>
          <div>
            <p className="text-sm font-semibold text-on-surface">Enter Data</p>
            <p className="text-xs text-on-surface-variant">Manual emission entry</p>
          </div>
        </button>
        <button onClick={() => navigate('/bill-upload')}
          className="flex items-center gap-3 p-4 bg-surface-bright rounded-xl border border-outline-variant/30 hover:border-primary/40 hover:shadow-sm transition-all text-left">
          <span className="material-symbols-outlined text-primary text-[24px]">upload_file</span>
          <div>
            <p className="text-sm font-semibold text-on-surface">Upload Bills</p>
            <p className="text-xs text-on-surface-variant">CSV, Excel, or PDF</p>
          </div>
        </button>
        <button onClick={() => navigate('/baseline')}
          className="flex items-center gap-3 p-4 bg-surface-bright rounded-xl border border-outline-variant/30 hover:border-primary/40 hover:shadow-sm transition-all text-left">
          <span className="material-symbols-outlined text-primary text-[24px]">analytics</span>
          <div>
            <p className="text-sm font-semibold text-on-surface">View Baseline</p>
            <p className="text-xs text-on-surface-variant">Emission calculations</p>
          </div>
        </button>
      </div>
    </div>
  );
}
