// HawkerOrdersPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import api from "@lib/api";
import QrScanModal from "./HawkerQrScanner";

const BUFFER_MINS = 3;

// ---------- helpers ----------
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getOrderDate(order) {
  return (
    order?.collectedAt ||
    order?.collected_at ||
    order?.completedAt ||
    order?.completed_at ||
    order?.createdAt ||
    order?.created_at ||
    null
  );
}

function matchesMonth(order, monthValue) {
  if (monthValue === "all") return true;
  const raw = getOrderDate(order);
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  return d.getMonth() === Number(monthValue);
}

function fmtMoneyFromCents(cents) {
  const n = Number(cents ?? 0);
  return `$${(n / 100).toFixed(2)}`;
}

function itemUnitPriceCents(it) {
  return it?.menuItem?.priceCents ?? it?.menuItem?.price_cents ?? 0;
}

function itemQty(it) {
  return Number(it?.quantity ?? it?.qty ?? 1);
}

function itemLineTotalCents(it) {
  return itemUnitPriceCents(it) * itemQty(it);
}

function normalizeOrdersResponse(data) {
  if (!data) return { incoming: [], pending: [], ready: [], history: [] };

  if (Array.isArray(data)) return splitByStatus(data);
  if (Array.isArray(data.orders)) return splitByStatus(data.orders);

  const incoming = Array.isArray(data.incoming) ? data.incoming : [];
  const pending = Array.isArray(data.pending) ? data.pending : [];
  const ready = Array.isArray(data.ready) ? data.ready : [];

  const history =
    (Array.isArray(data.history) && data.history) ||
    (Array.isArray(data.collected) && data.collected) ||
    [];

  if (incoming.length || pending.length || ready.length || history.length) {
    return { incoming, pending, ready, history };
  }

  return { incoming: [], pending: [], ready: [], history: [] };
}

function splitByStatus(list) {
  const incoming = [];
  const pending = [];
  const ready = [];
  const history = [];

  for (const o of list) {
    const os = String(o.orderStatus || "").toLowerCase();

    if (os === "awaiting" || os === "pending" || os === "new") {
      incoming.push(o);
      continue;
    }

    if (os === "preparing" || os === "ready") {
      pending.push(o);
      if (os === "ready") ready.push(o);
      continue;
    }

    if (os === "collected" || os === "completed" || os === "cancelled") {
      history.push(o);
      continue;
    }
  }

  return { incoming, pending, ready, history };
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-SG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function fmtBadgeDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-SG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function safeItems(order) {
  return Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.orderItems)
      ? order.orderItems
      : [];
}

function itemName(it) {
  return it?.menuItem?.name || it?.name || "Unnamed item";
}

function itemNotes(it) {
  return it?.request || it?.notes || "";
}

