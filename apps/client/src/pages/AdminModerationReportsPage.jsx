import { useEffect, useState } from 'react';
import api from '../lib/api';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export default function AdminModerationReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({
    pending: 0,
    resolved: 0,
    dismissed: 0,
    resolvedToday: 0,
  });
  const [updatingId, setUpdatingId] = useState(null);
  const [actionStatus, setActionStatus] = useState({ error: null, success: null });

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/moderation/reports', {
        params: { status: 'pending', limit: 12 },
      });
      setReports(Array.isArray(response.data?.reports) ? response.data.reports : []);
      if (response.data?.summary) {
        setSummary({
          pending: response.data.summary.pending ?? 0,
          resolved: response.data.summary.resolved ?? 0,
          dismissed: response.data.summary.dismissed ?? 0,
          resolvedToday: response.data.summary.resolvedToday ?? 0,
        });
      }
    } catch (err) {
      console.error('Error loading moderation reports:', err);
      setError('Failed to load moderation reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleUpdateStatus = async (reportId, status) => {
    setUpdatingId(reportId);
    setActionStatus({ error: null, success: null });
    try {
      await api.patch(`/admin/moderation/reports/${reportId}`, { status });
      setActionStatus({ error: null, success: 'Report updated.' });
      await loadReports();
    } catch (err) {
      console.error('Error updating report status:', err);
      const message = err.response?.data?.error || 'Failed to update report status.';
      setActionStatus({ error: message, success: null });
    } finally {
      setUpdatingId(null);
    }
  };

  const reportStats = [
    {
      label: 'Pending reports',
      value: loading ? '...' : summary.pending,
      note: 'Awaiting triage',
    },
    {
      label: 'Resolved today',
      value: loading ? '...' : summary.resolvedToday,
      note: 'Completed since midnight',
    },
    {
      label: 'Resolved total',
      value: loading ? '...' : summary.resolved,
      note: 'All time',
    },
  ];

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Moderation</p>
        <h2 className="text-2xl font-semibold text-gray-900">Reports Triage</h2>
        <p className="text-sm text-gray-500">
          Track safety reports, prioritize escalations, and close cases.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.note}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Reports queue</h3>
            <p className="text-sm text-gray-500">
              Review reports and mark them resolved or dismissed.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21421B]"></div>
          </div>
        )}

        {!loading && error && <p className="text-sm text-red-600">{error}</p>}

        {actionStatus.error && <p className="text-sm text-red-600">{actionStatus.error}</p>}
        {actionStatus.success && (
          <p className="text-sm text-green-600">{actionStatus.success}</p>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#E7EEE7] bg-[#F8FDF3] px-4 py-4 text-sm text-gray-500">
            No pending reports right now.
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="rounded-lg border border-gray-100 p-4 flex flex-col gap-4 md:flex-row"
              >
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-gray-900">{report.reason}</p>
                  {report.details && <p className="text-sm text-gray-600">{report.details}</p>}
                  <p className="text-xs text-gray-500">
                    Reported by: {report.reporter?.displayName || report.reporter?.email || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Upload: {report.upload?.menuItem?.name || 'Unknown item'} · Uploader:{' '}
                    {report.upload?.user?.displayName || report.upload?.user?.email || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Status: {report.status} · Submitted: {formatDateTime(report.createdAt)}
                  </p>
                </div>
                <div className="flex flex-row md:flex-col gap-2">
                  <button
                    type="button"
                    disabled={updatingId === report.id}
                    onClick={() => handleUpdateStatus(report.id, 'resolved')}
                    className="rounded-full bg-[#21421B] px-3 py-1 text-xs font-semibold text-white hover:bg-[#1B3C18] disabled:opacity-60"
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === report.id}
                    onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
