import { useEffect, useMemo, useState } from "react"
import api from "../lib/api"
import { formatPrice, formatDateTime } from "../utils/helpers"
import OrderDetailsModal from "../features/orders/components/OrderDetailsModal"

// --- Chart.js Imports ---
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Title
} from "chart.js"
import { Bar } from "react-chartjs-2"

// Register chart components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Title)

const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export default function SpendingsPage() {
  const [mode, setMode] = useState("month")
  // Default to current month string
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toLocaleString("en-US", { month: "long" })
  )

  // --- Budget State ---
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [budgetDollars, setBudgetDollars] = useState(250)
  const [alertAt, setAlertAt] = useState(50)
  const [notifiedAlready, setNotifiedAlready] = useState(false)
  const [loadingBudget, setLoadingBudget] = useState(false)
  const [budgetError, setBudgetError] = useState(null)

  // --- Budget Alert Popup State ---
  const [budgetPopup, setBudgetPopup] = useState(null)

  // --- Orders State ---
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [ordersError, setOrdersError] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)

  // --- Helpers ---
  const selectedMonthIndex = useMemo(() => {
    const idx = MONTH_OPTIONS.indexOf(selectedMonth)
    return idx === -1 ? 0 : idx
  }, [selectedMonth])

  const monthNumber = selectedMonthIndex + 1
  const yearNumber = new Date().getFullYear()

  // 1) Fetch Orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get("/orders/my")
        setOrders(response.data.orders || [])
      } catch (err) {
        console.error("Failed to fetch orders:", err)
        setOrdersError("Failed to load your transaction records.")
      } finally {
        setLoadingOrders(false)
      }
    }
    fetchOrders()
  }, [])

  // 2) Fetch Budget
  useEffect(() => {
    const fetchBudget = async () => {
      try {
        setLoadingBudget(true)
        setBudgetError(null)
        const res = await api.get("/budget/monthly", {
          params: { year: yearNumber, month: monthNumber }
        })
        const b = res.data?.budget

        if (b) {
          const serverBudgetDollars = Math.round((b.budgetCents || 0) / 100)
          const serverAlertAt = b.alertAtPercent ?? 80

          setBudgetDollars(serverBudgetDollars)
          setAlertAt(serverAlertAt)
          setNotifiedAlready(b.notifiedAlready ?? false)
        } else {
          // Default fallback
          setBudgetDollars(250)
          setAlertAt(50)
          setNotifiedAlready(false)
        }
      } catch (err) {
        console.error("Failed to fetch budget:", err)
        setBudgetError("Failed to load your budget.")
      } finally {
        setLoadingBudget(false)
      }
    }
    if (mode === "month") fetchBudget()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, yearNumber, monthNumber])

  // --- Filtering & Calculations ---
  const completedOrders = useMemo(() => {
    return (orders || []).filter(o => (o?.status || "").toLowerCase() === "completed")
  }, [orders])

  // --- Overall (spending per month) ---
  const monthlyTotalsCents = useMemo(() => {
    const totals = Array(12).fill(0)

      ; (completedOrders || []).forEach(o => {
        const d = new Date(o?.createdAt)
        if (Number.isNaN(d.getTime())) return

        // NOTE: Year filter removed to ensure 2025 data appears
        // if (d.getFullYear() !== new Date().getFullYear()) return 

        const m = d.getMonth() // 0-11
        totals[m] += Number(o?.totalCents) || 0
      })

    return totals
  }, [completedOrders])

  // --- Monthly View Filter ---
  const visibleOrders = useMemo(() => {
    if (mode !== "month") return completedOrders
    return completedOrders.filter(o => {
      const d = new Date(o?.createdAt)
      if (Number.isNaN(d.getTime())) return false
      return d.toLocaleString("en-US", { month: "long" }) === selectedMonth
    })
  }, [completedOrders, mode, selectedMonth])

  const spentCents = useMemo(() => {
    const list = mode === "month" ? visibleOrders : completedOrders
    return (list || []).reduce((sum, o) => sum + (Number(o?.totalCents) || 0), 0)
  }, [mode, visibleOrders, completedOrders])

  const budgetCapCents = useMemo(() => {
    return Math.max(0, Number(budgetDollars || 0) * 100)
  }, [budgetDollars])

  const percent = useMemo(() => {
    if (!budgetCapCents) return 0
    const p = Math.round((spentCents / budgetCapCents) * 100)
    return Math.max(0, Math.min(100, p))
  }, [spentCents, budgetCapCents])

  // --- Budget Alert Logic ---
  useEffect(() => {
    if (mode !== "month") return
    if (!budgetCapCents) return
    if (notifiedAlready) return

    const hardLimitCents = budgetCapCents
    const alertThresholdCents = Math.round(budgetCapCents * (alertAt / 100))

    const reachedHardLimit = spentCents >= hardLimitCents
    const reachedAlert =
      alertAt < 100 &&
      spentCents >= alertThresholdCents &&
      spentCents < hardLimitCents

    const showPopup = async (type, title, message) => {
      setBudgetPopup({ type, title, message })
      try {
        await api.post("/budget/monthly/notify", {
          year: yearNumber,
          month: monthNumber
        })
        setNotifiedAlready(true)
      } catch (err) {
        console.error("Failed to mark budget as notified:", err)
      }
    }

    // 1) Hard limit popup (100%+)
    if (reachedHardLimit) {
      showPopup(
        "limit",
        "Budget limit reached",
        `You have used 100% of your budget.\n${formatPrice(spentCents)} / ${formatPrice(budgetCapCents)} spent`
      )
      return
    }

    // 2) Early warning popup (e.g. 80%)
    if (reachedAlert) {
      showPopup(
        "warning",
        "Budget alert",
        `You have used ${percent}% of your budget.\n${formatPrice(spentCents)} / ${formatPrice(budgetCapCents)} spent`
      )
    }
  }, [mode, spentCents, budgetCapCents, alertAt, percent, yearNumber, monthNumber, notifiedAlready])

  // --- QuickChart URL (Donut only) ---
  const chartUrl = useMemo(() => {
    return buildBudgetDonutUrl(spentCents, budgetCapCents)
  }, [spentCents, budgetCapCents])

  return (
    <div className="w-full">
      {/* Top Header: Navigation & Month Filter + Legend (aligned) */}
      <div className="w-full pt-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setMode("month")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${mode === "month" ? "bg-[#21421B] text-white" : "text-slate-700 hover:bg-slate-50"
                  }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setMode("overall")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${mode === "overall" ? "bg-[#21421B] text-white" : "text-slate-700 hover:bg-slate-50"
                  }`}
              >
                Overall
              </button>
            </div>

            {mode === "month" && (
              <div className="ml-2">
                <MonthDropdown
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  options={MONTH_OPTIONS}
                />
              </div>
            )}
          </div>

          {/* Legend aligned with dropdown (right side) */}
          {mode === "month" && (
            <div className="flex items-center gap-6 text-sm text-slate-600 pt-1">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-7 rounded-[4px] bg-[#21421B]" />
                <span>Spent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-7 rounded-[4px] bg-[#E8EFE9]" />
                <span>Remaining</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full pb-12">
        <div className="mt-8 flex flex-col items-center">
          {mode === "month" ? (
            <>
              {loadingBudget ? (
                <div className="h-64 w-64 flex items-center justify-center rounded-full border border-gray-100 bg-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21421B]" />
                </div>
              ) : budgetError ? (
                <div className="text-red-500 text-sm">{budgetError}</div>
              ) : (
                /* DONUT CHART AREA (QuickChart) */
                <div className="relative flex items-center justify-center">
                  <img
                    src={chartUrl}
                    alt="Budget chart"
                    className="h-64 w-64 object-contain"
                  />
                  {/* Center Text */}
                  <div className="absolute flex flex-col items-center">
                    <div className="text-5xl font-bold text-[#6F6AF8]">{percent}%</div>
                    {/* ✅ UPDATED: Red text if overspent */}
                    <div
                      className={`mt-2 text-base font-medium ${spentCents > budgetCapCents
                        ? "text-red-500"
                        : "text-slate-500"
                        }`}
                    >
                      {formatPrice(spentCents)} / {formatPrice(budgetCapCents)} spent
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Button */}
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                disabled={loadingBudget}
                className="mt-8 h-10 w-40 rounded-2xl bg-[#21421B] text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
              >
                Edit
              </button>
            </>
          ) : (
            // --- OVERALL CHART (React Chart.js) ---
            <SpendingPerMonthChart monthlyTotalsCents={monthlyTotalsCents} />
          )}
        </div>

        {/* Transactions List */}
        <div className="mt-12 w-full bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Transaction Records</h2>
          {loadingOrders ? (
            <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-[#21421B] rounded-full" /></div>
          ) : visibleOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No transactions found.</div>
          ) : (
            <div className="space-y-4">
              {visibleOrders.map(order => (
                <div
                  key={order.id}
                  className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {order.stall?.image_url ? (
                        <img
                          src={order.stall.image_url}
                          alt={order.stall?.name || "Stall"}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                          🏪
                        </div>
                      )}

                      <div>
                        <h3 className="font-semibold text-gray-900">{order.stall?.name || "Unknown"}</h3>
                        <p className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900">{formatPrice(order.totalCents)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Budget Modal */}
      {isEditOpen && (
        <BudgetEditModal
          budget={budgetDollars}
          alertAt={alertAt}
          onClose={() => setIsEditOpen(false)}
          onSave={async ({ budget, alertAt }) => {
            try {
              const budgetCents = Math.max(0, Number(budget || 0) * 100)

              const res = await api.put("/budget/monthly", {
                year: yearNumber,
                month: monthNumber,
                budgetCents,
                alertAtPercent: alertAt
              })

              const b = res.data?.budget
              const nextBudgetDollars = Math.round((b?.budgetCents ?? budgetCents) / 100)
              const nextAlertAt = b?.alertAtPercent ?? alertAt
              const nextNotifiedAlready = b?.notifiedAlready ?? false

              // then update state
              setBudgetDollars(nextBudgetDollars)
              setAlertAt(nextAlertAt)
              setNotifiedAlready(nextNotifiedAlready)

              setIsEditOpen(false)
            } catch (err) {
              console.error(err)
              alert("Failed to update.")
            }
          }}
        />
      )}

      {/* Budget Alert Popup (UPDATED) */}
      {budgetPopup && (
        <BudgetAlertModal
          data={budgetPopup}
          onClose={() => setBudgetPopup(null)}
          onEdit={() => {
            setBudgetPopup(null)
            setIsEditOpen(true)
          }}
        />
      )}

      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  )
}

// --- Components ---

function BudgetAlertModal({ data, onClose, onEdit }) {
  const isLimit = data?.type === "limit"

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
      <div
        className="
          relative w-full max-w-[580px]
          rounded-[24px] bg-[#F6FBF2]
          pt-14 pb-10 px-6
          shadow-[0_20px_60px_rgba(0,0,0,0.25)]
          overflow-hidden
        "
      >
        {/* ICON */}
        <div className="relative mb-8 flex justify-center">
          {isLimit ? (
            // stop icon
            <svg viewBox="0 0 48 48" className="h-16 w-16 text-[#21421B]" aria-hidden="true">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" />
              <path
                d="M16 16l16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            // smile icon
            <svg viewBox="0 0 48 48" className="h-16 w-16 text-[#21421B]" aria-hidden="true">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" />
              <circle cx="18" cy="20" r="2" fill="currentColor" />
              <circle cx="30" cy="20" r="2" fill="currentColor" />
              <path
                d="M16 29c2.5 3 5.5 4.5 8 4.5s5.5-1.5 8-4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* TITLE */}
        <h2 className="relative mb-3 text-center text-[22px] font-semibold text-black leading-snug">
          {data?.title}
        </h2>

        {/* MESSAGE */}
        <p className="relative mb-8 text-center text-sm text-slate-600 whitespace-pre-line leading-relaxed">
          {data?.message}
        </p>

        {/* ACTIONS */}
        <div className="relative flex justify-center gap-3">
          {/* Primary */}
          <button
            type="button"
            onClick={onClose}
            className="
              rounded-full bg-[#21421B]
              px-10 py-3
              text-sm font-medium text-white
              shadow-[0_8px_20px_rgba(33,66,27,0.35)]
              hover:bg-[#1A3517]
              transition
            "
          >
            Continue
          </button>
        </div>

        {/* top-right close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-black/5 transition"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function SpendingPerMonthChart({ monthlyTotalsCents }) {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const values = (monthlyTotalsCents || []).map(v => Math.round((Number(v) || 0) / 100))

  const data = {
    labels,
    datasets: [
      {
        label: "Spending",
        data: values,
        backgroundColor: labels.map((_, i) => (i % 2 === 0 ? "#CFE0FF" : "#6B7A90")),
        borderRadius: 14,
        borderSkipped: false,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
        minBarLength: 10
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Spending per month",
        padding: { top: 4, bottom: 24 },
        font: { size: 18, weight: "600" }
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: ctx => `$${Number(ctx.parsed.y || 0).toFixed(2)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        max: 200,
        ticks: { stepSize: 50 },
        grid: { display: false }
      }
    }
  }

  return (
    <div className="w-full max-w-3xl h-[320px] rounded-xl overflow-hidden">
      <Bar data={data} options={options} />
    </div>
  )
}

function AlertDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const options = [25, 50, 75, 80, 90, 100]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`h-12 w-full rounded-xl border border-slate-200 bg-white px-4 flex items-center justify-between text-base font-medium text-slate-900 outline-none
          ${open ? "ring-2 ring-[#21421B] border-[#21421B]" : ""}`}
      >
        <span>{value}%</span>
        <svg
          className={`h-5 w-5 text-slate-500 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          <div className="absolute left-0 top-[54px] z-50 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            {options.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onChange(p)
                  setOpen(false)
                }}
                className={`w-full px-4 py-3 text-left text-base font-medium transition-colors
                  ${p === value
                    ? "bg-[#21421B] text-white"
                    : "text-slate-700 hover:bg-slate-50"
                  }`}
              >
                {p}%
              </button>
            ))}
          </div>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close dropdown"
          />
        </>
      )}
    </div>
  )
}

function BudgetEditModal({ budget, alertAt, onClose, onSave }) {
  const [localBudget, setLocalBudget] = useState(budget)
  const [localAlertAt, setLocalAlertAt] = useState(alertAt)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave({ budget: localBudget, alertAt: localAlertAt })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-[380px] rounded-[32px] bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100 transition"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-slate-900">Budget for a month</h2>
        </div>

        <div className="mb-5">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={localBudget}
              onChange={e => {
                const v = e.target.value.replace(/[^\d]/g, "")
                setLocalBudget(v ? Number(v) : 0)
              }}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-base font-medium text-slate-900 outline-none focus:border-[#21421B] focus:ring-1 focus:ring-[#21421B]"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Alert when budget hits</label>
          <AlertDropdown value={localAlertAt} onChange={setLocalAlertAt} />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-2 h-12 w-full rounded-xl bg-[#21421B] text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  )
}

function MonthDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative w-[220px]">
      <button onClick={() => setOpen(!open)} className={`h-10 w-full rounded-xl border border-slate-200 bg-white px-4 flex items-center justify-between text-sm text-slate-700 ${open ? "rounded-b-none" : ""}`}>
        <span>{value}</span>
        <svg className={`h-5 w-5 transition ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <>
          <div className="absolute left-0 top-[40px] z-50 w-full max-h-72 overflow-auto rounded-b-xl border border-t-0 border-slate-200 bg-white shadow-lg">
            {options.map(m => (
              <button key={m} onClick={() => { onChange(m); setOpen(false) }} className={`w-full px-4 py-2 text-left text-sm ${m === value ? "bg-[#21421B] text-white" : "text-slate-700 hover:bg-slate-50"}`}>{m}</button>
            ))}
          </div>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  )
}

function buildBudgetDonutUrl(spentCents, budgetCents) {
  const safeBudget = Math.max(1, Number(budgetCents) || 1)
  const safeSpent = Math.max(0, Number(spentCents) || 0)
  const remaining = Math.max(0, safeBudget - safeSpent)

  const config = {
    type: "doughnut",
    data: {
      labels: ["Spent", "Remaining"],
      datasets: [{
        data: [safeSpent, remaining],
        backgroundColor: ["#21421B", "#E8EFE9"],
        borderWidth: 0
      }]
    },
    options: {
      cutout: "90%", // Thinner ring
      legend: { display: false },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: { display: false },
      }
    }
  }
  return `https://quickchart.io/chart?width=350&height=350&v=${Date.now()}&c=${encodeURIComponent(JSON.stringify(config))}`
}