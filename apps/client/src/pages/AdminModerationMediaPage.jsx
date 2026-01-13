import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@lib/api';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export default function AdminModerationMediaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [actionStatus, setActionStatus] = useState({ error: null, success: null });

  const loadUploads = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/moderation/media', {
        params: { status: 'pending', limit: 12 },
      });
      setUploads(Array.isArray(response.data?.uploads) ? response.data.uploads : []);
    } catch (err) {
      console.error('Error loading moderation media:', err);
      setError('Failed to load moderation uploads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUploads();
  }, []);

  const handleUpdateStatus = async (uploadId, validationStatus) => {
    setUpdatingId(uploadId);
    setActionStatus({ error: null, success: null });
    try {
      await api.patch(`/admin/moderation/media/${uploadId}`, { validationStatus });
      setActionStatus({ error: null, success: 'Media status updated.' });
      await loadUploads();
    } catch (err) {
      console.error('Error updating media status:', err);
      const message = err.response?.data?.error || 'Failed to update media status.';
      setActionStatus({ error: message, success: null });
    } finally {
      setUpdatingId(null);
    }
  };

  const reportedCount = uploads.filter((upload) => upload.reportCount > 0).length;

  const mediaStats = [
    {
      label: 'Pending uploads',
      value: loading ? '...' : uploads.length,
      note: 'Awaiting review',
    },
    {
      label: 'Uploads flagged',
      value: loading ? '...' : reportedCount,
      note: 'Reports submitted',
    },
    { label: 'Resolved cases', value: 'N/A', note: 'Queue tracking TBD' },
  ];

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Moderation</p>
        <h2 className="text-2xl font-semibold text-gray-900">Media Review</h2>
        <p className="text-sm text-gray-500">
          Inspect uploads, remove unsafe content, and label violations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mediaStats.map((stat) => (
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
            <h3 className="text-lg font-semibold text-gray-900">Pending media queue</h3>
            <p className="text-sm text-gray-500">
              Approve or reject uploads before they appear in the gallery.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/moderation/reports"
              className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-gray-300"
            >
              View reports
            </Link>
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

        {!loading && !error && uploads.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#E7EEE7] bg-[#F8FDF3] px-4 py-4 text-sm text-gray-500">
            No pending uploads right now.
          </div>
        )}

        {!loading && !error && uploads.length > 0 && (
          <div className="space-y-4">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="rounded-lg border border-gray-100 p-4 flex flex-col gap-4 md:flex-row"
              >
                <img
                  src={upload.imageUrl}
                  alt={upload.menuItem?.name || 'Upload'}
                  className="h-32 w-full md:w-32 rounded-lg object-cover"
                />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-gray-900">
                    {upload.menuItem?.name || 'Unknown menu item'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Stall: {upload.menuItem?.stall?.name || 'Unknown stall'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Uploader: {upload.user?.displayName || upload.user?.email || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Reports: {upload.reportCount} · Status: {upload.validationStatus}
                  </p>
                  <p className="text-xs text-gray-500">
                    Uploaded: {formatDateTime(upload.createdAt)}
                  </p>
                </div>
                <div className="flex flex-row md:flex-col gap-2">
                  <button
                    type="button"
                    disabled={updatingId === upload.id}
                    onClick={() => handleUpdateStatus(upload.id, 'approved')}
                    className="rounded-full bg-[#21421B] px-3 py-1 text-xs font-semibold text-white hover:bg-[#1B3C18] disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === upload.id}
                    onClick={() => handleUpdateStatus(upload.id, 'rejected')}
                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  {upload.reportCount > 0 && (
                    <Link
                      to="/admin/moderation/reports"
                      className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                    >
                      View reports
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
