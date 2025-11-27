import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";

import NetsLogo from "../../assets/payment/netsQrLogo.png";
import NetsQrPopup from "./NetsQrPopup";
import OrderCompletedModal from "./OrderCompleted"; // ⭐ NEW IMPORT
import api from "../../lib/api";

// Helper: map raw orderItem -> UI-friendly item
function mapOrderItem(raw) {
  const mi = raw.menuItem || {};

  const qty = Number(raw.quantity ?? 1);

  const priceCents =
    typeof raw.unitCents === "number"
      ? raw.unitCents
      : typeof mi.priceCents === "number"
        ? mi.priceCents
        : 0;

  const price = priceCents / 100;

  // If you ever include mediaUploads on menuItem, this will work too
  const topUpload = Array.isArray(mi.mediaUploads) ? mi.mediaUploads[0] : null;

  return {
    id: raw.id,
    name: mi.name || "Unnamed item",
    qty,
    notes: raw.request || "",
    price,
    img:
      topUpload?.imageUrl ||
      topUpload?.image_url ||
      mi.imageUrl ||
      mi.image_url ||
      null,
  };
}

export default function MakePayment() {
  const { orderid } = useParams();
  const orderId = orderid;
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState("card"); // "card" | "netsqr"
  const [showNetsModal, setShowNetsModal] = useState(false);

  const [stall, setStall] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState(null);

  const [orderInfo, setOrderInfo] = useState(null);
  const [voucherInfo, setVoucherInfo] = useState(null);

  // ⭐ NEW STATE
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [shouldShowSuccessAfterClose, setShouldShowSuccessAfterClose] = useState(false);

  const isCard = paymentMethod === "card";
  const isNets = paymentMethod === "netsqr";

  // ───────────────────────────────
  // Fetch order + items
  // ───────────────────────────────
  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoadingOrder(true);
        setOrderError(null);

        const res = await api.get(`/orders/getOrder/${orderId}`);
        const data = res.data;
        console.log("Fetched order data:", data);

        // Now expecting: [ { stall: {...} }, [ orderItems... ], infoObj ]
        const stallWrapper = Array.isArray(data) ? data[0] : null;
        const stallObj = stallWrapper?.stall ?? null;
        const itemsArr =
          Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
        const infoObj = Array.isArray(data) ? data[2] : null;

        // ⭐ NEW: if already PAID, redirect to home immediately
        if (infoObj?.status === "PAID") {
          console.log("Order already PAID, redirecting to home.");
          navigate("/home");
          return; // stop further state updates
        }

        setStall(stallObj);
        setItems(itemsArr.map(mapOrderItem));
        setOrderInfo(infoObj || null);

        // Fetch voucher info if there's a voucher discount
        const voucherDiscount = infoObj?.discounts_charges?.find(dc => dc.type === "voucher");
        if (voucherDiscount?.userVoucherId) {
          try {
            // Fetch all user vouchers to find the one used
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
      } catch (err) {
        console.error("Failed to load order:", err);
        setOrderError("Failed to load order details");
      } finally {
        setLoadingOrder(false);
      }
    }

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, navigate]); // ⭐ include navigate in deps

  // Derived values
  const stallName =
    stall?.name || (items.length ? "Your selected stall" : "No stall found");

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);

  // Extract service fee from orderInfo.discounts_charges where type === "fee"
  const serviceFee = orderInfo?.discounts_charges?.find(dc => dc.type === "fee")?.amountCents / 100 || 0;

  // Extract voucher discount from orderInfo.discounts_charges where type === "voucher"
  const voucherDiscount = orderInfo?.discounts_charges?.find(dc => dc.type === "voucher");
  const voucherApplied = voucherDiscount?.amountCents / 100 || 0;

  const total = orderInfo?.totalCents / 100 || 0;


  const handleSelectCard = () => {
    setPaymentMethod("card");
    setShowNetsModal(false);
  };

  const handleSelectNets = () => {
    setPaymentMethod("netsqr");
  };

  const handleNext = () => {
    if (paymentMethod === "card") {
      // you might redirect to another page later, for now this is a no-op or refresh
      navigate(`/makepayment/${orderId}`);
    } else if (paymentMethod === "netsqr") {
      setShowNetsModal(true);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FDF3]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white mt-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)}>
            <span className="text-3xl">&#x2039;</span>
          </button>
          <h1 className="text-2xl font-semibold">Make Payment</h1>
        </div>

        <hr className="border-gray-300 mb-8" />

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* LEFT SIDE — PAYMENT METHODS */}
          <div className="order-2 lg:order-1">
            <h2 className="text-xl font-semibold mb-6">
              Choose your payment method
            </h2>

            <div className="space-y-4 max-w-md">
              {/* CARD OPTION ROW */}
              <button
                type="button"
                onClick={handleSelectCard}
                className="flex items-center gap-3 w-full text-left hover:bg-gray-50 rounded-lg px-2 py-2 transition"
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isCard ? "border-blue-500" : "border-gray-300"
                    }`}
                >
                  {isCard && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>

                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg"
                  className="h-8"
                />
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                  className="h-8"
                />
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg"
                  className="h-8"
                />
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQslI5EhEGQeZ15bfFh7Esho6L9BqRev8s9EQ&s"
                  className="h-8"
                />
              </button>

              {/* Card inputs */}
              <input
                placeholder="Name"
                className="w-full border rounded-md px-4 py-2"
              />
              <input
                placeholder="Postal code"
                className="w-full border rounded-md px-4 py-2"
              />
              <input
                placeholder="Card number"
                className="w-full border rounded-md px-4 py-2"
              />

              <div className="flex gap-4">
                <input
                  placeholder="Exp"
                  className="w-full border rounded-md px-4 py-2"
                />
                <input
                  placeholder="CVV"
                  className="w-full border rounded-md px-4 py-2"
                />
              </div>

              {/* NETS QR OPTION */}
              <button
                type="button"
                onClick={handleSelectNets}
                className="pt-6 flex items-center gap-3 w-full text-left hover:bg-gray-50 rounded-lg px-2 py-2 transition"
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isNets ? "border-blue-500" : "border-gray-300"
                    }`}
                >
                  {isNets && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>

                <img src={NetsLogo} className="h-20" />
              </button>
            </div>
          </div>

          {/* RIGHT SIDE — ORDER SUMMARY */}
          <div className="order-1 lg:order-2">
            <div
              className="border rounded-xl p-6 shadow-sm 
                h-[300px] overflow-y-auto 
                sm:h-[350px] 
                lg:h-[470px]"
            >
              {/* --- Stall info + items go here --- */}

              {loadingOrder && (
                <p className="text-gray-500 text-sm">Loading order…</p>
              )}

              {orderError && (
                <p className="text-red-500 text-sm">{orderError}</p>
              )}

              {!loadingOrder && !orderError && (
                <>
                  {/* Stall info section */}
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">
                      {stallName}
                    </h2>
                    {stall && (
                      <>
                        {stall.description && (
                          <p className="text-sm text-gray-700 mt-1">
                            {stall.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {stall.location}
                        </p>
                        {stall.cuisineType && (
                          <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-green-50 text-green-800 border border-green-200">
                            {stall.cuisineType}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <hr className="border-gray-200 my-3" />

                  {/* Order items section */}
                  {items.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No items found for this order.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center bg-white border border-[#E4E4E4] rounded-xl px-3 py-2"
                        >
                          {item.img && (
                            <img
                              src={item.img}
                              alt={item.name}
                              className="w-14 h-14 rounded-lg object-cover mr-3"
                            />
                          )}

                          <div className="flex-1">
                            <p className="font-semibold text-[14px]">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Qty: {item.qty}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                * {item.notes}
                              </p>
                            )}
                          </div>

                          <p className="text-[14px] font-semibold ml-3 whitespace-nowrap">
                            $ {item.price.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="mt-6 border-t pt-4 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Subtotal</span>
                      <span>$ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-800 font-medium">
                        Service Fees
                      </span>
                      <span>$ {serviceFee.toFixed(2)}</span>
                    </div>

                    {voucherApplied > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">
                          Applied Voucher {voucherInfo && `(${voucherInfo.code})`}
                        </span>
                        <span className="text-green-600">- $ {voucherApplied.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t mt-2 text-base font-semibold">
                      <span>Total</span>
                      <span>$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Desktop / large screens: button under summary */}
            <div className="mt-6 flex justify-end hidden lg:flex">
              <button
                className="bg-green-800 text-white px-8 py-2 rounded-lg hover:bg-green-900"
                onClick={handleNext}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Mobile / small screens: button at bottom of page */}
        <div className="mt-6 flex justify-end lg:hidden">
          <button
            className="bg-green-800 text-white px-8 py-2 rounded-lg w-full sm:w-auto hover:bg-green-900"
            onClick={handleNext}
          >
            Next
          </button>
        </div>
      </div>

      {/* NETS QR POPUP MODAL */}
      <NetsQrPopup
        isOpen={showNetsModal}
        amount={total.toFixed(2)}   // 🔹 now uses real total
        orderId={orderId}
        onClose={() => {
          setShowNetsModal(false);
          // ⭐ AFTER SUCCESS POPUP IS CLOSED, SHOW ORDER SUCCESS POPUP
          if (shouldShowSuccessAfterClose) {
            setShowOrderSuccess(true);
            setShouldShowSuccessAfterClose(false);
          }
        }}
        onSuccess={(data) => {
          console.log("NETS success:", data);
          // navigate(`/order-success/${orderId}`);
          // ⭐ MARK THAT AFTER USER CLOSES THE NETS POPUP,
          //    WE SHOULD SHOW THE ORDER SUCCESS POPUP
          setShouldShowSuccessAfterClose(true);
        }}
        onFail={(data) => {
          console.log("NETS failed:", data);
        }}
      />

      {/* ORDER SUCCESS POPUP (AFTER CLOSING NETS SUCCESS POPUP) */}
      {showOrderSuccess && (
        <OrderCompletedModal orderId={orderId} onClose={() => setShowOrderSuccess(false)} />
      )}
    </div>
  );
}
