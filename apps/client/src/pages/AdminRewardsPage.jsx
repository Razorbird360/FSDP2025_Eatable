import { useEffect, useState } from 'react';
import api from '@lib/api';

const emptyVoucherForm = {
  code: '',
  description: '',
  discountAmount: '',
  discountType: 'fixed',
  minSpend: '',
  expiryDate: '',
  expiryOnReceiveMonths: '',
};

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


const formatDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const formatDateLabel = (value) => {
  if (!value) return 'No absolute expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No absolute expiry';
  return date.toISOString().slice(0, 10);
};

const formatVoucherDetails = (voucher) => {
  const discountLabel =
    voucher.discountType === 'percentage'
      ? `${voucher.discountAmount}% off`
      : `${voucher.discountAmount} cents off`;
  const minSpendLabel = voucher.minSpend ? `Min spend ${voucher.minSpend} cents` : 'No min spend';
  let expiryLabel = 'Default expiry 30 days after receive';
  if (voucher.expiryOnReceiveMonths) {
    expiryLabel = `Valid ${voucher.expiryOnReceiveMonths} month(s) after receive`;
  } else if (voucher.expiryDate) {
    expiryLabel = `Expires ${formatDateLabel(voucher.expiryDate)}`;
  }
  return `${discountLabel} | ${minSpendLabel} | ${expiryLabel}`;
};

const formatAchievementMeta = (achievement) => {
  const typeLabel = achievement.type === 'vote' ? 'Vote' : 'Upload';
  const cadenceLabel = achievement.isOneTime ? 'One-time' : 'Monthly';
  return `${typeLabel} target: ${achievement.target} | ${cadenceLabel}`;
};

