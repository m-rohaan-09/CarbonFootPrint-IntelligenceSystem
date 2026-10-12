import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({ name: '', description: '', location: '' });

  useEffect(() => { fetchDepartments(); }, []);

  const fetchDepartments = async () => {
    try {
      const { data } = await API.get('/departments/mine');
      setDepartments(data.departments);
      setCompanyId(data.companyId);
    } catch (err) {
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm({ name: '', description: '', location: '' });
    setEditing(null);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Department name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await API.put(`/departments/${editing}`, form);
        setSuccess('Department updated');
      } else {
        await API.post('/departments', { ...form, companyId });
        setSuccess('Department created');
      }
      resetForm();
      fetchDepartments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (dept) => {
    setForm({ name: dept.name, description: dept.description || '', location: dept.location || '' });
    setEditing(dept.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department? This action cannot be undone.')) return;
    try {
      await API.delete(`/departments/${id}`);
      setSuccess('Department deleted');
      fetchDepartments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'company_rep';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Departments</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage departments and divisions</p>
        </div>
        {canManage && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors self-start sm:self-auto">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Department
          </button>
        )}
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

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-on-surface mb-4">
            {editing ? 'Edit Department' : 'New Department'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Name *</label>
                <input name="name" value={form.name} onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
                  placeholder="e.g. Operations" />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Description</label>
                <input name="description" value={form.description} onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
                  placeholder="Brief description" />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Location</label>
                <input name="location" value={form.location} onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
                  placeholder="Building / floor" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="px-5 py-2 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm}
                className="px-5 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Department List */}
      {departments.length === 0 ? (
        <div className="text-center py-16 bg-surface-bright rounded-2xl border border-outline-variant/30">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">account_tree</span>
          <p className="text-on-surface-variant mt-3">No departments added yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-5 shadow-sm hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary-container/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[20px]">domain</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-on-surface">{dept.name}</h3>
                    {dept.location && (
                      <p className="text-xs text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        {dept.location}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  dept.isActive ? 'bg-primary-container/30 text-primary' : 'bg-error-container/30 text-error'
                }`}>
                  {dept.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {dept.description && (
                <p className="text-xs text-on-surface-variant mb-3 line-clamp-2">{dept.description}</p>
              )}
              {canManage ? (
                <div className="flex gap-2 pt-3 border-t border-outline-variant/10">
                  <button onClick={() => handleEdit(dept)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-primary hover:bg-primary-container/20 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(dept.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-error hover:bg-error-container/20 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    Delete
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-outline-variant/10">
                  <p className="text-xs text-on-surface-variant">You do not have permission to edit departments.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
