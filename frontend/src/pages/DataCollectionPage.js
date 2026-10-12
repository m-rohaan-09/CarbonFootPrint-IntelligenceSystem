import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { value: 'electricity', label: 'Electricity', icon: 'bolt', unit: 'kWh' },
  { value: 'natural_gas', label: 'Natural Gas', icon: 'local_fire_department', unit: 'm³' },
  { value: 'fuel', label: 'Fuel (Diesel/Petrol)', icon: 'local_gas_station', unit: 'litres' },
  { value: 'water', label: 'Water', icon: 'water_drop', unit: 'm³' },
  { value: 'waste', label: 'Waste', icon: 'delete', unit: 'kg' },
  { value: 'transport', label: 'Transport', icon: 'directions_car', unit: 'km' },
  { value: 'refrigerants', label: 'Refrigerants', icon: 'ac_unit', unit: 'kg' },
  { value: 'other', label: 'Other', icon: 'more_horiz', unit: 'unit' },
];

export default function DataCollectionPage() {
  const [company, setCompany] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState('');

  const [form, setForm] = useState({
    category: '', subCategory: '', quantity: '', unit: '',
    periodStart: '', periodEnd: '', departmentId: '', notes: '',
  });

  useEffect(() => {
    fetchCompany();
  }, []);

  useEffect(() => {
    if (company) fetchRecords();
  }, [company, page, filterCategory]);

  const fetchCompany = async () => {
    try {
      const { data } = await API.get('/company/mine');
      setCompany(data.company);
      setDepartments(data.company.departments || []);
    } catch {
      setError('Please complete company onboarding first');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      const params = { companyId: company.id, page, limit: 10 };
      if (filterCategory) params.category = filterCategory;
      const { data } = await API.get('/emissions', { params });
      setRecords(data.records);
      setPagination(data.pagination);
    } catch {
      // silent
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category') {
      const cat = CATEGORIES.find((c) => c.value === value);
      setForm({ ...form, category: value, unit: cat?.unit || '' });
    } else {
      setForm({ ...form, [name]: value });
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.quantity || !form.periodStart || !form.periodEnd) {
      setError('Category, quantity, and period are required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await API.post('/emissions/manual', {
        companyId: company.id,
        departmentId: form.departmentId ? parseInt(form.departmentId) : null,
        category: form.category,
        subCategory: form.subCategory,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        notes: form.notes,
      });
      setSuccess('Emission data recorded successfully');
      setForm({ category: '', subCategory: '', quantity: '', unit: '', periodStart: '', periodEnd: '', departmentId: '', notes: '' });
      fetchRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this emission record?')) return;
    try {
      await API.delete(`/emissions/${id}`);
      fetchRecords();
      setSuccess('Record deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete record');
    }
  };

  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'company_rep' || user?.role === 'auditor';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Data Collection</h1>
        <p className="text-sm text-on-surface-variant mt-1">Manually enter emission data for your company</p>
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

      {/* Entry Form */}
      {canEdit ? (
        <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-on-surface mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">edit_note</span>
            New Emission Entry
          </h2>

          {/* Category Quick Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {CATEGORIES.map((cat) => (
              <button key={cat.value} type="button"
                onClick={() => {
                  setForm({ ...form, category: cat.value, unit: cat.unit });
                  setError('');
                }}
                className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-all border ${
                  form.category === cat.value
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:border-primary/40'
                }`}>
                <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                <span className="truncate">{cat.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Sub-category</label>
                <input name="subCategory" value={form.subCategory} onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
                  placeholder="e.g. Office AC, Generator" />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Quantity *</label>
                <div className="flex">
                  <input name="quantity" type="number" step="any" min="0" value={form.quantity} onChange={handleChange}
                    className="flex-1 px-3 py-2.5 rounded-l-xl border border-r-0 border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
                    placeholder="0.00" />
                  <span className="px-4 py-2.5 rounded-r-xl border border-outline-variant/50 bg-surface-container-high text-on-surface-variant text-sm font-medium">
                    {form.unit || 'unit'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Department</label>
                <select name="departmentId" value={form.departmentId} onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm">
                  <option value="">No specific department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Period Start *</label>
              <input name="periodStart" type="date" value={form.periodStart} onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Period End *</label>
              <input name="periodEnd" type="date" value={form.periodEnd} onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Notes</label>
              <input name="notes" value={form.notes} onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
                placeholder="Optional notes" />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {submitting ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent" /> Saving...</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">save</span> Save Entry</>
              )}
            </button>
          </div>
        </form>
      </div>
      ) : (
      <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-on-surface mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">edit_note</span>
          New Emission Entry
        </h2>
        <p className="text-sm text-on-surface-variant">You do not have permission to add or edit emission data. Contact your company representative or admin.</p>
      </div>
      )}

      {/* Records Table */}
      <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 shadow-sm">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/20">
          <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">table_chart</span>
            Emission Records ({pagination.total || 0})
          </h2>
          <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-outline-variant/50 bg-surface text-sm text-on-surface">
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">inbox</span>
            <p className="text-on-surface-variant mt-3">No emission records yet</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-outline-variant/10">
              {records.map((r) => (
                <div key={r.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-on-surface capitalize">{r.category.replace('_', ' ')}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-container/30 text-primary font-medium">{r.scope?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-on-surface-variant">
                    <span>{r.quantity} {r.unit}</span>
                    <span className="font-semibold text-on-surface">{r.co2Equivalent?.toFixed(2)} kgCO2e</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-on-surface-variant">
                    <span>{r.periodStart} → {r.periodEnd}</span>
                    {canEdit && (
                      <button onClick={() => handleDelete(r.id)} className="text-error">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/20 text-left text-on-surface-variant">
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Scope</th>
                    <th className="px-4 py-3 font-medium">Quantity</th>
                    <th className="px-4 py-3 font-medium">CO2e (kg)</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Dept</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-container-low/50">
                      <td className="px-6 py-3 font-medium text-on-surface capitalize">{r.category.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-primary-container/30 text-primary text-xs font-medium">
                          {r.scope?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-on-surface">{r.quantity} {r.unit}</td>
                      <td className="px-4 py-3 font-semibold text-on-surface">{r.co2Equivalent?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-on-surface-variant text-xs">{r.periodStart}<br />{r.periodEnd}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs capitalize">
                          {r.source?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant text-xs">{r.department?.name || '—'}</td>
                      <td className="px-4 py-3">
                        {canEdit && (
                          <button onClick={() => handleDelete(r.id)} className="text-error hover:text-error/80">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="p-4 flex items-center justify-center gap-2 border-t border-outline-variant/20">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30">
                  Previous
                </button>
                <span className="text-sm text-on-surface-variant">Page {page} of {pagination.pages}</span>
                <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30">
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
