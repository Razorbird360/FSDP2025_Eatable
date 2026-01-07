import { useState, useEffect } from 'react';
import api from '../lib/api';

const VouchersPage = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeFilter, setActiveFilter] = useState('available');

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

    const formatDate = (dateString) => {
        if (!dateString) return 'No expiry';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-SG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const filteredVouchers = vouchers.filter((voucher) => {
        const expired = voucher.isExpired;
        const used = voucher.used || voucher.isUsed;
        const isAvailable = !used && !expired;
        return activeFilter === 'available' ? isAvailable : !isAvailable;
    });

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-8 min-h-[400px] flex items-center justify-center shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21421B]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-8 min-h-[400px] flex items-center justify-center shadow-sm">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-8 shadow-sm">
            <div className="space-y-4 mb-6">
                <h1 className="text-xl font-bold text-gray-900">My Vouchers</h1>
                <div className="flex justify-start">
                    <div className="relative inline-flex items-center rounded-full bg-gray-100 p-1">
                        <span
                            className={`absolute top-1 left-1 h-8 w-[120px] rounded-full bg-white shadow-sm transition-transform duration-300 ${activeFilter === 'used'
                                ? 'translate-x-[120px]'
                                : 'translate-x-0'
                                }`}
                        ></span>
                        <button
                            type="button"
                            className={`relative z-10 h-8 w-[120px] rounded-full text-sm font-semibold transition-colors ${activeFilter === 'available'
                                ? 'text-gray-900'
                                : 'text-gray-500'
                                }`}
                            onClick={() => setActiveFilter('available')}
                            aria-pressed={activeFilter === 'available'}
                        >
                            Available
                        </button>
                        <button
                            type="button"
                            className={`relative z-10 h-8 w-[120px] rounded-full text-sm font-semibold transition-colors ${activeFilter === 'used'
                                ? 'text-gray-900'
                                : 'text-gray-500'
                                }`}
                            onClick={() => setActiveFilter('used')}
                            aria-pressed={activeFilter === 'used'}
                        >
                            Used
                        </button>
                    </div>
                </div>
            </div>

            {vouchers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl">🎟️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No vouchers yet</h3>
                    <p className="text-sm text-gray-500 text-center">Your collected vouchers and discounts will appear here</p>
                </div>
            ) : filteredVouchers.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-10">
                    {activeFilter === 'available'
                        ? 'No available vouchers right now.'
                        : 'No used vouchers yet.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {filteredVouchers.map((voucher) => {
                        // Use isExpired from backend (calculated based on server time)
                        const expired = voucher.isExpired;
                        const used = voucher.used || voucher.isUsed;

                        return (
                            <div
                                key={voucher.userVoucherId}
                                className={`relative border-2 rounded-xl p-4 md:p-6 transition-all ${used || expired
                                    ? 'border-gray-200 bg-gray-50 opacity-60'
                                    : 'border-[#21421B] bg-gradient-to-br from-[#F8FDF3] to-white hover:shadow-lg'
                                    }`}
                            >
                                {/* Status Badge */}
                                {(used || expired) && (
                                    <div className="absolute top-3 right-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${used ? 'bg-gray-200 text-gray-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {used ? 'Used' : 'Expired'}
                                        </span>
                                    </div>
                                )}

                                {/* Voucher Content */}
                                <div className="space-y-3">
                                    <div>
                                        <h3 className="text-lg md:text-xl font-bold text-[#1B3C18] mb-1">
                                            {voucher.code}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {voucher.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                        <div>
                                            <p className="text-xs text-gray-500">Discount</p>
                                            <p className="text-lg font-bold text-[#21421B]">
                                                {voucher.discountType === 'percentage'
                                                    ? `${voucher.discountAmount}%`
                                                    : `$${(voucher.discountAmount / 100).toFixed(2)}`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Expires</p>
                                            <p className={`text-sm font-medium ${expired ? 'text-red-600' : 'text-gray-700'}`}>
                                                {formatDate(voucher.expiryDate)}
                                            </p>
                                        </div>
                                    </div>

                                    {voucher.minSpend > 0 && (
                                        <p className="text-xs text-gray-500 pt-2">
                                            Min. order: ${(voucher.minSpend / 100).toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default VouchersPage;
