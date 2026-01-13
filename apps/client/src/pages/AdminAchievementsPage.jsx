import { useEffect, useState } from 'react';
import api from '@lib/api';

const emptyAchievementForm = {
  code: '',
  name: '',
  description: '',
  type: 'vote',
  target: '',
  rewardCode: '',
  isOneTime: false,
};

const emptyStatus = { loading: false, error: null, success: null };

const formatAchievementMeta = (achievement) => {
  const typeLabel = achievement.type === 'vote' ? 'Vote' : 'Upload';
  const cadenceLabel = achievement.isOneTime ? 'One-time' : 'Monthly';
  return `${typeLabel} target: ${achievement.target} | ${cadenceLabel}`;
};

export default function AdminAchievementsPage() {
  const [achievements, setAchievements] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [achievementForm, setAchievementForm] = useState(emptyAchievementForm);
  const [editingAchievementId, setEditingAchievementId] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [achievementStatus, setAchievementStatus] = useState(emptyStatus);
  const [deletingAchievementId, setDeletingAchievementId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [achievementRes, voucherRes] = await Promise.all([
        api.get('/admin/achievements'),
        api.get('/admin/vouchers'),
      ]);
      setAchievements(achievementRes.data || []);
      setVouchers(voucherRes.data || []);
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError('Failed to load achievements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAchievementChange = (event) => {
    const { name, value, type, checked } = event.target;
    setAchievementForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const clearAchievementForm = () => {
    setAchievementForm(emptyAchievementForm);
    setEditingAchievementId(null);
  };

  const closeAchievementForm = () => {
    clearAchievementForm();
    setFormMode(null);
    setAchievementStatus(emptyStatus);
  };

  const handleCreateAchievement = () => {
    clearAchievementForm();
    setFormMode('create');
    setAchievementStatus(emptyStatus);
  };

  const handleEditAchievement = (achievement) => {
    setEditingAchievementId(achievement.id);
    setFormMode('edit');
    setAchievementForm({
      code: achievement.code || '',
      name: achievement.name || '',
      description: achievement.description || '',
      type: achievement.type || 'vote',
      target: achievement.target?.toString() ?? '',
      rewardCode: achievement.rewardCode || '',
      isOneTime: Boolean(achievement.isOneTime),
    });
    setAchievementStatus(emptyStatus);
  };

  const handleSaveAchievement = async (event) => {
    event.preventDefault();
    setAchievementStatus({ loading: true, error: null, success: null });

    const payload = {
      code: achievementForm.code.trim(),
      name: achievementForm.name.trim(),
      description: achievementForm.description.trim() || null,
      type: achievementForm.type,
      target: Number(achievementForm.target),
      rewardCode: achievementForm.rewardCode || null,
      isOneTime: Boolean(achievementForm.isOneTime),
    };

    try {
      if (editingAchievementId) {
        await api.patch(`/admin/achievements/${editingAchievementId}`, payload);
        setAchievementStatus({ loading: false, error: null, success: 'Achievement updated.' });
      } else {
        await api.post('/admin/achievements', payload);
        setAchievementStatus({ loading: false, error: null, success: 'Achievement created.' });
      }
      await loadData();
      if (!editingAchievementId) {
        clearAchievementForm();
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to save achievement.';
      setAchievementStatus({ loading: false, error: message, success: null });
    }
  };

  const handleDeleteAchievement = async (achievementId) => {
    setDeletingAchievementId(achievementId);
    setAchievementStatus(emptyStatus);
    try {
      await api.delete(`/admin/achievements/${achievementId}`);
      setAchievementStatus({ loading: false, error: null, success: 'Achievement deleted.' });
      if (editingAchievementId === achievementId) {
        closeAchievementForm();
      }
      await loadData();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete achievement.';
      setAchievementStatus({ loading: false, error: message, success: null });
    } finally {
      setDeletingAchievementId(null);
    }
  };

  const missingRewardCodes = (code) => code && !vouchers.some((voucher) => voucher.code === code);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-10 shadow-sm flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#21421B]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Rewards</p>
          <h2 className="text-2xl font-semibold text-gray-900">Achievements</h2>
          <p className="text-sm text-gray-500">
            Click an achievement row to edit it, or create a new milestone.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateAchievement}
          className="rounded-full bg-[#21421B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1B3C18]"
        >
          Create achievement
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">All achievements</h3>
          <p className="text-xs text-gray-500">{achievements.length} total</p>
        </div>

        {achievements.length === 0 ? (
          <p className="text-sm text-gray-500">No achievements available.</p>
        ) : (
          <div className="space-y-4">
            {achievements.map((achievement) => {
              const isEditing = editingAchievementId === achievement.id;
              return (
                <div
                  key={achievement.id}
                  onClick={() => handleEditAchievement(achievement)}
                  className={`rounded-lg border p-4 space-y-3 cursor-pointer transition ${
                    isEditing
                      ? 'border-[#21421B] bg-[#F8FDF3] shadow-sm'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{achievement.name}</p>
                      <p className="text-xs text-gray-500">{formatAchievementMeta(achievement)}</p>
                      <p className="text-xs text-gray-500">
                        Reward: {achievement.rewardCode || 'No reward'}
                      </p>
                    </div>
                    <div className="flex flex-row gap-2">
                      {isEditing && (
                        <span className="rounded-full bg-[#21421B] px-3 py-1 text-xs font-semibold text-white">
                          Editing
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditAchievement(achievement);
                        }}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteAchievement(achievement.id);
                        }}
                        disabled={deletingAchievementId === achievement.id}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300 disabled:opacity-60"
                      >
                        {deletingAchievementId === achievement.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {formMode && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 pt-20"
          onClick={closeAchievementForm}
        >
          <form
            onSubmit={handleSaveAchievement}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-2xl w-full max-w-2xl space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {formMode === 'edit' ? 'Edit achievement' : 'Create achievement'}
                </h3>
                <p className="text-sm text-gray-500">Define milestones and rewards.</p>
              </div>
              <button
                type="button"
                onClick={closeAchievementForm}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Code
                <input
                  name="code"
                  value={achievementForm.code}
                  onChange={handleAchievementChange}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="vote_3"
                  required
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Name
                <input
                  name="name"
                  value={achievementForm.name}
                  onChange={handleAchievementChange}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Casual Voter"
                  required
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Description
                <input
                  name="description"
                  value={achievementForm.description}
                  onChange={handleAchievementChange}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Cast 3 votes in a month."
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Type
                  <select
                    name="type"
                    value={achievementForm.type}
                    onChange={handleAchievementChange}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="vote">Vote</option>
                    <option value="upload">Upload</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Target
                  <input
                    name="target"
                    type="number"
                    min="1"
                    value={achievementForm.target}
                    onChange={handleAchievementChange}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="3"
                    required
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  name="isOneTime"
                  checked={achievementForm.isOneTime}
                  onChange={handleAchievementChange}
                  className="h-4 w-4 rounded border-gray-300 text-[#21421B]"
                />
                One-time achievement (does not reset monthly)
              </label>

              <label className="text-sm font-medium text-gray-700">
                Reward Voucher
                <select
                  name="rewardCode"
                  value={achievementForm.rewardCode}
                  onChange={handleAchievementChange}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">No reward</option>
                  {missingRewardCodes(achievementForm.rewardCode) && (
                    <option value={achievementForm.rewardCode}>
                      {achievementForm.rewardCode} (missing)
                    </option>
                  )}
                  {vouchers.map((voucher) => (
                    <option key={voucher.id} value={voucher.code}>
                      {voucher.code}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {achievementStatus.error && (
              <p className="text-sm text-red-600">{achievementStatus.error}</p>
            )}
            {achievementStatus.success && (
              <p className="text-sm text-green-600">{achievementStatus.success}</p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={achievementStatus.loading}
                className="flex-1 rounded-lg bg-[#21421B] text-white py-2 text-sm font-semibold hover:bg-[#1B3C18] disabled:opacity-60"
              >
                {achievementStatus.loading
                  ? 'Saving...'
                  : editingAchievementId
                    ? 'Update Achievement'
                    : 'Create Achievement'}
              </button>
              <button
                type="button"
                onClick={closeAchievementForm}
                className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
