import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import logo_full from '../../../assets/logo/logo_full.png';
import qrImg from '../../../assets/logo/QrPlaceholder.png';
import locationImg from '../../../assets/logo/LocationIcon.png';
import clockImg from '../../../assets/logo/Clock.png';

const fallbackFoodImg = "https://app.yakun.com/media/catalog/product/cache/f77d76b011e98ab379caeb79cadeeecd/f/r/french-toast-with-kaya.jpg";

export default function OrderDetailsModal({ order, onClose }) {
    const navigate = useNavigate();

    if (!order) return null;

    const {
        id: orderId,
        status,
        stall,
        orderItems,
        createdAt,
        estimatedReadyTime,
        totalCents,
        discounts_charges
    } = order;

    const stallName = stall?.name || 'Unknown Stall';
    const stallLocation = stall?.location || 'Location not available';

    // Format dates
    const placedAtDate = new Date(createdAt);
    const placedAtText = !isNaN(placedAtDate) ? placedAtDate.toLocaleString('en-SG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }) : '—';

    let estimatedPickupText = 'Awaiting confirmation';
    if (estimatedReadyTime) {
        const d = new Date(estimatedReadyTime);
        if (!isNaN(d)) {
            estimatedPickupText = `Around ${d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
        }
    }

    const [voucherInfo, setVoucherInfo] = useState(null);

    // Calculate totals
    const subtotal = orderItems?.reduce((sum, item) => sum + item.unitCents, 0) / 100 || 0;
    const serviceFee = discounts_charges?.find(dc => dc.type === 'fee')?.amountCents / 100 || 0;
    const voucherDiscount = discounts_charges?.find(dc => dc.type === 'voucher');
    const voucherApplied = voucherDiscount?.amountCents / 100 || 0;
    // If totalCents is available use it, otherwise calculate
    const total = totalCents ? totalCents / 100 : (subtotal + serviceFee - voucherApplied);

    // Fetch voucher info if there's a voucher discount
    useEffect(() => {
        async function fetchVoucherInfo() {
            if (voucherDiscount?.userVoucherId) {
                try {
                    const vouchersRes = await api.get('/vouchers/user');
                    const allVouchers = vouchersRes.data;
                    const usedVoucher = allVouchers.find(v => v.userVoucherId === voucherDiscount.userVoucherId);
                    if (usedVoucher) {
                        setVoucherInfo(usedVoucher);
                    }
                } catch (err) {
                    console.error("Failed to fetch voucher info:", err);
                }
            }
        }
        fetchVoucherInfo();
    }, [voucherDiscount?.userVoucherId]);

    const displayOrderNumber = orderId && orderId.length > 24
        ? `${orderId.slice(0, 8)}-${orderId.slice(-4)}`
        : orderId;

    const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';
    console.log(orderItems)

    console.log('OrderDetailsModal - Order Status:', status);

    // Determine if we show QR or Pay button
    const s = status?.toLowerCase();
    const isPaid = s === 'completed' || s === 'paid';
    const isPending = s === 'pending';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="relative bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)] rounded-xl w-[1182px] h-[829px] max-w-full overflow-hidden scale-[0.6] md:scale-[0.7] origin-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="w-[899px] h-10 left-[108px] top-[42px] absolute flex items-center text-neutral-900 text-3xl font-medium leading-8">
                    Order Details
                </div>

                <img
                    className="w-24 h-24 left-[1003px] top-[12px] absolute object-contain"
                    src={logo_full}
                    alt="Eatable Logo"
                />

                <div className="w-[1056px] h-px left-[46px] top-[90.5px] absolute bg-black" />

                {/* Order Meta */}
                <div className="w-80 h-10 left-[125px] top-[130px] absolute flex items-center text-black text-lg font-medium leading-8">
                    Order Number:&nbsp;{displayOrderNumber}
                </div>
                <div className="w-80 h-10 left-[125px] top-[160px] absolute flex items-center text-black text-lg font-medium leading-8">
                    Order Status:&nbsp; {displayStatus}
                </div>
                <div className="w-[320px] h-10 left-[125px] top-[190px] absolute flex items-center text-black text-sm font-normal leading-5">
                    Placed on:&nbsp;{placedAtText}
                </div>

                {/* Stall Info */}
                <div className="w-60 h-10 left-[169px] top-[240px] absolute flex items-center">
                    <span className="block w-full text-neutral-900 text-xl font-semibold leading-8 truncate">
                        {stallName}
                    </span>
                </div>
                <div className="w-72 h-10 left-[169px] top-[264px] absolute flex items-center text-stone-400 text-base font-medium leading-8">
                    {stallLocation}
                </div>
                <img
                    src={locationImg}
                    alt="Location"
                    className="w-7 h-7 left-[134px] top-[268px] absolute object-contain"
                />

                {/* Estimated Time */}
                <div className="w-60 h-10 left-[169px] top-[320px] absolute flex items-center text-neutral-900 text-xl font-semibold leading-8">
                    Estimated Pick-Up Time
                </div>
                <div className="w-72 h-10 left-[169px] top-[345px] absolute flex items-center text-stone-400 text-base font-medium leading-8">
                    {estimatedPickupText}
                </div>
                <img
                    src={clockImg}
                    alt="Clock"
                    className="w-7 h-7 left-[134px] top-[349px] absolute object-contain"
                />

                {/* Action Area: QR or Pay Button */}
                {isPaid && (
                    <>
                        <div className="w-28 h-10 left-[220px] top-[420px] absolute flex items-center justify-center text-neutral-900 text-xl font-semibold underline leading-8">
                            Pick Up QR
                        </div>
                        <div className="w-[196px] h-[196px] left-[178px] top-[460px] absolute">
                            <img
                                src={qrImg}
                                alt="Pick up QR"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </>
                )}

                {isPending && (
                    <div className="absolute left-[159px] top-[500px]">
                        <button
                            className="w-60 h-12 bg-[#21421B] rounded-xl text-white text-lg font-semibold shadow-md hover:bg-[#162e12] transition-colors"
                            onClick={() => navigate(`/makepayment/${orderId}`)}
                        >
                            Make Payment
                        </button>
                    </div>
                )}

                {/* Close Button */}
                <button
                    className="w-60 h-10 left-[159px] top-[708px] absolute bg-gray-200 rounded-[10px] text-center text-gray-800 text-lg leading-8 shadow-sm hover:bg-gray-300"
                    onClick={onClose}
                >
                    Close
                </button>

                {/* RIGHT SIDE: ORDER DETAILS CARD */}
                <div className="w-[478px] h-[571px] left-[596px] top-[196px] absolute bg-white rounded-[10px] shadow-[0px_4px_4px_rgba(0,0,0,0.25)] border border-zinc-400 overflow-hidden">
                    {/* Header */}
                    <div className="w-full px-4 pt-5 pb-3 flex flex-col items-center">
                        <div className="text-neutral-900 text-2xl font-medium leading-8">
                            Order Details
                        </div>
                        <div className="text-neutral-900 text-xl font-medium leading-8 text-center mt-1">
                            {stallName}
                        </div>
                    </div>

                    <div className="w-full h-px bg-zinc-400" />

                    {/* Items list */}
                    <div className="px-4 py-4 space-y-3 max-h-[230px] overflow-y-auto">
                        {orderItems?.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center">No items found.</p>
                        ) : (
                            orderItems?.map((item) => (
                                <div key={item.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={item.menuItem?.mediaUploads?.[0]?.imageUrl || item.menuItem?.image_url || fallbackFoodImg}
                                            alt={item.menuItem?.name}
                                            className="w-16 h-16 rounded-[5px] object-cover"
                                        />
                                        <div>
                                            <div className="text-black text-base font-medium leading-5">
                                                {item.menuItem?.name || 'Unknown Item'}
                                            </div>
                                            <div className="text-black text-base leading-5">
                                                x{item.quantity}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-black text-base font-medium leading-5">
                                        $ {(item.unitCents / 100).toFixed(2)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="w-full h-px bg-zinc-400 mt-2" />

                    {/* Totals */}
                    <div className="px-8 pt-3 pb-2 text-neutral-900 text-base font-medium leading-8 space-y-1.5">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>$ {subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Service Fees</span>
                            <span>$ {serviceFee.toFixed(2)}</span>
                        </div>
                        {voucherApplied > 0 && (
                            <div className="flex justify-between">
                                <span>
                                    Applied Voucher {voucherInfo && `(${voucherInfo.code})`}
                                </span>
                                <span className="text-green-600">- $ {voucherApplied.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <div className="w-full h-px bg-zinc-400" />

                    <div className="px-8 py-3 flex justify-between text-neutral-900 text-base font-medium leading-8">
                        <span>Total</span>
                        <span>$ {total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
