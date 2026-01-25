import { useNavigate } from "react-router-dom";
import LogoImage from "../../../assets/logo/logo_full.png";
import api from "@lib/api";
import { getOrCreateAnonId, trackEvents } from "@lib/events";
import { useCart } from "./CartContext";
import { useAuth } from "../../auth/useAuth";
import { useState, useEffect, useCallback } from "react";

export default function OrderSummary() {
  const navigate = useNavigate();

  const [serviceFee, setServiceFee] = useState(0);
  const [loadingFee, setLoadingFee] = useState(true);

  // Voucher state
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const { items, total: cartTotal, updateQty, closeCart, refreshCart } = useCart();
  const { profile } = useAuth();

  // Stall name from first item in cart
  const stallName =
    items[0]?.stallName || "Your selected stall";

  // You can either recompute subtotal here or just use cartTotal
  // You can either recompute subtotal here or just use cartTotal
  const subtotal = cartTotal;     // placeholder – adjust if needed

  const voucherApplied = selectedVoucher?.discountAmountCents
    ? selectedVoucher.discountAmountCents / 100
    : 0;
  const voucherIneligibleReason = selectedVoucher?.ineligibleReason || null;

  const total = subtotal + serviceFee - voucherApplied;

  const fetchVouchers = async () => {
    setLoadingVouchers(true);
    try {
      const res = await api.get('/vouchers/user');
      // Filter out used vouchers so they don't appear in the list
      const availableVouchers = res.data.filter(v => !v.isUsed && !v.used);
      setVouchers(availableVouchers);
    } catch (err) {
      console.error("Failed to fetch vouchers:", err);
    } finally {
      setLoadingVouchers(false);
    }
  };

  const handleOpenVoucherModal = () => {
    setShowVoucherModal(true);
    fetchVouchers();
  };

  const fetchPendingVoucher = useCallback(async () => {
    try {
      const res = await api.get('/vouchers/pending');
      const pendingVoucher = res.data?.voucher;
      setSelectedVoucher(pendingVoucher || null);
    } catch (err) {
      console.error("Failed to fetch pending voucher:", err);
    }
  }, []);

  const handleSelectVoucher = async (voucher) => {
    // Toggle selection: if already selected, deselect
    if (selectedVoucher && selectedVoucher.userVoucherId === voucher.userVoucherId) {
      try {
        await api.delete('/vouchers/pending');
        await fetchPendingVoucher();
        setShowVoucherModal(false);
      } catch (err) {
        console.error("Failed to clear voucher:", err);
        alert("Failed to clear voucher. Please try again.");
      }
    } else {
      try {
        // Call backend to apply voucher
        const res = await api.post(`/vouchers/apply/${voucher.userVoucherId}`);
        if (res.data.success) {
          await fetchPendingVoucher();
          setShowVoucherModal(false);
        }
      } catch (err) {
        const message = err?.response?.data?.error || "Failed to apply voucher. Please try again.";
        console.error("Failed to apply voucher:", err);
        alert(message);
      }
    }
  };

  useEffect(() => {
    async function fetchServiceFee() {
      try {
        const res = await api.get("/orders/serviceFees");
        console.log("Service Fees response:", res);
        // assuming backend returns { serviceFee: 2.0 }
        setServiceFee(res.data.serviceFeesCents / 100 || 0);
      } catch (err) {
        console.error("Failed to fetch service fee:", err);
        setServiceFee(0); // fallback to 0 or default
      } finally {
        setLoadingFee(false);
      }
    }

    fetchPendingVoucher();
    fetchServiceFee();
  }, [fetchPendingVoucher]);

  useEffect(() => {
    if (!selectedVoucher?.userVoucherId) return;
    fetchPendingVoucher();
  }, [cartTotal, selectedVoucher?.userVoucherId, fetchPendingVoucher]);


  async function Checkout() {
    try {
      console.log("Proceeding to checkout...");
      const res = await api.post("/orders/newOrder");

      if (res.status === 200) {
        const userId = profile?.id ?? null;
        const anonId = userId ? null : getOrCreateAnonId();
        const orderId = res.data?.orderId ?? null;

        if ((userId || anonId) && items.length > 0) {
          const events = items
            .filter((item) => item?.id)
            .map((item) => {
              const priceCents = Number.isFinite(item.price)
                ? Math.round(item.price * 100)
                : null;

              return {
                userId,
                anonId,
                eventType: "order",
                itemId: item.id,
                categoryId: item.categoryId || item.category || item.stallCuisine || null,
                metadata: {
                  source: "order",
                  orderId,
                  qty: item.qty,
                  priceCents,
                  stallId: item.stallId || null,
                  stallName: item.stallName || null,
                },
              };
            });

          if (events.length > 0) {
            trackEvents(events);
          }
        }
        // if backend clears cart on newOrder, then sync front-end
        await refreshCart();
        closeCart();
        navigate(`/makepayment/${res.data.orderId}`);
      } else {
        console.error("Failed to create order:", res);
      }
    } catch (err) {
      console.error("Checkout error:", err);
    }
  }

  // If cart is empty, you can show a friendly message
  if (!items.length) {
    return (
      <div className="min-h-screen bg-[#F4FAF1] flex justify-center py-6">
        <div className="w-full max-w-5xl bg-white shadow-sm border border-[#E4E4E4] mx-4">
          <header className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E4]">
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
              onClick={() => navigate(-1)}
            >
              <span className="text-xl">&lt;</span>
            </button>

            <h1 className="text-xl font-semibold ml-4 flex-1">
              Order Summary
            </h1>

            <img
              src={LogoImage}
              alt="Eatable Logo"
              className="h-10 object-contain"
            />
          </header>

          <div className="px-6 py-10 text-center text-gray-600">
            Your cart is empty. Add some items first!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4FAF1] flex justify-center py-6">
      <div className="w-full max-w-5xl bg-white shadow-sm border border-[#E4E4E4] mx-4">
        {/* HEADER */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E4]">
          {/* Back button */}
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
            onClick={() => navigate(-1)}
          >
            <span className="text-xl">&lt;</span>
          </button>

          {/* Left-aligned title */}
          <h1 className="text-xl font-semibold ml-4 flex-1">
            Order Summary ({stallName})
          </h1>

          {/* Bigger logo */}
          <img
            src={LogoImage}
            alt="Eatable Logo"
            className="h-10 object-contain"
          />
        </header>

        {/* ITEMS */}
        <section className="px-6 pt-4 pb-6 space-y-4">
          {items.map((item) => (
            <div
              key={item.cartId}
              className="flex items-center bg-white border border-[#E4E4E4] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] px-4 py-3"
            >
              <img
                src={item.img}
                alt={item.name}
                className="w-20 h-20 rounded-lg object-cover mr-4"
              />

              <div className="flex-1">
                <p className="font-semibold text-[15px]">{item.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  * {item.notes || "No special instructions"}
                </p>

                {/* Quantity pill */}
                <div className="mt-2">
                  <div className="inline-flex items-center bg-[#6C7F63] rounded-full px-1 py-0.5 gap-2">
                    {/* Minus circle */}
                    <button
                      className="w-5 h-5 flex items-center justify-center bg-white text-black rounded-full text-sm leading-none"
                      onClick={() => updateQty(item.cartId, item.qty - 1)}
                    >
                      –
                    </button>

                    {/* Quantity number */}
                    <span className="text-white font-medium text-sm px-1">
                      {item.qty}
                    </span>

                    {/* Plus circle */}
                    <button
                      className="w-5 h-5 flex items-center justify-center bg-white text-black rounded-full text-sm leading-none"
                      onClick={() => updateQty(item.cartId, item.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* PRICE */}
              <p className="text-lg font-semibold ml-4 whitespace-nowrap">
                $ {item.price.toFixed(2)}
              </p>
            </div>
          ))}
        </section>

        {/* VOUCHER BAR – LEFT ALIGNED */}
        <section className="border-y border-[#E4E4E4] bg-[#F8F8F8] py-4 px-6 flex">
          <button
            className="px-8 py-2 rounded-md text-white text-sm font-medium shadow-[0_4px_12px_rgba(33,66,27,0.25)] transition-all"
            style={{ backgroundColor: "#21421B" }}
            onClick={handleOpenVoucherModal}
          >
            {selectedVoucher ? "Change Voucher" : "Select Vouchers Available"}
          </button>
        </section>

        {/* SUMMARY */}
        <section className="px-6 py-6 border-b border-[#E4E4E4]">
          <div className="flex justify-between text-[15px] text-gray-800 mb-2">
            <span>Subtotal</span>
            <span>$ {subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-[15px] text-gray-900 font-semibold mb-2">
            <span>Service Fees</span>
            <span>
              {loadingFee ? "Loading..." : `$ ${serviceFee.toFixed(2)}`}
            </span>
          </div>

          <div className="flex justify-between text-[15px] text-gray-800 mb-2">
            <span>Applied Voucher {selectedVoucher && `(${selectedVoucher.code})`}</span>
            <span className={selectedVoucher ? "text-green-600" : ""}>
              - $ {voucherApplied.toFixed(2)}
            </span>
          </div>
          {voucherIneligibleReason && (
            <div className="text-xs text-red-500 mb-2">
              {voucherIneligibleReason}
            </div>
          )}
        </section>

        {/* TOTAL + BUTTON */}
        <section className="px-6 py-5 flex items-center justify-between">
          <div className="text-lg font-semibold">
            <span className="mr-2">Total</span>
            <span>$ {total.toFixed(2)}</span>
          </div>

          <button
            onClick={Checkout}
            disabled={!items.length}
            className="px-8 py-2 rounded-md text-white text-sm font-medium shadow-[0_4px_12px_rgba(33,66,27,0.25)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#21421B" }}
          >
            Proceed to Payment
          </button>
        </section>
      </div>

      {/* VOUCHER MODAL */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Select a Voucher</h2>
              <button
                onClick={() => setShowVoucherModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingVouchers ? (
                <p className="text-center text-gray-500">Loading vouchers...</p>
              ) : vouchers.length === 0 ? (
                <p className="text-center text-gray-500">No vouchers available.</p>
              ) : (
                vouchers.map((voucher) => {
                  const minSpend = voucher.minSpend / 100;
                  const isSelected = selectedVoucher?.userVoucherId === voucher.userVoucherId;

                  return (
                    <div
                      key={voucher.userVoucherId}
                      className={`border rounded-lg p-4 flex flex-col gap-2 cursor-pointer transition-colors ${isSelected
                        ? "border-[#21421B] bg-[#F4FAF1]"
                        : "border-gray-200 hover:border-[#21421B]"
                        }`}
                      onClick={() => handleSelectVoucher(voucher)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-[#21421B]">{voucher.code}</p>
                          <p className="text-sm text-gray-600">{voucher.description}</p>
                        </div>
                        {isSelected && (
                          <span className="text-[#21421B] font-bold">✓</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {voucher.discountType === 'percentage'
                          ? `${voucher.discountAmount}% off`
                          : `$${(voucher.discountAmount / 100).toFixed(2)} off`}
                        {minSpend > 0 && ` • Min. spend $${minSpend.toFixed(2)}`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setShowVoucherModal(false)}
                className="w-full py-2 rounded-md text-gray-600 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
