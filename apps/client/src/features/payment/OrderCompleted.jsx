import { useNavigate, useParams } from "react-router-dom"
import { useEffect, useMemo, useRef, useState } from "react"
import { ClockFading, MapPin } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"
import logo_full from "../../assets/logo/logo_full.png"
import api from "@lib/api"

const fallbackFoodImg =
  "https://app.yakun.com/media/catalog/product/cache/f77d76b011e98ab379caeb79cadeeecd/f/r/french-toast-with-kaya.jpg"

function mapOrderItem(raw) {
  const mi = raw.menuItem || {}
  const qty = Number(raw.quantity ?? 1)

  const menuPriceCents =
    typeof mi.priceCents === "number"
      ? mi.priceCents
      : typeof mi.price_cents === "number"
        ? mi.price_cents
        : null

  const rawUnitCents =
    typeof raw.unitCents === "number"
      ? raw.unitCents
      : typeof raw.unit_cents === "number"
        ? raw.unit_cents
        : null

  const unitPriceCents = Number.isFinite(menuPriceCents)
    ? menuPriceCents
    : Number.isFinite(rawUnitCents) && qty > 0
      ? Math.round(rawUnitCents / qty)
      : 0

  const lineTotalCents = unitPriceCents * qty
  const topUpload = Array.isArray(mi.mediaUploads) ? mi.mediaUploads[0] : null

  return {
    id: raw.id,
    name: mi.name || "Unnamed item",
    qty,
    notes: raw.request || "",
    unitPrice: unitPriceCents / 100,
    lineTotal: lineTotalCents / 100,
    img:
      topUpload?.imageUrl ||
      topUpload?.image_url ||
      mi.imageUrl ||
      mi.image_url ||
      null,
  }
}

function generateOrderCode(orderId, orderCode) {
  if (orderCode) return `EA-${String(orderCode).toUpperCase()}`
  if (!orderId || orderId === "—") return "—"
  const hash = String(orderId).replace(/-/g, "").slice(0, 8).toUpperCase()
  return `EA-${hash}`
}

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60 * 1000)
}

