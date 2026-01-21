import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ClockFading, MapPin } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react"; // Added Import
import logo_full from "../../../assets/logo/logo_full.png";


const fallbackFoodImg =
  "https://app.yakun.com/media/catalog/product/cache/f77d76b011e98ab379caeb79cadeeecd/f/r/french-toast-with-kaya.jpg";

// --- Helper Functions ---
function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60 * 1000);
}

function fmtTimeHM(date) {
  return date.toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function generateOrderCode(orderId) {
  if (!orderId || orderId === "—") return "—";
  const hash = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `EA-${hash}`;
}

export default function OrderDetailsModal({ order, onClose }) {
  const navigate = useNavigate();

  if (!order) return null;

  const {
    id: orderId,
    status,
    orderStatus,
    stall,
    orderItems,
    createdAt,
    estimatedReadyTime,
    totalCents,
    discounts_charges,
    estimatedMinutes,
    defaultEstimateMinutes,
    acceptedAt: acceptedAtRaw,
  } = order;

  // Compute timing values
  const estimateMins = estimatedMinutes ?? defaultEstimateMinutes ?? 0;
  const acceptedAt = acceptedAtRaw ? new Date(acceptedAtRaw) : null;

  // UPDATED LOGIC
  const BUFFER_MINS = 5;
  const startTime =
    acceptedAt && estimateMins > 0 ? addMinutes(acceptedAt, estimateMins) : null;
  const endTime = startTime ? addMinutes(startTime, BUFFER_MINS) : null;

  const stallName = stall?.name || "Unknown Stall";
  const stallLocation = stall?.location || "Location not available";

  // Format dates
  const placedAtDate = new Date(createdAt);
  const placedAtText = !isNaN(placedAtDate)
    ? placedAtDate.toLocaleString("en-SG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

const collectedAtRaw =
  order?.collectedAt || order?.collected_at || order?.completedAt || order?.completed_at;
const collectedAtDate = collectedAtRaw ? new Date(collectedAtRaw) : null;

const collectedAtText =
  collectedAtDate && !isNaN(collectedAtDate)
    ? collectedAtDate.toLocaleString("en-SG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";


  // UPDATED LOGIC
  let estimatedPickupText = "Awaiting stall confirmation";
  if (acceptedAt && estimateMins > 0) {
    const ready = addMinutes(acceptedAt, estimateMins);
    estimatedPickupText = `Around ${fmtTimeHM(ready)}`;
  } else if (estimatedReadyTime) {
    const d = new Date(estimatedReadyTime);
    if (!isNaN(d)) estimatedPickupText = `Around ${fmtTimeHM(d)}`;
  }

  // Calculate totals
  const subtotal =
    orderItems?.reduce((sum, item) => sum + item.unitCents, 0) / 100 || 0;

  const serviceFee =
    discounts_charges?.find((dc) => dc.type === "fee")?.amountCents / 100 || 0;

  const voucherDiscount = discounts_charges?.find((dc) => dc.type === "voucher");
  const voucherApplied = voucherDiscount?.amountCents / 100 || 0;

  const total = totalCents
    ? totalCents / 100
    : subtotal + serviceFee - voucherApplied;

  const voucherInfo = voucherDiscount?.userVoucher?.voucher;
  const displayOrderCode = generateOrderCode(orderId);
  const rawStatus = status || "—";
  const displayStatus =
    typeof rawStatus === "string"
      ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()
      : rawStatus;

  const getStatusBadgeClass = () => {
    const s = status?.toLowerCase();
    if (s === "completed" || s === "paid") return "bg-green-100 text-green-800";
    if (s === "pending") return "bg-yellow-100 text-yellow-800";
    if (s === "cancelled") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const payment = status?.toLowerCase();
  const os = (orderStatus || "awaiting").toLowerCase();
  const isPaid = payment === "completed" || payment === "paid";
  const isPreparing = isPaid && os === "preparing";
  const isCollected = isPaid && os === "collected";
  const isPending = payment === "pending";
  const isReady = isPaid && os === "ready";
const pickupToken = order?.pickupToken || order?.pickup_token || null;

  // Added Constants
const canShowQr = isPaid && (os === "preparing" || os === "ready") && pickupToken;

const qrValue = canShowQr
  ? JSON.stringify({ orderId: String(orderId), token: pickupToken })
  : null;


  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Order Details
          </h1>
          <img
            className="h-8 md:h-10 object-contain"
            src={logo_full}
            alt="Eatable Logo"
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-4 p-3 md:p-4">
          {/* Left Column - Order Info */}
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-medium">Order Code:</span>
                <span className="text-gray-900 font-semibold text-lg tracking-wide">
                  {displayOrderCode}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-medium">Status:</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusBadgeClass()}`}
                >
                  {displayStatus}
                </span>
              </div>

              <p className="text-sm text-gray-500">Placed on: {placedAtText}</p>

              {(status?.toLowerCase() === "completed" ||
                (orderStatus || "").toLowerCase() === "collected") && (
                <p className="text-sm text-gray-500">
                  Collected on: {collectedAtText}
                </p>
              )}
            </div>

            {/* Stall Info */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <MapPin
                className="w-5 h-5 mt-0.5 text-[#21421B]"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {stallName}
                </h3>
                <p className="text-gray-500 text-sm">{stallLocation}</p>
              </div>
            </div>

            {/* Estimated Pickup Time / Status */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <ClockFading
                className="w-5 h-5 mt-0.5 text-[#21421B]"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {isReady
                    ? "Ready for pick up"
                    : isPreparing
                    ? "Preparing your order.."
                    : "Estimated Pick-Up Time"}
                </h3>

                <div className="text-gray-500 text-sm">
                  {isReady || isPreparing ? (
                    <div className="text-gray-600">
                      <div className="text-sm text-gray-500">
                        Estimated duration: {estimateMins} mins
                      </div>

                      {startTime && endTime ? (
                        <div className="text-sm text-gray-500">
                          {fmtTimeHM(startTime)} - {fmtTimeHM(endTime)}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    estimatedPickupText
                  )}
                </div>
              </div>
            </div>

            {/* Pick Up QR */}
            <div className="flex flex-col items-center justify-center pt-4 pb-2 px-2 bg-gray-50 rounded-xl">
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Pick Up QR
              </h3>

              {qrValue ? (
                <QRCodeCanvas value={qrValue} size={224} />
              ) : isCollected ? (
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg bg-gray-200 flex items-center justify-center px-4 text-center">
                  <p className="text-green-800 text-sm font-medium">
                    This order has been collected.
                  </p>
                </div>
              ) : (
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg bg-gray-200 flex items-center justify-center px-4 text-center">
                  <p className="text-gray-600 text-sm">
                    QR will be available once the order is accepted.
                  </p>
                </div>
              )}
            </div>

            {isPending && (
              <button
                className="w-full py-2.5 bg-[#21421B] hover:bg-[#162e12] text-white font-medium rounded-xl transition-colors shadow-sm"
                onClick={() => navigate(`/makepayment/${orderId}`)}
              >
                Make Payment
              </button>
            )}

            <button
              className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-xl transition-colors shadow-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          {/* Right Column - Order Details Card */}
          <div className="flex-1 lg:max-w-md">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden h-full flex flex-col">
              <div className="px-6 py-4 text-center border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  Order Details
                </h3>
                <p className="text-gray-600 mt-1">{stallName}</p>
              </div>

              <div className="flex-1 px-4 md:px-6 py-4 overflow-y-auto max-h-64">
                {orderItems?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No items found for this order.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {orderItems?.map((item) => {
                      const qty = Number(item.quantity ?? 1);
                      const menuPriceCents =
                        typeof item.menuItem?.priceCents === "number"
                          ? item.menuItem.priceCents
                          : typeof item.menuItem?.price_cents === "number"
                          ? item.menuItem.price_cents
                          : null;

                      const rawUnitCents =
                        typeof item.unitCents === "number"
                          ? item.unitCents
                          : typeof item.unit_cents === "number"
                          ? item.unit_cents
                          : null;

                      const unitPriceCents = Number.isFinite(menuPriceCents)
                        ? menuPriceCents
                        : Number.isFinite(rawUnitCents) && qty > 0
                        ? Math.round(rawUnitCents / qty)
                        : 0;

                      const lineTotalCents = unitPriceCents * qty;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <img
                              src={
                                item.menuItem?.mediaUploads?.[0]?.imageUrl ||
                                item.menuItem?.image_url ||
                                fallbackFoodImg
                              }
                              alt={item.menuItem?.name}
                              className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover flex-shrink-0"
                            />

                            <div className="min-w-0 w-full">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium text-gray-900 flex-shrink-0">
                                  x{Number(item.quantity ?? 1)}
                                </span>
                                <p className="font-medium text-gray-900 truncate">
                                  {item.menuItem?.name || "Unknown Item"}
                                </p>
                              </div>
                              {item.request?.trim() ? (
                                <p className="text-gray-500 text-sm truncate">
                                  * {item.request}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <span className="font-medium text-gray-900 flex-shrink-0">
                            ${(lineTotalCents / 100).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200">
                <div className="px-4 md:px-6 py-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Service Fees</span>
                    <span>${serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>
                      Applied Voucher
                      {voucherInfo?.code ? ` (${voucherInfo.code})` : ""}
                    </span>
                    <span>-{voucherApplied.toFixed(2)}</span>
                  </div>
                </div>
                <div className="px-4 md:px-6 py-3 flex justify-between font-semibold text-gray-900 border-t border-gray-200">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}