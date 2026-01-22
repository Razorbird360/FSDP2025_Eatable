import { useEffect, useRef, useState } from "react";
import api from "@lib/api";
import { formatPrice } from "../utils/helpers";

export default function BudgetAlertProvider({ children }) {
  const [budgetPopup, setBudgetPopup] = useState(null);

  const busyRef = useRef(false);
  const timerRef = useRef(null);
  const recheckTimeoutRef = useRef(null);

  // ✅ Prevent duplicate popups if poll runs multiple times quickly
  const showingRef = useRef(false);

  const poll = async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      // if popup already open, don't open another
      if (showingRef.current) return;

      const now = new Date();
      const yearNumber = now.getFullYear();
      const monthNumber = now.getMonth() + 1;
      const selectedMonthIndex = monthNumber - 1;

      // 1) Fetch budget for current month
      const budgetRes = await api.get("/budget/monthly", {
        params: { year: yearNumber, month: monthNumber },
      });

      const b = budgetRes.data?.budget;
      if (!b) return;

      const budgetCapCents = Math.max(0, Number(b?.budgetCents || 0));
      const alertAt = Number(b?.alertAtPercent ?? 80);

      // ✅ NEW flags (2 alerts)
      const notifiedThresholdAlready = Boolean(b?.notifiedThresholdAlready ?? false);
      const notifiedLimitAlready = Boolean(b?.notifiedLimitAlready ?? false);

      if (!budgetCapCents) return;

      // 2) Fetch orders
      const ordersRes = await api.get("/orders/my");
      const orders = ordersRes.data?.orders || [];

      const completedOrders = (orders || []).filter((o) =>
        ["completed", "paid"].includes(String(o?.status || "").toLowerCase())
      );

      // current month spend (createdAt)
      const monthOrders = completedOrders.filter((o) => {
        const d = new Date(o?.createdAt);
        if (Number.isNaN(d.getTime())) return false;
        return d.getFullYear() === yearNumber && d.getMonth() === selectedMonthIndex;
      });

      const spentCents = (monthOrders || []).reduce(
        (sum, o) => sum + (Number(o?.totalCents) || 0),
        0
      );

      const percent =
        budgetCapCents > 0 ? Math.round((spentCents / budgetCapCents) * 100) : 0;

      const hardLimitCents = budgetCapCents;
      const alertThresholdCents = Math.round(budgetCapCents * (alertAt / 100));

      const reachedHardLimit = spentCents >= hardLimitCents;
      const reachedAlert =
        alertAt < 100 &&
        spentCents >= alertThresholdCents &&
        spentCents < hardLimitCents;

      const showPopup = async (type, title, message, level) => {
        if (showingRef.current) return;

        showingRef.current = true;
        setBudgetPopup({ type, title, message });

        try {
          await api.post("/budget/monthly/notify", {
            year: yearNumber,
            month: monthNumber,
            level, // "threshold" | "limit"
          });
        } catch {
          // ignore
        }
      };

      // ✅ Priority: 100% popup first
      if (reachedHardLimit && !notifiedLimitAlready) {
        await showPopup(
          "limit",
          "Budget limit reached",
          `You have used 100% of your budget.\n${formatPrice(spentCents)} / ${formatPrice(
            budgetCapCents
          )} spent`,
          "limit"
        );
        return;
      }

      // ✅ Then threshold popup
      if (reachedAlert && !notifiedThresholdAlready) {
        await showPopup(
          "warning",
          "Budget alert",
          `You have used ${Math.max(0, percent)}% of your budget.\n${formatPrice(
            spentCents
          )} / ${formatPrice(budgetCapCents)} spent`,
          "threshold"
        );
      }
    } catch {
      // ignore (eg 401)
    } finally {
      busyRef.current = false;
    }
  };

  useEffect(() => {
    poll();

    // Poll every 30s
    timerRef.current = setInterval(poll, 30_000);

    // Re-check when user returns to tab
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);

    // Re-check shortly after events
    const onRecheck = () => {
      if (recheckTimeoutRef.current) clearTimeout(recheckTimeoutRef.current);
      recheckTimeoutRef.current = setTimeout(() => poll(), 1200);
    };

    window.addEventListener("budget:changed", onRecheck);
    window.addEventListener("payment:success", onRecheck);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recheckTimeoutRef.current) clearTimeout(recheckTimeoutRef.current);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("budget:changed", onRecheck);
      window.removeEventListener("payment:success", onRecheck);
    };
  }, []);

  return (
    <>
      {children}

      {budgetPopup && (
        <BudgetAlertModal
          data={budgetPopup}
          onClose={() => {
            showingRef.current = false;
            setBudgetPopup(null);
          }}
        />
      )}
    </>
  );
}

function BudgetAlertModal({ data, onClose }) {
  const isLimit = data?.type === "limit";

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
        <div className="relative mb-8 flex justify-center">
          {isLimit ? (
            <svg viewBox="0 0 48 48" className="h-16 w-16 text-[#21421B]" aria-hidden="true">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" />
              <path d="M16 16l16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
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

        <h2 className="relative mb-3 text-center text-[22px] font-semibold text-black leading-snug">
          {data?.title}
        </h2>

        <p className="relative mb-8 text-center text-sm text-slate-600 whitespace-pre-line leading-relaxed">
          {data?.message}
        </p>

        <div className="relative flex justify-center gap-3">
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
  );
}
