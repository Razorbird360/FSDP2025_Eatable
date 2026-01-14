import { useEffect, useState } from 'react';
import { Check, Clock, Copy, Gift } from 'lucide-react';
import api from '@lib/api';

const formatDate = (dateString) => {
  if (!dateString) return 'No expiry';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const isExpiringSoon = (dateString) => {
  if (!dateString) return false;
  const days = Math.ceil((new Date(dateString) - new Date()) / (1000 * 60 * 60 * 24));
  return days <= 7 && days > 0;
};

const getVoucherGradient = (voucher) => {
  switch (voucher.discountType) {
    case 'percentage':
      return 'from-emerald-500 to-teal-600';
    case 'delivery':
      return 'from-violet-500 to-purple-600';
    default:
      return 'from-amber-500 to-orange-600';
  }
};

const VouchersPage = () => {
  const [vouchers, setVouchers] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const response = await api.get('/vouchers/user');
        setVouchers(response.data || []);
      } catch (err) {
        console.error('Error fetching vouchers:', err);
        setError('Failed to load vouchers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchVouchers();
  }, []);

  const availableVouchers = vouchers.filter((voucher) => {
    const expired = voucher.isExpired;
    const used = voucher.used || voucher.isUsed;
    return !expired && !used;
  });

  const handleCopyCode = async (id, code) => {
    if (!navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy voucher code:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 min-h-[300px] flex items-center justify-center shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21421B]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 min-h-[300px] flex items-center justify-center shadow-sm">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">My Vouchers</h1>
        <span className="text-sm text-gray-500">{availableVouchers.length} available</span>
      </div>

      {availableVouchers.length > 0 ? (
        <div className="space-y-4">
          {availableVouchers.map((voucher) => {
            const discountLabel =
              voucher.discountType === 'percentage'
                ? `${voucher.discountAmount}%`
                : `$${(voucher.discountAmount / 100).toFixed(2)}`;
            const typeLabel = voucher.discountType === 'delivery' ? 'DELIVERY' : 'OFF';
            const minSpendLabel =
              voucher.minSpend > 0
                ? `Min. spend $${(voucher.minSpend / 100).toFixed(2)}`
                : 'No minimum spend';
            const expiryLabel = voucher.expiryDate ? `Expires ${formatDate(voucher.expiryDate)}` : 'No expiry';

            return (
              <div
                key={voucher.userVoucherId}
                className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="flex flex-col">
                  <div
                    className={`bg-gradient-to-r ${getVoucherGradient(voucher)} text-white p-4 flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <Gift className="w-6 h-6 opacity-80" />
                      <div>
                        <div className="text-2xl font-bold">{discountLabel}</div>
                        <div className="text-xs opacity-90">{typeLabel}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(voucher.userVoucherId, voucher.code)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        copiedId === voucher.userVoucherId
                          ? 'bg-white/30 text-white'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      {copiedId === voucher.userVoucherId ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          {voucher.code}
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-base mb-1">{voucher.description}</h3>
                    <p className="text-sm text-gray-500 mb-3">{minSpendLabel}</p>

                    <span
                      className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full ${
                        isExpiringSoon(voucher.expiryDate)
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {expiryLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-[#F8FDF3] rounded-2xl border border-dashed border-[#E7EEE7]">
          <div className="w-16 h-16 bg-[#EFF8EE] rounded-full flex items-center justify-center mb-4">
            <Gift className="w-8 h-8 text-[#21421B]" />
          </div>
          <h3 className="text-lg font-semibold text-[#1C201D] mb-2">
            {vouchers.length === 0 ? 'No vouchers yet' : 'No available vouchers'}
          </h3>
          <p className="text-[#4A554B] text-center px-4">
            {vouchers.length === 0
              ? 'Complete orders to earn vouchers and discounts!'
              : 'Check back later for new voucher rewards.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default VouchersPage;
