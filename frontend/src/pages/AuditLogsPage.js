import React, { useState, useEffect, useCallback } from 'react';
import API from '../utils/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (actionFilter) params.action = actionFilter;
      const { data } = await API.get('/users/audit/logs', { params });
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [page, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actionBadge = {
    LOGIN_SUCCESS: 'bg-primary/10 text-primary',
    LOGIN_FAILED: 'bg-error/10 text-error',
    LOGIN_LOCKOUT: 'bg-error/20 text-error',
    LOGIN_LOCKED: 'bg-error/10 text-error',
    SIGNUP: 'bg-secondary/10 text-secondary',
    LOGOUT: 'bg-outline/10 text-outline',
    CREATE_USER: 'bg-primary/10 text-primary',
    UPDATE_USER: 'bg-tertiary/10 text-tertiary',
    DELETE_USER: 'bg-error/10 text-error',
    UNLOCK_USER: 'bg-secondary/10 text-secondary',
    UPDATE_PROFILE: 'bg-tertiary/10 text-tertiary',
    CHANGE_PASSWORD: 'bg-outline/10 text-outline',
    FORGOT_PASSWORD: 'bg-secondary/10 text-secondary',
    PASSWORD_RESET: 'bg-primary/10 text-primary',
  };

  const actions = ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_LOCKOUT', 'SIGNUP', 'LOGOUT', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'UNLOCK_USER'];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-on-surface">Audit Logs</h1>
        <p className="text-sm text-on-surface-variant mt-1">Immutable record of all system actions</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:border-primary outline-none">
          <option value="">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-high/50 text-left">
                <th className="px-4 py-3 font-semibold text-on-surface-variant">Timestamp</th>
                <th className="px-4 py-3 font-semibold text-on-surface-variant">User</th>
                <th className="px-4 py-3 font-semibold text-on-surface-variant">Action</th>
                <th className="px-4 py-3 font-semibold text-on-surface-variant hidden md:table-cell">Details</th>
                <th className="px-4 py-3 font-semibold text-on-surface-variant hidden lg:table-cell">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-on-surface-variant">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-on-surface-variant">No logs found</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                    {new Date(log.createdAt || log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-on-surface">
                    {log.user ? `${log.user.firstName || log.user.first_name} ${log.user.lastName || log.user.last_name}` : log.userEmail || log.user_email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${actionBadge[log.action] || 'bg-outline/10 text-outline'}`}>
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant hidden md:table-cell max-w-xs truncate">
                    {log.details || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant hidden lg:table-cell">
                    {log.ipAddress || log.ip_address || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/10">
            <p className="text-xs text-on-surface-variant">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40">Previous</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