export default function AdminRewardsPage() {
  const [vouchers, setVouchers] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [voucherForm, setVoucherForm] = useState(emptyVoucherForm);
  const [achievementForm, setAchievementForm] = useState(emptyAchievementForm);
  const [editingVoucherId, setEditingVoucherId] = useState(null);
  const [editingAchievementId, setEditingAchievementId] = useState(null);

  const [rewardSelections, setRewardSelections] = useState({});
  const [voucherStatus, setVoucherStatus] = useState(emptyStatus);
  const [achievementStatus, setAchievementStatus] = useState(emptyStatus);
  const [rewardStatus, setRewardStatus] = useState(emptyStatus);
  const [deletingVoucherId, setDeletingVoucherId] = useState(null);
  const [deletingAchievementId, setDeletingAchievementId] = useState(null);

  const voucherCount = vouchers.length;
  const achievementCount = achievements.length;
  const rewardLinkedCount = achievements.filter((achievement) => achievement.rewardCode).length;
  const expiryRuleCount = vouchers.filter(
    (voucher) => voucher.expiryDate || voucher.expiryOnReceiveMonths
  ).length;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [voucherRes, achievementRes] = await Promise.all([
        api.get('/admin/vouchers'),
        api.get('/admin/achievements'),
      ]);
      setVouchers(voucherRes.data || []);
      setAchievements(achievementRes.data || []);
      setRewardSelections({});
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVoucherChange = (event) => {
    const { name, value } = event.target;
    setVoucherForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAchievementChange = (event) => {
    const { name, value, type, checked } = event.target;
    setAchievementForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetVoucherForm = () => {
    setVoucherForm(emptyVoucherForm);
    setEditingVoucherId(null);
  };

  const resetAchievementForm = () => {
    setAchievementForm(emptyAchievementForm);
    setEditingAchievementId(null);
  };

  const handleEditVoucher = (voucher) => {
    setEditingVoucherId(voucher.id);
    setVoucherForm({
      code: voucher.code || '',
      description: voucher.description || '',
      discountAmount: voucher.discountAmount?.toString() ?? '',
      discountType: voucher.discountType || 'fixed',
      minSpend: voucher.minSpend?.toString() ?? '',
      expiryDate: formatDateInput(voucher.expiryDate),
      expiryOnReceiveMonths: voucher.expiryOnReceiveMonths?.toString() ?? '',
    });
    setVoucherStatus(emptyStatus);
  };

  const handleEditAchievement = (achievement) => {
    setEditingAchievementId(achievement.id);
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

  const handleSaveVoucher = async (event) => {
    event.preventDefault();
    setVoucherStatus({ loading: true, error: null, success: null });

    const payload = {
      code: voucherForm.code.trim(),
      description: voucherForm.description.trim() || null,
      discountAmount: Number(voucherForm.discountAmount),
      discountType: voucherForm.discountType,
      minSpend: voucherForm.minSpend ? Number(voucherForm.minSpend) : 0,
      expiryDate: voucherForm.expiryDate ? new Date(voucherForm.expiryDate).toISOString() : null,
      expiryOnReceiveMonths: voucherForm.expiryOnReceiveMonths
        ? Number(voucherForm.expiryOnReceiveMonths)
        : null,
    };

    try {
      if (editingVoucherId) {
        await api.patch(`/admin/vouchers/${editingVoucherId}`, payload);
        setVoucherStatus({ loading: false, error: null, success: 'Voucher updated.' });
      } else {
        await api.post('/admin/vouchers', payload);
        setVoucherStatus({ loading: false, error: null, success: 'Voucher created.' });
      }
      resetVoucherForm();
      await loadData();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to save voucher.';
      setVoucherStatus({ loading: false, error: message, success: null });
    }
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
      resetAchievementForm();
      await loadData();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to save achievement.';
      setAchievementStatus({ loading: false, error: message, success: null });
    }
  };

  const handleDeleteVoucher = async (voucherId) => {
    setDeletingVoucherId(voucherId);
    setVoucherStatus(emptyStatus);
    try {
      await api.delete(`/admin/vouchers/${voucherId}`);
      setVoucherStatus({ loading: false, error: null, success: 'Voucher deleted.' });
      await loadData();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete voucher.';
      setVoucherStatus({ loading: false, error: message, success: null });
    } finally {
      setDeletingVoucherId(null);
    }
  };

  const handleDeleteAchievement = async (achievementId) => {
    setDeletingAchievementId(achievementId);
    setAchievementStatus(emptyStatus);
    try {
      await api.delete(`/admin/achievements/${achievementId}`);
      setAchievementStatus({ loading: false, error: null, success: 'Achievement deleted.' });
      await loadData();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete achievement.';
      setAchievementStatus({ loading: false, error: message, success: null });
    } finally {
      setDeletingAchievementId(null);
    }
  };

  const handleAttachReward = async (achievementId) => {
    setRewardStatus({ loading: true, error: null, success: null });
    const selection = rewardSelections[achievementId];
    const currentReward = achievements.find((item) => item.id === achievementId)?.rewardCode ?? null;
    const rewardCode = selection === undefined ? currentReward : selection || null;

    try {
      await api.patch(`/admin/achievements/${achievementId}/reward`, { rewardCode });
      setRewardStatus({ loading: false, error: null, success: 'Reward updated.' });
      await loadData();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update reward.';
      setRewardStatus({ loading: false, error: message, success: null });
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
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Rewards</p>
        <h2 className="text-2xl font-semibold text-gray-900">Vouchers and Achievements</h2>
        <p className="text-sm text-gray-500">
          Build reward offers, tune achievements, and link vouchers to milestones.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Vouchers</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{voucherCount}</p>
          <p className="text-xs text-gray-500">{expiryRuleCount} with expiry rules</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Achievements</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{achievementCount}</p>
          <p className="text-xs text-gray-500">{rewardLinkedCount} linked to rewards</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Reward Links</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{rewardLinkedCount}</p>
          <p className="text-xs text-gray-500">Active achievement rewards</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Expiry Rules</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{expiryRuleCount}</p>
          <p className="text-xs text-gray-500">Voucher expiries configured</p>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-6">
        <form
          onSubmit={handleSaveVoucher}
          className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4"
        >
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Voucher Builder</h2>
              <p className="text-sm text-gray-500">Create or update voucher templates for rewards.</p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Code
                <input
                  name="code"
                  value={voucherForm.code}
                  onChange={handleVoucherChange}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="VOTER_REWARD"
                  required
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Description
                <input
                  name="description"
                  value={voucherForm.description}
                  onChange={handleVoucherChange}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Reward for active voters"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Discount Amount
                  <input
                    name="discountAmount"
                    type="number"
                    min="0"
                    value={voucherForm.discountAmount}
                    onChange={handleVoucherChange}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="200"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Discount Type
                  <select
                    name="discountType"
                    value={voucherForm.discountType}
                    onChange={handleVoucherChange}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Min Spend (cents)
                  <input
                    name="minSpend"
                    type="number"
                    min="0"
                    value={voucherForm.minSpend}
                    onChange={handleVoucherChange}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="500"
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Absolute Expiry Date
                  <input
                    name="expiryDate"
                    type="date"
                    value={voucherForm.expiryDate}
                    onChange={handleVoucherChange}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="text-sm font-medium text-gray-700">
                Expiry On Receive (months)
                <input
                  name="expiryOnReceiveMonths"
                  type="number"
                  min="1"
                  value={voucherForm.expiryOnReceiveMonths}
                  onChange={handleVoucherChange}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="1"
                />
              </label>
              <p className="text-xs text-gray-500">
                If expiry on receive is set, rewarded vouchers expire that many months after the user
                earns them.
              </p>
            </div>

            {voucherStatus.error && <p className="text-sm text-red-600">{voucherStatus.error}</p>}
            {voucherStatus.success && (
              <p className="text-sm text-green-600">{voucherStatus.success}</p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={voucherStatus.loading}
                className="flex-1 rounded-lg bg-[#21421B] text-white py-2 text-sm font-semibold hover:bg-[#1B3C18] disabled:opacity-60"
              >
                {voucherStatus.loading
                  ? 'Saving...'
                  : editingVoucherId
                    ? 'Update Voucher'
                    : 'Create Voucher'}
              </button>
              {editingVoucherId && (
                <button
                  type="button"
                  onClick={() => {
                    resetVoucherForm();
                    setVoucherStatus(emptyStatus);
                  }}
                  className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Voucher Library</h2>
              <p className="text-sm text-gray-500">Review existing vouchers and edit them inline.</p>
            </div>

            {vouchers.length === 0 ? (
              <p className="text-sm text-gray-500">No vouchers available.</p>
            ) : (
              <div className="space-y-3">
                {vouchers.map((voucher) => (
                  <div
                    key={voucher.id}
                    className="rounded-lg border border-gray-100 p-4 flex flex-col gap-2"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{voucher.code}</p>
                        <p className="text-xs text-gray-500">{formatVoucherDetails(voucher)}</p>
                      </div>
                      <div className="flex flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditVoucher(voucher)}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVoucher(voucher.id)}
                          disabled={deletingVoucherId === voucher.id}
                          className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300 disabled:opacity-60"
                        >
                          {deletingVoucherId === voucher.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {voucher.description || 'No description provided.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-6">
          <form
            onSubmit={handleSaveAchievement}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4"
          >
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Achievement Builder</h2>
              <p className="text-sm text-gray-500">Define monthly milestones and their rewards.</p>
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
              {editingAchievementId && (
                <button
                  type="button"
                  onClick={() => {
                    resetAchievementForm();
                    setAchievementStatus(emptyStatus);
                  }}
                  className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Achievement Library</h2>
              <p className="text-sm text-gray-500">
                Attach vouchers, edit details, or remove achievements.
              </p>
            </div>

            {achievements.length === 0 ? (
              <p className="text-sm text-gray-500">No achievements available.</p>
            ) : (
              <div className="space-y-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="rounded-lg border border-gray-100 p-4 space-y-3"
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
                        <button
                          type="button"
                          onClick={() => handleEditAchievement(achievement)}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAchievement(achievement.id)}
                          disabled={deletingAchievementId === achievement.id}
                          className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300 disabled:opacity-60"
                        >
                          {deletingAchievementId === achievement.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <select
                        value={rewardSelections[achievement.id] ?? achievement.rewardCode ?? ''}
                        onChange={(event) =>
                          setRewardSelections((prev) => ({
                            ...prev,
                            [achievement.id]: event.target.value,
                          }))
                        }
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="">No reward</option>
                        {missingRewardCodes(achievement.rewardCode) && (
                          <option value={achievement.rewardCode}>
                            {achievement.rewardCode} (missing)
                          </option>
                        )}
                        {vouchers.map((voucher) => (
                          <option key={voucher.id} value={voucher.code}>
                            {voucher.code}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAttachReward(achievement.id)}
                        disabled={rewardStatus.loading}
                        className="rounded-lg bg-[#21421B] text-white px-4 py-2 text-sm font-semibold hover:bg-[#1B3C18] disabled:opacity-60"
                      >
                        Save Reward
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {rewardStatus.error && <p className="text-sm text-red-600">{rewardStatus.error}</p>}
            {rewardStatus.success && (
              <p className="text-sm text-green-600">{rewardStatus.success}</p>
            )}
          </div>
        </section>
      </section>
    );
}
