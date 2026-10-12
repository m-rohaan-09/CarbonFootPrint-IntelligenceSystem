import React, { useState, useEffect, useCallback } from 'react';
import API from '../utils/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'employee', phone: '', department: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await API.get('/users', { params });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => {
    setEditUser(null);
    setForm({ firstName: '', lastName: '', email: '', password: '', role: 'employee', phone: '', department: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ firstName: u.firstName || u.first_name, lastName: u.lastName || u.last_name, email: u.email, password: '', role: u.role, phone: u.phone || '', department: u.department || '' });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(''); setFormLoading(true);
    try {
      if (editUser) {
        const updates = { ...form };
        delete updates.password;
        delete updates.email;
        await API.put(`/users/${editUser.id}`, updates);
      } else {
        await API.post('/users', form);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user ${u.email}?`)) return;
    try {
      await API.delete(`/users/${u.id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await API.put(`/users/${u.id}`, { isActive: !u.is_active && !u.isActive });
      fetchUsers();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleUnlock = async (u) => {
    try {
      await API.post(`/users/${u.id}/unlock`);
      fetchUsers();
    } catch (err) {
      alert('Failed to unlock');
    }
  };

  const roleLabel = { admin: 'Admin', company_rep: 'Company Rep', employee: 'Employee', auditor: 'Auditor' };
  const roleBadge = {
    admin: 'bg-primary/10 text-primary',
    company_rep: 'bg-secondary/10 text-secondary',
    employee: 'bg-tertiary/10 text-tertiary',
    auditor: 'bg-outline/10 text-outline',
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">User Management</h1>
          <p className="text-sm text-on-surface-variant mt-1">{pagination.total || 0} users total</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors">
          <span className="material-symbols-outlined text-lg">person_add</span>Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-secondary-container outline-none" />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:border-primary outline-none">
          <option value="">All Roles</option>
          {Object.entries(roleLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-high/50 text-left">
                <th className="px-4 py-3 font-semibold text-on-surface-variant">User</th>
                <th className="px-4 py-3 font-semibold text-on-surface-variant hidden md:table-cell">Email</th>
                <th className="px-4 py-3 font-semibold text-on-surface-variant">Role</th>
                <th className="px-4 py-3 font-semibold text-on-surface-variant hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 font-semibold text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-on-surface-variant">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-on-surface-variant">No users found</td></tr>
              ) : users.map((u) => {
                const fn = u.firstName || u.first_name || '';
                const ln = u.lastName || u.last_name || '';
                const active = u.isActive ?? u.is_active;
                const locked = u.lockUntil || u.lock_until;
                const isLocked = locked && new Date(locked) > new Date();
                return (
                  <tr key={u.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-xs font-bold shrink-0">
                          {fn[0]}{ln[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-on-surface truncate">{fn} {ln}</p>
                          <p className="text-xs text-on-surface-variant md:hidden truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleBadge[u.role]}`}>
                        {roleLabel[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {isLocked ? (
                        <span className="text-xs text-error font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">lock</span>Locked
                        </span>
                      ) : active ? (
                        <span className="text-xs text-primary font-medium flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-primary inline-block" />Active
                        </span>
                      ) : (
                        <span className="text-xs text-outline font-medium">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} title="Edit"
                          className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-primary">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        {isLocked && (
                          <button onClick={() => handleUnlock(u)} title="Unlock"
                            className="p-1.5 rounded-lg hover:bg-secondary-container/30 transition-colors text-on-surface-variant hover:text-secondary">
                            <span className="material-symbols-outlined text-lg">lock_open</span>
                          </button>
                        )}
                        <button onClick={() => handleToggleActive(u)} title={active ? 'Deactivate' : 'Activate'}
                          className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-tertiary">
                          <span className="material-symbols-outlined text-lg">{active ? 'person_off' : 'person'}</span>
                        </button>
                        <button onClick={() => handleDelete(u)} title="Delete"
                          className="p-1.5 rounded-lg hover:bg-error-container/30 transition-colors text-on-surface-variant hover:text-error">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/10">
            <p className="text-xs text-on-surface-variant">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40">
                Previous
              </button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
              <h3 className="text-xl font-bold text-primary">{editUser ? 'Edit User' : 'Create User'}</h3>
              <button onClick={() => setShowModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">First Name</label>
                  <input value={form.firstName} onChange={set('firstName')} required
                    className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Last Name</label>
                  <input value={form.lastName} onChange={set('lastName')} required
                    className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none" />
                </div>
              </div>
              {!editUser && (
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Email</label>
                  <input type="email" value={form.email} onChange={set('email')} required
                    className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none" />
                </div>
              )}
              {!editUser && (
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Password</label>
                  <input type="password" value={form.password} onChange={set('password')} required minLength={8}
                    className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Role</label>
                <select value={form.role} onChange={set('role')}
                  className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none">
                  {Object.entries(roleLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Phone</label>
                  <input value={form.phone} onChange={set('phone')}
                    className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Department</label>
                  <input value={form.department} onChange={set('department')}
                    className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-bright text-on-surface text-sm focus:border-primary outline-none" />
                </div>
              </div>
              {formError && <p className="text-xs text-error">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant font-medium text-sm hover:bg-surface-container-high">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-semibold text-sm hover:bg-primary hover:text-on-primary transition-colors">
                  {formLoading ? 'Saving...' : editUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
