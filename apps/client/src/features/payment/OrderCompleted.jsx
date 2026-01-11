import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import logo_full from "../../assets/logo/logo_full.png";

const fallbackFoodImg =
  "https://app.yakun.com/media/catalog/product/cache/f77d76b011e98ab379caeb79cadeeecd/f/r/french-toast-with-kaya.jpg";

import qrImg from "../../assets/logo/QrPlaceholder.png";
import locationImg from "../../assets/logo/LocationIcon.png";
import clockImg from "../../assets/logo/Clock.png";
import api from "../../lib/api";

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

function generateOrderCode(orderId) {
  if (!orderId || orderId === "—") return "—";
  const hash = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `EA-${hash}`;
}

export default function OrderCompletedModal({ onClose, orderId: propsOrderId }) {
  const navigate = useNavigate();
  const { orderid: urlOrderId } = useParams();
  
  const orderId = propsOrderId || urlOrderId;

  const [stall, setStall] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState(null);
  const [orderMeta, setOrderMeta] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;
      try {
        setLoadingOrder(true);
        setOrderError(null);

        const res = await api.get(`/orders/getOrder/${orderId}`);
        const data = res.data;

        console.log("Raw order data received:", data);

        // data = [stallWrapper, itemsArr, infoObj]
        const stallWrapper = Array.isArray(data) ? data[0] : null;
        const stallObj = stallWrapper?.stall ?? null;
        const itemsArr =
          Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
        const infoObj = Array.isArray(data) ? data[2] : null;

        console.log("Fetched order details:", { stallObj, itemsArr, infoObj });

        setStall(stallObj);
        setItems(itemsArr.map(mapOrderItem));
        setOrderMeta(stallWrapper || null);
        setOrderInfo(infoObj || null);
      } catch (err) {
        console.error(err);
        setOrderError("Failed to load order details.");
      } finally {
        setLoadingOrder(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  const stallName =
    stall?.name || (items.length ? "Your selected stall" : "No stall found");

  /** ORDER PLACED / CREATED TIME (from backend) */
  const placedAtRaw =
    orderInfo?.createdAt ||
    orderInfo?.created_at ||
    orderMeta?.placedAt ||
    orderMeta?.createdAt ||
    orderMeta?.created_at;

  let placedAtText = "—";
  if (placedAtRaw) {
    const d = new Date(placedAtRaw);
    if (!isNaN(d.getTime())) {
      placedAtText = d.toLocaleString("en-SG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
  }

  const estimatedRaw =
    orderInfo?.estimatedReadyTime || orderInfo?.estimated_ready_time;
  let estimatedPickupText = "Awaiting stall confirmation";

  if (estimatedRaw) {
    const d = new Date(estimatedRaw);
    if (!isNaN(d.getTime())) {
      const timeStr = d.toLocaleTimeString("en-SG", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      estimatedPickupText = `Around ${timeStr}`;
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const voucherApplied = 0.0;

  const serviceFee =
    orderInfo?.discounts_charges?.find((dc) => dc.type === "fee")?.amountCents /
      100 || 0;

  const total =
    orderInfo?.totalCents != null
      ? orderInfo.totalCents / 100
      : subtotal + serviceFee - voucherApplied;

  const orderNumberRaw = orderId || orderInfo?.id || "—";
  const displayOrderCode = generateOrderCode(orderNumberRaw);

  const rawStatus = orderInfo?.status || "—";
  const displayStatus =
    typeof rawStatus === "string"
      ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()
      : rawStatus;

  const handleClose = () => {
    navigate("/home");
    if (onClose) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h1 className="text-2xl font-semibold text-gray-900">
            Your Order Has Been Confirmed
          </h1>
          <img
            className="h-10 object-contain"
            src={logo_full}
            alt="Eatable Logo"
          />
        </div>

        {/* Loading/Error States */}
        {loadingOrder && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <p className="text-gray-500">Loading order details…</p>
          </div>
        )}
        {orderError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <p className="text-red-500">{orderError}</p>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6 p-6">
          {/* Left Column - Order Info */}
          <div className="flex-1 space-y-4">
            {/* Order Meta Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-medium">Order Code:</span>
                <span className="text-gray-900 font-semibold text-lg tracking-wide">
                  {displayOrderCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-medium">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  {displayStatus}
                </span>
              </div>
              <p className="text-sm text-gray-500">Placed on: {placedAtText}</p>
            </div>

            {/* Stall Info */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <img
                src={locationImg}
                alt="Location"
                className="w-5 h-5 mt-0.5 object-contain"
              />
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {stallName}
                </h3>
                <p className="text-gray-500 text-sm">
                  {stall?.location || "Pick-up location will be shown here"}
                </p>
              </div>
            </div>

            {/* Estimated Pickup Time */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <img
                src={clockImg}
                alt="Clock"
                className="w-5 h-5 mt-0.5 object-contain"
              />
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Estimated Pick-Up Time
                </h3>
                <p className="text-gray-500 text-sm">{estimatedPickupText}</p>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl">
              <h3 className="text-base font-semibold text-gray-900 underline mb-2">
                Pick Up QR
              </h3>
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <img
                  src={qrImg}
                  alt="Pick up QR"
                  className="w-64 h-64 object-contain"
                />
              </div>
            </div>

            {/* Return Button */}
            <button
              className="w-full py-2.5 bg-lime-800 hover:bg-lime-900 text-white font-medium rounded-xl transition-colors shadow-sm"
              onClick={handleClose}
            >
              Return to Homepage
            </button>
          </div>

          {/* Right Column - Order Details Card */}
          <div className="flex-1 lg:max-w-md">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden h-full flex flex-col">
              {/* Card Header */}
              <div className="px-6 py-4 text-center border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  Order Details
                </h3>
                <p className="text-gray-600 mt-1">{stallName}</p>
              </div>

              {/* Items List */}
              <div className="flex-1 px-6 py-4 overflow-y-auto max-h-64">
                {items.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No items found for this order.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <img
                            src={item.img || fallbackFoodImg}
                            alt={item.name}
                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-gray-500 text-sm">x{item.qty}</p>
                          </div>
                        </div>
                        <span className="font-medium text-gray-900 flex-shrink-0">
                          ${(item.price * item.qty).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals Section */}
              <div className="border-t border-gray-200">
                <div className="px-6 py-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Service Fees</span>
                    <span>${serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Applied Voucher</span>
                    <span>-${voucherApplied.toFixed(2)}</span>
                  </div>
                </div>
                <div className="px-6 py-3 flex justify-between font-semibold text-gray-900 border-t border-gray-200">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
