import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import logo_full from "../../assets/logo/logo_full.png";

const fallbackFoodImg =
  "https://app.yakun.com/media/catalog/product/cache/f77d76b011e98ab379caeb79cadeeecd/f/r/french-toast-with-kaya.jpg";

import qrImg from "../../assets/logo/QrPlaceholder.png";
import locationImg from "../../assets/logo/LocationIcon.png";
import clockImg from "../../assets/logo/Clock.png";
import api from "../../lib/api";

// helper to map raw order item -> UI item
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

export default function OrderCompletedModal({ onClose, orderId }) {
  const navigate = useNavigate();

  const [stall, setStall] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState(null);
  const [orderMeta, setOrderMeta] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);

  const handleClose = () => {
    if (onClose) onClose();
    else navigate(-1);
  };

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;
      try {
        setLoadingOrder(true);
        setOrderError(null);

        const res = await api.get(`/orders/getOrder/${orderId}`);
        const data = res.data;

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

  /** ESTIMATED PICK-UP TIME (from infoObj.estimatedReadyTime) */
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

  /** PRICES / TOTALS */
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const voucherApplied = 0.0; // keep static for now (or wire to backend later)

  let serviceFee = 0;
  let total = subtotal;

  if (orderInfo?.totalCents != null) {
    // Use backend total as the source of truth
    total = orderInfo.totalCents / 100;

    // Derive service fee from backend total - subtotal (+ voucher)
    const derived = total - subtotal + voucherApplied;
    serviceFee = derived > 0 ? derived : 0;
  } else {
    // fallback to previous hardcoded logic if backend total missing
    serviceFee = 2.0;
    total = subtotal + serviceFee - voucherApplied;
  }

  /** ORDER NUMBER (shortened for UI) */
  const orderNumberRaw = orderId || orderInfo?.id || "—";
  const displayOrderNumber =
    orderNumberRaw && orderNumberRaw.length > 24
      ? `${orderNumberRaw.slice(0, 8)}-${orderNumberRaw.slice(-4)}`
      : orderNumberRaw;

  /** ORDER STATUS (from backend) */
  const rawStatus = orderInfo?.status || "—";
  const displayStatus =
    typeof rawStatus === "string"
      ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()
      : rawStatus;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
  navigate("/home");
  if (onClose) onClose();
}}
    >
      <div
        className="relative bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)] rounded-xl w-[1182px] h-[829px] max-w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="w-[899px] h-10 left-[108px] top-[42px] absolute flex items-center text-neutral-900 text-3xl font-medium leading-8">
          Order Confirmation
        </div>

        <img
          className="w-24 h-24 left-[1003px] top-[12px] absolute object-contain"
          src={logo_full}
          alt="Eatable Logo"
        />

        <div className="w-[1056px] h-px left-[46px] top-[90.5px] absolute bg-black" />

        {/* MAIN TITLE */}
        <div className="w-[471px] h-10 left-[355px] top-[122px] absolute flex items-center justify-center text-neutral-900 text-3xl font-medium leading-8">
          Your food order has been placed!
        </div>

        {/* ORDER META LEFT SIDE */}
        <div className="w-80 h-10 left-[125px] top-[206px] absolute flex items-center text-black text-lg font-medium leading-8">
          Order Number:&nbsp;{displayOrderNumber || "—"}
        </div>
        <div className="w-80 h-10 left-[125px] top-[236px] absolute flex items-center text-black text-lg font-medium leading-8">
          Order Status:&nbsp; {displayStatus}
        </div>
        <div className="w-[320px] h-10 left-[125px] top-[266px] absolute flex items-center text-black text-sm font-normal leading-5">
          Placed on:&nbsp;{placedAtText}
        </div>

        {/* Stall name & address */}
        <div className="w-60 h-10 left-[169px] top-[304px] absolute flex items-center">
          <span className="block w-full text-neutral-900 text-xl font-semibold leading-8 truncate">
            {stallName}
          </span>
        </div>
        <div className="w-72 h-10 left-[169px] top-[328px] absolute flex items-center text-stone-400 text-base font-medium leading-8">
          {stall?.location || "Pick-up location will be shown here"}
        </div>

        {/* LOCATION ICON */}
        <img
          src={locationImg}
          alt="Location"
          className="w-7 h-7 left-[134px] top-[332px] absolute object-contain"
        />

        {/* Estimated pickup label + time */}
        <div className="w-60 h-10 left-[169px] top-[383px] absolute flex items-center text-neutral-900 text-xl font-semibold leading-8">
          Estimated Pick-Up Time
        </div>
        <div className="w-72 h-10 left-[169px] top-[408px] absolute flex items-center text-stone-400 text-base font-medium leading-8">
          {estimatedPickupText}
        </div>

        {/* CLOCK ICON */}
        <img
          src={clockImg}
          alt="Clock"
          className="w-7 h-7 left-[134px] top-[412px] absolute object-contain"
        />

        {/* Pick Up QR label + image */}
        <div className="w-28 h-10 left-[220px] top-[485px] absolute flex items-center justify-center text-neutral-900 text-xl font-semibold underline leading-8">
          Pick Up QR
        </div>
        <div className="w-[196px] h-[196px] left-[178px] top-[503px] absolute">
          <img
            src={qrImg}
            alt="Pick up QR"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Return button */}
        <button
          className="w-60 h-10 left-[159px] top-[708px] absolute bg-lime-900 rounded-[10px] text-center text-white text-lg leading-8 shadow-sm hover:bg-green-900"
          onClick={() => {
            navigate("/home");
            if (onClose) onClose();
          }}
        >
          Return to Homepage
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

          {/* Top divider */}
          <div className="w-full h-px bg-zinc-400" />

          {/* Items list area */}
          <div className="px-4 py-4 space-y-3 max-h-[230px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 text-center">
                No items found for this order.
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.img || fallbackFoodImg}
                      alt={item.name}
                      className="w-16 h-16 rounded-[5px] object-cover"
                    />
                    <div>
                      <div className="text-black text-base font-medium leading-5">
                        {item.name}
                      </div>
                      <div className="text-black text-base leading-5">
                        x{item.qty}
                      </div>
                    </div>
                  </div>
                  <div className="text-black text-base font-medium leading-5">
                    ${" "}
                    {(item.price * item.qty).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Divider above totals */}
          <div className="w-full h-px bg-zinc-400 mt-2" />

          {/* Totals block */}
          <div className="px-8 pt-3 pb-2 text-neutral-900 text-base font-medium leading-8 space-y-1.5">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Service Fees</span>
              <span>$ {serviceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Applied Voucher</span>
              <span>- $ {voucherApplied.toFixed(2)}</span>
            </div>
          </div>

          {/* Divider above TOTAL line */}
          <div className="w-full h-px bg-zinc-400" />

          <div className="px-8 py-3 flex justify-between text-neutral-900 text-base font-medium leading-8">
            <span>Total</span>
            <span>$ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Error / loading overlay text */}
        {loadingOrder && (
          <div className="absolute left-1/2 -translate-x-1/2 top-[170px] text-sm text-gray-500">
            Loading order details…
          </div>
        )}
        {orderError && (
          <div className="absolute left-1/2 -translate-x-1/2 top-[170px] text-sm text-red-500">
            {orderError}
          </div>
        )}
      </div>
    </div>
  );
}