function itemPrepMins(it) {
  const mi = it?.menuItem || {};
  const v =
    mi.prepTimeMins ??
    mi.prep_time_mins ??
    it.prepTimeMins ??
    it.prep_time_mins ??
    0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function computeDefaultEstimateMins(order) {
  const items = safeItems(order);
  const sum = items.reduce((acc, it) => acc + itemPrepMins(it) * itemQty(it), 0);
  return sum + BUFFER_MINS;
}

function calcRemainingSeconds(order, nowMs) {
  const est = order?.estimatedReadyTime || order?.estimated_ready_time;
  if (est) {
    const t = new Date(est).getTime();
    if (!Number.isNaN(t)) return Math.max(0, Math.floor((t - nowMs) / 1000));
  }

  const acceptedAt = order?.acceptedAt || order?.accepted_at;
  const mins = order?.estimatedMinutes ?? order?.estimated_minutes ?? null;
  if (acceptedAt && mins != null) {
    const a = new Date(acceptedAt).getTime();
    if (!Number.isNaN(a)) {
      const t = a + Number(mins) * 60_000;
      return Math.max(0, Math.floor((t - nowMs) / 1000));
    }
  }

  return null;
}

function fmtCountdown(sec) {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function displayOrderCode(order) {
  const id = String(order?.id || "");
  if (id && id.length >= 8) return `EA-${id.slice(0, 8).toUpperCase()}`;
  const oc = order?.orderCode;
  if (oc) return `EA-${String(oc).toUpperCase()}`;
  return "—";
}

// ---------- UI components ----------
function SectionHeader({ title }) {
  return (
    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-0">
      {title}
    </h2>
  );
}

function Badge({ text }) {
  return (
    <span className="inline-flex items-center justify-center rounded-md px-2 py-1.5 text-[12px] font-semibold bg-[#21421B] text-white min-w-[120px]">
      {text}
    </span>
  );
}
function ActionBadge({ text }) {
  return (
    <span className="inline-flex items-center justify-center rounded-md px-2 py-1.5 text-[12px] font-semibold bg-[#21421B] text-white w-full sm:w-auto sm:min-w-[120px]">
      {text}
    </span>
  );
}




function OrderRow({ order, rightBadge, onClick }) {
  const items = safeItems(order);
  const first = items[0];
  const createdAt = order?.createdAt || order?.created_at;

  const imgSrc = first?.menuItem?.imageUrl || first?.menuItem?.image_url;
  const hasMore = items.length > 1;

  const notes = first && itemNotes(first) ? itemNotes(first) : "No special instructions";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={[
        "w-full text-left bg-white rounded-lg",
        "shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition",
        "px-4 sm:px-6 py-4 sm:py-5",
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 cursor-pointer",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            {displayOrderCode(order)}
          </div>

          <div className="text-sm text-gray-500 whitespace-nowrap">
            ({items.length} {items.length === 1 ? "Item" : "Items"})
          </div>

          <div className="text-xs text-gray-400 truncate">
            Ordered on {fmtDateTime(createdAt)}
          </div>
        </div>

        <div className="mt-3 flex items-start gap-3 min-w-0">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={first ? itemName(first) : "Order item"}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            {hasMore ? (
              <div className="text-xs text-gray-400 leading-none mt-1">See more</div>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            {first ? (
              <div className="text-gray-700 truncate">
                {itemName(first)}{" "}
                <span className="text-gray-500">x {itemQty(first)}</span>
              </div>
            ) : (
              <div className="text-gray-500">No items</div>
            )}

            <div className="text-xs text-gray-400 mt-1 truncate">* {notes}</div>
          </div>
        </div>
      </div>
<div className="flex-shrink-0 sm:pr-2 sm:self-stretch flex items-center justify-center sm:justify-end w-full sm:w-auto">
  {rightBadge}
</div>


    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h3>
            {subtitle ? <span className="text-sm text-gray-500">{subtitle}</span> : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function MonthFilterDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const label =
    value === "all" ? "All months" : MONTH_NAMES[Number(value)] || "All months";

  return (
    <div className="relative w-full sm:w-[220px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm hover:border-gray-300"
      >
        <span className="truncate">{label}</span>
        <span className="text-gray-500">▾</span>
      </button>

      {open ? (
        <div
          className="absolute right-0 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => {
              onChange("all");
              setOpen(false);
            }}
            className={[
              "w-full text-left px-4 py-2 text-sm hover:bg-gray-50",
              value === "all" ? "bg-[#21421B] text-white hover:bg-[#21421B]" : "text-gray-900",
            ].join(" ")}
          >
            All months
          </button>

          <div className="max-h-[260px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {MONTH_NAMES.map((m, idx) => {
              const v = String(idx);
              const active = value === v;

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onChange(v);
                    setOpen(false);
                  }}
                  className={[
                    "w-full text-left px-4 py-2 text-sm hover:bg-gray-50",
                    active ? "bg-[#21421B] text-white hover:bg-[#21421B]" : "text-gray-900",
                  ].join(" ")}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------- main page ----------
export default function HawkerOrdersPage() {
  const [tab, setTab] = useState("current");

  const [incoming, setIncoming] = useState([]);
  const [pending, setPending] = useState([]);
  const [ready, setReady] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyMonth, setHistoryMonth] = useState("all");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const pollRef = useRef(null);
  const [nowMs, setNowMs] = useState(Date.now());

  const [activeOrder, setActiveOrder] = useState(null);
  const [activeMode, setActiveMode] = useState(null);
  const [estimateMins, setEstimateMins] = useState(0);
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanOrderId, setScanOrderId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const filteredHistory = useMemo(() => {
    return history.filter((o) => matchesMonth(o, historyMonth));
  }, [history, historyMonth]);

  useEffect(() => {
    if (scanOpen) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [scanOpen]);

  useEffect(() => {
    if (scanOpen) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    pollRef.current = setInterval(fetchOrders, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [scanOpen]);

  async function fetchOrders() {
    try {
      setErr(null);
      const res = await api.get("/hawker/orders");
      const grouped = Array.isArray(res.data)
        ? splitByStatus(res.data)
        : normalizeOrdersResponse(res.data);

      setIncoming(grouped.incoming || []);
      setPending(grouped.pending || []);
      setReady(grouped.ready || []);
      setHistory(grouped.history || []);
    } catch {
      setErr("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (!mounted) return;
      await fetchOrders();
    }
    init();
    pollRef.current = setInterval(fetchOrders, 15000);
    return () => {
      mounted = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function openAccept(order) {
    setActiveOrder(order);
    setActiveMode("accept");
    setEstimateMins(computeDefaultEstimateMins(order));
    setCheckedIds(new Set());
  }

  function openChecklist(order) {
    setActiveOrder(order);
    setActiveMode("checklist");
    const items = safeItems(order);
    setCheckedIds(new Set(items.filter((it) => it.isPrepared).map((it) => String(it.id))));
  }

  function closeModal() {
    setActiveOrder(null);
    setActiveMode(null);
    setSaving(false);
  }

  async function handleAccept() {
    if (!activeOrder) return;
    try {
      setSaving(true);
      await api.patch(`/hawker/orders/${activeOrder.id}/accept`, {
        estimatedMinutes: estimateMins,
      });
      closeModal();
      await fetchOrders();
    } catch {
      setSaving(false);
      setErr("Failed to accept order.");
    }
  }

  async function togglePrepared(it) {
    if (!activeOrder) return;
    const id = String(it.id);
    const nextChecked = !checkedIds.has(id);

    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (nextChecked) next.add(id);
      else next.delete(id);
      return next;
    });

    try {
      await api.patch(`/hawker/orders/${activeOrder.id}/items/${id}/prepared`, {
        isPrepared: nextChecked,
      });
    } catch {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        if (nextChecked) next.delete(id);
        else next.add(id);
        return next;
      });
      setErr("Failed to update item.");
    }
  }

  async function handleMarkReady() {
    if (!activeOrder) return;

    const status = String(activeOrder?.orderStatus || "").toLowerCase();
    if (status !== "preparing") {
      closeModal();
      return;
    }

    try {
      setSaving(true);
      await api.patch(`/hawker/orders/${activeOrder.id}/ready`, {});
      closeModal();
      await fetchOrders();
    } catch {
      setSaving(false);
      setErr("Failed to mark ready.");
    }
  }

  const modalItems = useMemo(
    () => (activeOrder ? safeItems(activeOrder) : []),
    [activeOrder]
  );

  const allChecked = useMemo(() => {
    if (!activeOrder) return false;
    if (modalItems.length === 0) return false;
    return modalItems.every((it) => checkedIds.has(String(it.id)));
  }, [activeOrder, modalItems, checkedIds]);

  const activeStatus = String(activeOrder?.orderStatus || "").toLowerCase();

  const isCompletedOrder =
    activeStatus === "collected" ||
    activeStatus === "completed" ||
    activeStatus === "cancelled";

  const isActiveReady = activeStatus === "ready";
  const isActivePreparing = activeStatus === "preparing";

  const subtotalCents =
    activeOrder?.subtotalCents ??
    modalItems.reduce((acc, it) => acc + itemLineTotalCents(it), 0);
  const serviceFeeCents = activeOrder?.serviceFeeCents ?? 0;
  const voucherCents = activeOrder?.voucherCents ?? 0;
  const totalCents =
    activeOrder?.totalCents ??
    Math.max(0, subtotalCents + serviceFeeCents - voucherCents);

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-center mb-4">
          <div className="w-full max-w-[420px] inline-flex rounded-md border border-gray-200 bg-white p-[2px]">
            <button
              type="button"
              onClick={() => setTab("current")}
              className={[
                "flex-1 px-6 py-2.5 rounded-[6px] text-xs font-semibold",
                tab === "current"
                  ? "bg-[#21421B] text-white"
                  : "text-gray-600 hover:bg-gray-50",
              ].join(" ")}
            >
              Current
            </button>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={[
                "flex-1 px-6 py-2.5 rounded-[6px] text-xs font-semibold",
                tab === "history"
                  ? "bg-[#21421B] text-white"
                  : "text-gray-600 hover:bg-gray-50",
              ].join(" ")}
            >
              History
            </button>
          </div>
        </div>

        {err ? <div className="mb-6 text-red-600 font-bold">{err}</div> : null}
        {loading ? <div className="text-gray-500">Loading…</div> : null}

        {tab === "history" ? (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <SectionHeader title="Order History" />
              <MonthFilterDropdown value={historyMonth} onChange={setHistoryMonth} />
            </div>

            <div className="space-y-5 mb-12">
              {filteredHistory.length === 0 ? (
                <div className="text-gray-500">No past orders yet.</div>
              ) : (
                filteredHistory.map((o) => {
                  const os = String(o.orderStatus || "").toLowerCase();
                  const badge =
                    os === "collected" || os === "completed"
                      ? "Collected"
                      : os === "cancelled"
                        ? "Cancelled"
                        : os;

                  return (
                    <OrderRow
                      key={String(o.id)}
                      order={o}
                      rightBadge={
                        <div className="w-full sm:w-auto">
                          <div className="flex flex-col items-center sm:items-center gap-2 sm:gap-1">

                            <Badge text={badge} />
                            <div className="text-xs text-gray-500 text-right sm:text-center">
                              {fmtDateTime(getOrderDate(o))}
                            </div>
                          </div>
                        </div>
                      }
                      onClick={() => openChecklist(o)}
                    />
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            <SectionHeader title="Incoming Orders" />
            <div className="mt-4 space-y-5 mb-12">
              {incoming.length === 0 ? (
                <div className="text-gray-500">No incoming orders.</div>
              ) : (
                incoming.map((o) => (
                  <OrderRow
                    key={String(o.id)}
                    order={o}
                    rightBadge={<Badge text="Awaiting" />}
                    onClick={() => openAccept(o)}
                  />
                ))
              )}
            </div>

            <div className="border-t border-gray-200 my-8 sm:my-10" />

            <SectionHeader title="Pending Orders" />
            <div className="mt-4 space-y-5 mb-12">
              {pending.length === 0 ? (
                <div className="text-gray-500">No pending orders.</div>
              ) : (
                pending.map((o) => {
                  const os = String(o.orderStatus || "").toLowerCase();
                  const isReadyRow = os === "ready";
                  const remain = calcRemainingSeconds(o, nowMs);

                  return (
                    <OrderRow
                      key={String(o.id)}
                      order={o}
rightBadge={
  <div className="w-full sm:w-auto flex justify-end">
    {/* ✅ SAME width as Awaiting */}
    <div className="w-full sm:w-auto sm:min-w-[120px] flex flex-col items-center justify-center gap-1">
      <Badge text={isReadyRow ? "Ready" : "Preparing"} />

      <div className="text-xs text-gray-500 text-center w-full">
        {isReadyRow ? (
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700 underline underline-offset-2"
            onClick={(e) => {
              e.stopPropagation();
              setScanOrderId(o.id);
              setScanOpen(true);
            }}
          >
            Scan QR
          </button>
        ) : (
          fmtCountdown(remain)
        )}
      </div>
    </div>
  </div>
}



                      onClick={() => openChecklist(o)}
                    />
                  );
                })
              )}
            </div>
          </>
        )}

        {activeOrder && activeMode === "accept" ? (
          <ModalShell
            title="Order Details"
            subtitle={`Ordered on ${fmtDateTime(activeOrder.createdAt || activeOrder.created_at)}`}
            onClose={closeModal}
          >
            <div className="px-4 sm:px-6 pt-3 pb-5">
              <div className="font-semibold text-gray-900 mb-4">
                {displayOrderCode(activeOrder)} ({modalItems.length} item{modalItems.length === 1 ? "" : "s"})
              </div>

              <div className="space-y-4">
                {modalItems.map((it) => {
                  const imgSrc = it?.menuItem?.imageUrl || it?.menuItem?.image_url;
                  const lineTotal = itemLineTotalCents(it);
                  return (
                    <div key={String(it.id)} className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {imgSrc ? (
                          <img src={imgSrc} alt={itemName(it)} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          x{itemQty(it)} {itemName(it)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          * {itemNotes(it) ? itemNotes(it) : "No special instructions"}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 flex-shrink-0">
                        {fmtMoneyFromCents(lineTotal)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 border-t pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-semibold">{fmtMoneyFromCents(subtotalCents)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Service Charges</span>
                  <span className="font-semibold">{fmtMoneyFromCents(serviceFeeCents)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Applied Voucher</span>
                  <span className="font-semibold text-gray-900">-{fmtMoneyFromCents(voucherCents)}</span>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-base font-bold text-gray-900">{fmtMoneyFromCents(totalCents)}</span>
                </div>
              </div>

              <div className="mt-3 border-t pt-3">
                <div className="text-center font-semibold mb-3">Estimated Preparation Time</div>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center"
                    onClick={() => setEstimateMins((m) => Math.max(0, m - 1))}
                    disabled={saving}
                  >
                    <span className="relative block h-[13px] w-[12px]">
                      <span className="absolute left-0 top-1/2 h-[3px] w-full -translate-y-1/2 bg-gray-900 rounded-full" />
                    </span>
                  </button>
                  <div className="text-4xl font-extrabold">
                    {estimateMins} <span className="text-lg font-semibold text-gray-500">mins</span>
                  </div>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center"
                    onClick={() => setEstimateMins((m) => Math.min(240, m + 1))}
                    disabled={saving}
                  >
                    <span className="relative block h-[13px] w-[13px]">
                      <span className="absolute left-0 top-1/2 h-[3px] w-full -translate-y-1/2 bg-gray-900 rounded-full" />
                      <span className="absolute top-0 left-1/2 h-full w-[3px] -translate-x-1/2 bg-gray-900 rounded-full" />
                    </span>
                  </button>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                  <button
                    type="button"
                    className="w-full sm:w-auto px-10 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="w-full sm:w-auto px-10 py-2.5 rounded-lg bg-[#21421B] text-white font-semibold hover:bg-[#1A3517]"
                    onClick={handleAccept}
                    disabled={saving}
                  >
                    {saving ? "Accepting..." : "Accept"}
                  </button>
                </div>
              </div>
            </div>
          </ModalShell>
        ) : null}

        {activeOrder && activeMode === "checklist" ? (
          <ModalShell
            title="Order Checklist"
            subtitle={`Ordered on ${fmtDateTime(activeOrder.createdAt || activeOrder.created_at)}`}
            onClose={closeModal}
          >
            <div className="px-4 sm:px-6 py-5">
              <div className="font-semibold text-gray-900 mb-2">
                {displayOrderCode(activeOrder)} ({modalItems.length} items)
              </div>
              <div className="space-y-4">
                {modalItems.map((it) => {
                  const id = String(it.id);
                  const checked = checkedIds.has(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className="w-full flex items-center gap-3"
                      onClick={() => togglePrepared(it)}
                      disabled={saving}
                    >
                      <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {it?.menuItem?.imageUrl || it?.menuItem?.image_url ? (
                          <img
                            src={it.menuItem.imageUrl || it.menuItem.image_url}
                            alt={itemName(it)}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium truncate">
                          x{itemQty(it)} {itemName(it)}
                        </div>
                        {itemNotes(it) ? (
                          <div className="text-xs text-gray-400 truncate">* {itemNotes(it)}</div>
                        ) : null}
                      </div>
                      <div
                        className={[
                          "h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0",
                          checked ? "border-[#21421B] bg-[#21421B]" : "border-gray-400 bg-white",
                        ].join(" ")}
                      >
                        {checked ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex justify-center">
   {isCompletedOrder || isActiveReady ? (
  <button
    type="button"
    className="px-10 py-3 rounded-lg font-semibold bg-gray-300 text-gray-600 cursor-not-allowed"
    disabled
  >
    Order completed
  </button>
) : (
  <button
    type="button"
    className={[
      "px-10 py-3 rounded-lg font-semibold",
      allChecked
        ? "bg-[#21421B] text-white hover:bg-[#1A3517]"
        : "bg-gray-300 text-gray-500 cursor-not-allowed",
    ].join(" ")}
    disabled={!allChecked || saving || !isActivePreparing}
    onClick={handleMarkReady}
  >
    {saving ? "Completing..." : "Complete Order"}
  </button>
)}

              </div>
            </div>
          </ModalShell>
        ) : null}

        {toastMsg ? (
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl border border-gray-200 p-5">
              <div className="text-black font-semibold text-center">{toastMsg}</div>
              <button
                type="button"
                className="mt-4 w-full px-4 py-2.5 rounded-lg bg-[#21421B] text-white font-semibold hover:bg-[#1A3517]"
                onClick={() => setToastMsg(null)}
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        <QrScanModal
          open={scanOpen}
          orderId={scanOrderId}
          onClose={() => setScanOpen(false)}
          onSuccess={async () => {
            await fetchOrders();
            setScanOpen(false); // close scanner modal
            setToastMsg("Order collected successfully."); // show popup
          }}
        />
      </div>
    </div>
  );
}
