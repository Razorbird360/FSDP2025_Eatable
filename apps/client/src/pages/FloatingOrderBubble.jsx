import { useEffect, useRef, useState } from "react"
import { ClipboardList } from "lucide-react"
import api from "@lib/api"
import OrderCompletedModal from "../features/payment/OrderCompleted"

function getActiveOrders(data) {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.orders)
      ? data.orders
      : []

  return list
    .map((o) => ({
      id: o.id,
      pay: String(o.status || "").toUpperCase(),
      os: String(o.orderStatus || "").toLowerCase(),
      createdAt: o.createdAt || o.created_at || 0,
    }))
    .filter(
      (o) =>
        (o.pay === "PAID" || o.pay === "COMPLETED") &&
        (o.os === "preparing" || o.os === "ready")
    )
    .sort((a, b) => {
      const prio = (s) => (s === "ready" ? 0 : 1)
      const p = prio(a.os) - prio(b.os)
      if (p !== 0) return p
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

const POS_KEY = "eatable:floatingOrderBubblePos"

export default function FloatingOrderBubble() {
  const [activeOrders, setActiveOrders] = useState([])
  const [openModal, setOpenModal] = useState(false)

  // draggable position
  const [pos, setPos] = useState(() => {
    try {
      const raw = localStorage.getItem(POS_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
        return { x: parsed.x, y: parsed.y }
      }
      return null
    } catch {
      return null
    }
  })

  const pollRef = useRef(null)
  const bubbleRef = useRef(null)

  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const startRef = useRef({ x: 0, y: 0, px: 0, py: 0 })

  // Poll active orders
  useEffect(() => {
    let mounted = true

    async function refresh() {
      try {
        const res = await api.get("/orders/my")
        const active = getActiveOrders(res.data)

        if (!mounted) return
        setActiveOrders(active)
      } catch {
        if (!mounted) return
        setActiveOrders([])
      }
    }

    refresh()
    pollRef.current = setInterval(refresh, 20000)

    return () => {
      mounted = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // Default position if none saved
  useEffect(() => {
    if (pos) return
    const x = Math.max(16, window.innerWidth - 360)
    const y = Math.max(16, window.innerHeight - 120)
    setPos({ x, y })
  }, [pos])

  // Keep within viewport on resize
  useEffect(() => {
    function onResize() {
      const el = bubbleRef.current
      if (!el || !pos) return
      const rect = el.getBoundingClientRect()
      const maxX = window.innerWidth - rect.width - 12
      const maxY = window.innerHeight - rect.height - 12
      setPos((p) => ({
        x: clamp(p.x, 12, Math.max(12, maxX)),
        y: clamp(p.y, 12, Math.max(12, maxY)),
      }))
    }

    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [pos])

  // Persist position
  useEffect(() => {
    if (!pos) return
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(pos))
    } catch {
      // ignore
    }
  }, [pos])

  if (activeOrders.length === 0) return null

  const primary = activeOrders[0]
  const count = activeOrders.length

  const label = primary.os === "ready" ? "Ready" : "Preparing"
  const pillClass =
    primary.os === "ready"
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800"

  const activeIds = activeOrders.map((o) => o.id)

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    if (!pos) return

    draggingRef.current = true
    movedRef.current = false
    startRef.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const onPointerMove = (e) => {
    if (!draggingRef.current) return
    const el = bubbleRef.current
    if (!el) return

    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true

    const rect = el.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width - 12
    const maxY = window.innerHeight - rect.height - 12

    const nextX = clamp(startRef.current.px + dx, 12, Math.max(12, maxX))
    const nextY = clamp(startRef.current.py + dy, 12, Math.max(12, maxY))

    setPos({ x: nextX, y: nextY })
  }

  const onPointerUp = (e) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const onBubbleClick = () => {
    if (movedRef.current) return
    setOpenModal(true)
  }

  return (
    <>
      <div
        ref={bubbleRef}
        className="fixed z-[70]"
        style={{
          left: pos?.x ?? 16,
          top: pos?.y ?? 16,
          touchAction: "none",
          cursor: "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onBubbleClick}
      >
        <div className="flex items-center gap-3 rounded-2xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] border border-gray-200 px-4 py-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#21421B] text-white">
            <ClipboardList className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 leading-5">
              Active order{count > 1 ? "s" : ""} ({count})
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={[
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                  pillClass,
                ].join(" ")}
              >
                {label}
              </span>
              <span className="text-xs text-gray-500">Tap to view QR</span>
            </div>
          </div>
        </div>
      </div>

      {openModal && (
        <OrderCompletedModal
          orderId={primary.id}
          activeOrderIds={activeIds}
          onClose={() => setOpenModal(false)}
        />
      )}
    </>
  )
}