function fmtTimeHM(date) {
  return date.toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export default function OrderCompletedModal({
  onClose,
  orderId: propsOrderId,
  activeOrderIds: propsActiveOrderIds,
}) {
  const navigate = useNavigate()
  const { orderid: urlOrderId } = useParams()

  const orderId = propsOrderId || urlOrderId

  const initialActiveIds = useMemo(() => {
    if (Array.isArray(propsActiveOrderIds) && propsActiveOrderIds.length > 0) {
      return propsActiveOrderIds
    }
    return orderId ? [orderId] : []
  }, [propsActiveOrderIds, orderId])

  const [activeOrderIds, setActiveOrderIds] = useState(initialActiveIds)
  const [activeIndex, setActiveIndex] = useState(0)

  const [stall, setStall] = useState(null)
  const [items, setItems] = useState([])
  const [loadingOrder, setLoadingOrder] = useState(true)
  const [orderError, setOrderError] = useState(null)
  const [orderMeta, setOrderMeta] = useState(null)
  const [orderInfo, setOrderInfo] = useState(null)

  // ✅ collected popup + polling
  const [showCollectedPopup, setShowCollectedPopup] = useState(false)
  const prevCollectedRef = useRef(false)
  const pollingRef = useRef(null)

  // ✅ Prevent dispatching payment event multiple times per order
  const paymentDispatchedForRef = useRef(new Set())

  const hasMany = activeOrderIds.length > 1

  useEffect(() => {
    setActiveIndex((i) => {
      if (activeOrderIds.length === 0) return 0
      return Math.min(Math.max(0, i), activeOrderIds.length - 1)
    })
  }, [activeOrderIds.length])

  const currentOrderId = useMemo(() => {
    if (activeOrderIds.length > 0) return activeOrderIds[activeIndex]
    return orderId
  }, [activeOrderIds, activeIndex, orderId])

  useEffect(() => {
    return () => {
      document.body.style.overflow = "unset"
      document.body.style.pointerEvents = "auto"
      document.documentElement.style.overflow = "unset"
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function ensureActiveIds() {
      if (Array.isArray(propsActiveOrderIds) && propsActiveOrderIds.length > 0) return
      if (orderId) return

      try {
        const res = await api.get("/orders/my")
        const data = res.data
        const orders = Array.isArray(data)
          ? data
          : Array.isArray(data?.orders)
            ? data.orders
            : []

        const active = orders.filter((o) => {
          const pay = String(o.status || "").toUpperCase()
          const os = String(o.orderStatus || "").toLowerCase()
          return (pay === "PAID" || pay === "COMPLETED") && (os === "preparing" || os === "ready")
        })

        const ids = active.map((o) => o.id)

        if (!mounted) return
        setActiveOrderIds(ids)
        setActiveIndex(0)
      } catch {
        if (!mounted) return
        setActiveOrderIds([])
        setActiveIndex(0)
      }
    }

    ensureActiveIds()
    return () => {
      mounted = false
    }
  }, [orderId, propsActiveOrderIds])

  useEffect(() => {
    let mounted = true

    async function fetchOrder() {
      if (!currentOrderId) return
      try {
        setLoadingOrder(true)
        setOrderError(null)

        const res = await api.get(`/orders/getOrder/${currentOrderId}`)
        const data = res.data

        const stallWrapper = Array.isArray(data) ? data[0] : null
        const stallObj = stallWrapper?.stall ?? null
        const itemsArr = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : []
        const infoObj = Array.isArray(data) ? data[2] : null

        if (!mounted) return
        setStall(stallObj)
        setItems(itemsArr.map(mapOrderItem))
        setOrderMeta(stallWrapper || null)
        setOrderInfo(infoObj || null)
      } catch (err) {
        console.error(err)
        if (!mounted) return
        setOrderError("Failed to load order details.")
      } finally {
        if (mounted) setLoadingOrder(false)
      }
    }

    fetchOrder()
    return () => {
      mounted = false
    }
  }, [currentOrderId])

  const stallName =
    stall?.name || (items.length ? "Your selected stall" : "No stall found")

  const placedAtRaw =
    orderInfo?.createdAt ||
    orderInfo?.created_at ||
    orderMeta?.placedAt ||
    orderMeta?.createdAt ||
    orderMeta?.created_at

  let placedAtText = "—"
  if (placedAtRaw) {
    const d = new Date(placedAtRaw)
    if (!isNaN(d.getTime())) {
      placedAtText = d.toLocaleString("en-SG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    }
  }

  // ✅ Timing Logic Correction
  const BUFFER_MINS = 5
  const acceptedAtRaw =
    orderInfo?.acceptedAt ||
    orderInfo?.accepted_at ||
    orderMeta?.acceptedAt ||
    orderMeta?.accepted_at

  const estimateMins =
    orderInfo?.estimatedMinutes ??
    orderInfo?.estimated_minutes ??
    orderMeta?.estimatedMinutes ??
    orderMeta?.estimated_minutes ??
    orderInfo?.defaultEstimateMinutes ??
    orderMeta?.defaultEstimateMinutes ??
    0

  const acceptedAt = acceptedAtRaw ? new Date(acceptedAtRaw) : null
  const acceptedAtValid = acceptedAt && !isNaN(acceptedAt.getTime())
  const estimate = Number(estimateMins)
  const estimateValid = Number.isFinite(estimate) && estimate > 0

  const readyAt =
    acceptedAtValid && estimateValid ? addMinutes(acceptedAt, estimate) : null
  const pickupEnd = readyAt ? addMinutes(readyAt, BUFFER_MINS) : null

  const startTime = readyAt
  const endTime = pickupEnd

  const estimatedRaw =
    orderInfo?.estimatedReadyTime || orderInfo?.estimated_ready_time
  let estimatedPickupText = "Awaiting stall confirmation"

  if (acceptedAtValid && estimateValid) {
    estimatedPickupText = `Around ${fmtTimeHM(readyAt)}`
  } else if (estimatedRaw) {
    const d = new Date(estimatedRaw)
    if (!isNaN(d.getTime())) estimatedPickupText = `Around ${fmtTimeHM(d)}`
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const voucherApplied = 0.0

  const serviceFee =
    (orderInfo?.discounts_charges?.find((dc) => dc.type === "fee")?.amountCents ??
      0) / 100

  const total =
    orderInfo?.totalCents != null
      ? orderInfo.totalCents / 100
      : subtotal + serviceFee - voucherApplied

  const displayOrderCode = generateOrderCode(
    currentOrderId || "—",
    orderInfo?.orderCode
  )

  const pay = String(orderInfo?.status || "").toUpperCase()
  const os = String(orderInfo?.orderStatus || "").toLowerCase()

  const isPaid = pay === "PAID" || pay === "COMPLETED"
  const isPreparing = isPaid && os === "preparing"
  const isReady = isPaid && os === "ready"

  // ✅ Dispatch "payment:success" once per paid order so BudgetAlertProvider can re-check
  useEffect(() => {
    if (!currentOrderId) return
    if (!isPaid) return

    const set = paymentDispatchedForRef.current
    const key = String(currentOrderId)

    if (set.has(key)) return
    set.add(key)

    window.dispatchEvent(new Event("payment:success"))
  }, [currentOrderId, isPaid])

  // ✅ prefer collectedAt if backend sets it
  const collectedAtRaw = orderInfo?.collectedAt || orderInfo?.collected_at || null
  const isCollectedByTime = Boolean(collectedAtRaw)
  const isCollected = isPaid && (os === "collected" || isCollectedByTime)

  // ✅ pickupToken + QR value
  const pickupToken =
    orderInfo?.pickupToken ||
    orderInfo?.pickup_token ||
    orderMeta?.pickupToken ||
    orderMeta?.pickup_token ||
    null

  const canShowQr = isPaid && (os === "preparing" || os === "ready") && pickupToken

  const qrValue = canShowQr
    ? JSON.stringify({ orderId: String(currentOrderId), token: pickupToken })
    : null

  // ✅ show popup when it transitions to collected
  useEffect(() => {
    if (isCollected && !prevCollectedRef.current) {
      prevCollectedRef.current = true
      setShowCollectedPopup(true)
      return
    }
    if (!isCollected) {
      prevCollectedRef.current = false
    }
  }, [isCollected])

  // ✅ poll status until collected
  useEffect(() => {
    if (!currentOrderId) return

    if (isCollected) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    if (pollingRef.current) return

    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/orders/getOrder/${currentOrderId}`)
        const data = res.data

        const stallWrapper = Array.isArray(data) ? data[0] : null
        const stallObj = stallWrapper?.stall ?? null
        const itemsArr = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : []
        const infoObj = Array.isArray(data) ? data[2] : null

        setStall(stallObj)
        setItems(itemsArr.map(mapOrderItem))
        setOrderMeta(stallWrapper || null)
        setOrderInfo(infoObj || null)
      } catch {
        // ignore polling errors
      }
    }, 3000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [currentOrderId, isCollected])

  const handleClose = () => {
    if (onClose) onClose()
    if (urlOrderId) {
      navigate("/home", { replace: true })
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              Your Order Has Been Confirmed
            </h1>

            {hasMany && (
              <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1">
                {activeOrderIds.map((id, idx) => {
                  const active = idx === activeIndex
                  return (
                    <button
                      key={String(id)}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={[
                        "min-w-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition",
                        active
                          ? "bg-[#21421B] text-white"
                          : "text-gray-600 hover:bg-gray-50",
                      ].join(" ")}
                      aria-label={`Switch to order ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <img className="h-10 object-contain" src={logo_full} alt="Eatable Logo" />
        </div>

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

        <div className="flex flex-col lg:flex-row gap-4 p-4">
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  {pay}
                </span>
              </div>

              <p className="text-sm text-gray-500">Placed on: {placedAtText}</p>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <MapPin className="w-5 h-5 mt-0.5 text-[#21421B]" aria-hidden="true" />
              <div>
                <h3 className="text-base font-semibold text-gray-900">{stallName}</h3>
                <p className="text-gray-500 text-sm">
                  {stall?.location || "Pick-up location will be shown here"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <ClockFading className="w-5 h-5 mt-0.5 text-[#21421B]" aria-hidden="true" />
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {isReady
                    ? "Ready for pick up"
                    : isPreparing
                      ? "Preparing your order.."
                      : "Estimated Pick-Up Time"}
                </h3>

                <div className="text-gray-500 text-sm space-y-1">
                  {startTime && endTime ? (
                    <>
                      <p className="text-gray-600">
                        Estimated duration: {Number(estimateMins)} mins
                      </p>
                      <p className="text-gray-600">
                        {fmtTimeHM(startTime)} - {fmtTimeHM(endTime)}
                      </p>
                    </>
                  ) : estimatedPickupText !== "Awaiting stall confirmation" ? (
                    <p className="text-gray-600">{estimatedPickupText}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center pt-4 pb-2 px-2 bg-gray-50 rounded-xl">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Pick Up QR</h3>

              {qrValue ? (
                <QRCodeCanvas value={qrValue} size={224} />
              ) : isCollected ? (
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg bg-green-100 flex items-center justify-center px-4 text-center">
                  <p className="text-green-800 text-sm font-medium">
                    This order has been collected.
                  </p>
                </div>
              ) : isPaid && (os === "preparing" || os === "ready") ? (
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg bg-gray-200 flex items-center justify-center px-4 text-center">
                  <p className="text-gray-600 text-sm">
                    QR is being generated. Please refresh in a moment.
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

            <button
              className="w-full py-2.5 bg-lime-800 hover:bg-lime-900 text-white font-medium rounded-xl transition-colors shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                handleClose()
              }}
            >
              {urlOrderId ? "Return to Homepage" : "Close"}
            </button>
          </div>

          <div className="flex-1 lg:max-w-md">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden h-full flex flex-col">
              <div className="px-6 py-4 text-center border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Order Details</h3>
                <p className="text-gray-600 mt-1">{stallName}</p>
              </div>

              <div className="flex-1 px-6 py-4 overflow-y-auto max-h-64">
                {items.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No items found for this order.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <img
                            src={item.img || fallbackFoodImg}
                            alt={item.name}
                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{item.name}</p>
                            <p className="text-gray-500 text-sm">x{item.qty}</p>
                          </div>
                        </div>
                        <span className="font-medium text-gray-900 flex-shrink-0">
                          ${item.lineTotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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

        {showCollectedPopup && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Order collected successfully
              </h2>
              <p className="text-sm text-gray-600 mt-2">You can continue.</p>

              <button
                type="button"
                className="mt-5 w-full py-2.5 bg-lime-800 hover:bg-lime-900 text-white font-medium rounded-xl transition-colors shadow-sm"
                onClick={() => setShowCollectedPopup(false)}
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
