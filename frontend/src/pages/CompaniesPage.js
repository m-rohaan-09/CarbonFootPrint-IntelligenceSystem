import React, { useEffect, useState } from 'react';
import API from '../utils/api';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data } = await API.get('/company', { params: { limit: 100 } });
        setCompanies(data.companies || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load companies');
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const handleDelete = async (companyId) => {
    if (!window.confirm('Delete this company and all associated records?')) return;

    setDeletingId(companyId);
    try {
      await API.delete(`/company/${companyId}`);
      setCompanies((prev) => prev.filter((company) => company.id !== companyId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete company');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-on-surface">Companies</h1>
      <p className="text-sm text-on-surface-variant mt-1 mb-6">{companies.length} companies registered</p>
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-on-surface-variant">Loading...</p>
        ) : error ? (
          <p className="p-8 text-center text-error">{error}</p>
        ) : companies.length === 0 ? (
          <p className="p-8 text-center text-on-surface-variant">No companies found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-high/50 text-left">
                  <th className="px-4 py-3 font-semibold text-on-surface-variant">Company</th>
                  <th className="px-4 py-3 font-semibold text-on-surface-variant">Industry</th>
                  <th className="px-4 py-3 font-semibold text-on-surface-variant">Location</th>
                  <th className="px-4 py-3 font-semibold text-on-surface-variant">Created</th>
                  <th className="px-4 py-3 font-semibold text-on-surface-variant text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td className="px-4 py-3 font-medium text-on-surface">{company.name}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{company.industry || '-'}</td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {[company.city, company.country].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(company.id)}
                        disabled={deletingId === company.id}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-error border border-error/30 hover:bg-error-container/20 transition-colors disabled:opacity-50"
                      >
                        {deletingId === company.id ? 'Deleting...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
