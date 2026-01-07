import { useEffect, useState } from 'react';
import api from '../lib/api';

const emptyVoucherForm = {
  code: '',
  description: '',
  discountAmount: '',
  discountType: 'fixed',
  minSpend: '',
  expiryDate: '',
  expiryOnReceiveMonths: '',
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

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [voucherForm, setVoucherForm] = useState(emptyVoucherForm);
  const [editingVoucherId, setEditingVoucherId] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [voucherStatus, setVoucherStatus] = useState(emptyStatus);
  const [deletingVoucherId, setDeletingVoucherId] = useState(null);

  const loadVouchers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/vouchers');
      setVouchers(response.data || []);
    } catch (err) {
      console.error('Error loading vouchers:', err);
      setError('Failed to load vouchers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  const handleVoucherChange = (event) => {
    const { name, value } = event.target;
    setVoucherForm((prev) => ({ ...prev, [name]: value }));
  };

  const clearVoucherForm = () => {
    setVoucherForm(emptyVoucherForm);
    setEditingVoucherId(null);
  };

  const closeVoucherForm = () => {
    clearVoucherForm();
    setFormMode(null);
    setVoucherStatus(emptyStatus);
  };

  const handleCreateVoucher = () => {
    clearVoucherForm();
    setFormMode('create');
    setVoucherStatus(emptyStatus);
  };

  const handleEditVoucher = (voucher) => {
    setEditingVoucherId(voucher.id);
    setFormMode('edit');
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
      await loadVouchers();
      if (!editingVoucherId) {
        clearVoucherForm();
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to save voucher.';
      setVoucherStatus({ loading: false, error: message, success: null });
    }
  };

  const handleDeleteVoucher = async (voucherId) => {
    setDeletingVoucherId(voucherId);
    setVoucherStatus(emptyStatus);
    try {
      await api.delete(`/admin/vouchers/${voucherId}`);
      setVoucherStatus({ loading: false, error: null, success: 'Voucher deleted.' });
      if (editingVoucherId === voucherId) {
        closeVoucherForm();
      }
      await loadVouchers();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to delete voucher.';
      setVoucherStatus({ loading: false, error: message, success: null });
    } finally {
      setDeletingVoucherId(null);
    }
  };

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
          <h2 className="text-2xl font-semibold text-gray-900">Vouchers</h2>
          <p className="text-sm text-gray-500">
            Click a voucher row to edit it, or create a new voucher template.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateVoucher}
          className="rounded-full bg-[#21421B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1B3C18]"
        >
          Create voucher
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">All vouchers</h3>
          <p className="text-xs text-gray-500">{vouchers.length} total</p>
        </div>

        {vouchers.length === 0 ? (
          <p className="text-sm text-gray-500">No vouchers available.</p>
        ) : (
          <div className="space-y-3">
            {vouchers.map((voucher) => {
              const isEditing = editingVoucherId === voucher.id;
              return (
                <div
                  key={voucher.id}
                  onClick={() => handleEditVoucher(voucher)}
                  className={`rounded-lg border p-4 flex flex-col gap-2 cursor-pointer transition ${
                    isEditing
                      ? 'border-[#21421B] bg-[#F8FDF3] shadow-sm'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{voucher.code}</p>
                      <p className="text-xs text-gray-500">{formatVoucherDetails(voucher)}</p>
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
                          handleEditVoucher(voucher);
                        }}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteVoucher(voucher.id);
                        }}
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
              );
            })}
          </div>
        )}
      </div>

      {formMode && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 pt-20"
          onClick={closeVoucherForm}
        >
          <form
            onSubmit={handleSaveVoucher}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-2xl w-full max-w-2xl space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {formMode === 'edit' ? 'Edit voucher' : 'Create voucher'}
                </h3>
                <p className="text-sm text-gray-500">Fill in voucher details and save.</p>
              </div>
              <button
                type="button"
                onClick={closeVoucherForm}
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
                If expiry on receive is set, rewarded vouchers expire that many months after the
                user earns them.
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
              <button
                type="button"
                onClick={closeVoucherForm}
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
