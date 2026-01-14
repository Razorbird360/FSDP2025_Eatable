import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@lib/api';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
};

const formatName = (user) => user?.displayName || user?.email || 'Unknown user';

export default function AdminModerationUsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ flaggedUserCount: 0, totalReports: 0 });
  const [flaggedUsers, setFlaggedUsers] = useState([]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/moderation/users', {
        params: { status: 'pending', limit: 8 },
      });
      const data = response.data || {};
      setStats({
        flaggedUserCount: data.flaggedUserCount ?? 0,
        totalReports: data.totalReports ?? 0,
      });
      setFlaggedUsers(Array.isArray(data.flaggedUsers) ? data.flaggedUsers : []);
    } catch (err) {
      console.error('Error loading moderation users:', err);
      setError('Failed to load moderation users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const userStats = [
    {
      label: 'Flagged accounts',
      value: loading ? '...' : stats.flaggedUserCount,
      note: 'Accounts tied to reports',
    },
    {
      label: 'Pending reports',
      value: loading ? '...' : stats.totalReports,
      note: 'Awaiting review',
    },
    { label: 'Trust signals', value: 'N/A', note: 'Not tracked yet' },
  ];

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Moderation</p>
        <h2 className="text-2xl font-semibold text-gray-900">User Moderation</h2>
        <p className="text-sm text-gray-500">
          Review flagged accounts, ban appeals, and trust signals.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {userStats.map((stat) => (
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
            <h3 className="text-lg font-semibold text-gray-900">Flagged user queue</h3>
            <p className="text-sm text-gray-500">
              Accounts tied to reports awaiting admin review.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/moderation/reports"
              className="rounded-full bg-[#21421B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1B3C18]"
            >
              Review reports
            </Link>
            <Link
              to="/admin/moderation/media"
              className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-gray-300"
            >
              Review uploads
            </Link>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21421B]"></div>
          </div>
        )}

        {!loading && error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && flaggedUsers.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#E7EEE7] bg-[#F8FDF3] px-4 py-4 text-sm text-gray-500">
            No flagged users right now.
          </div>
        )}

        {!loading && !error && flaggedUsers.length > 0 && (
          <div className="space-y-3">
            {flaggedUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-lg border border-gray-100 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">{formatName(user)}</p>
                  <p className="text-xs text-gray-500">{user.email || 'No email provided'}</p>
                </div>
                <div className="text-xs text-gray-500">
                  Reports: {user.reportCount} · Last: {formatDate(user.latestReportAt)}
                </div>
                <Link
                  to="/admin/moderation/reports"
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                >
                  View reports
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
