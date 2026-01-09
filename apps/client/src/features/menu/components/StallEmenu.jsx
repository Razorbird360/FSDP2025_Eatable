import { useMemo, useState, useRef, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import foodStallIcon from "./Assets/FoodStall_Icon.png";
import StallGallery from "../../stalls/components/StallGallery";
import { useCart } from "../../orders/components/CartContext";
import api from "../../../lib/api"; // ⬅️ adjust path if needed

const Icon = {
  MapPin: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s-6-4.35-6-9a6 6 0 1112 0c0 4.65-6 9-6 9z"
      />
      <circle cx="12" cy="12" r="2" strokeWidth="2" />
    </svg>
  ),
  Clock: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 7v5l3 2" />
    </svg>
  ),
  MenuList: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="2" strokeLinecap="round" d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
  Info: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M12 8h.01M11 12h2v5h-2z" />
    </svg>
  ),
  Photo: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="2" />
      <circle cx="8" cy="10" r="2" strokeWidth="2" />
      <path
        d="M21 15l-4.5-4.5L9 18"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  TrendUp: (props) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Search: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="11" cy="11" r="7" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M20 20l-3.5-3.5" />
    </svg>
  ),
  Plus: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="2" strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  ),
  Minus: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="2" strokeLinecap="round" d="M5 12h14" />
    </svg>
  ),
  Chevron: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M9 18l6-6-6-6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Caret: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M6 9l6 6 6-6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Close: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

function ItemDialog({ open, item, onClose, onAdd }) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setQty(1);
      setNotes("");
    }
  }, [item, open]);

  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 w-[92vw] max-w-md rounded-2xl overflow-hidden bg-white shadow-xl">
        <div className="relative">
          <img
            src={item.img}
            alt={item.name}
            className="w-full h-56 object-cover"
          />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 grid place-items-center w-8 h-8 rounded-full bg-white/90 hover:bg-white"
            aria-label="Close"
          >
            <Icon.Close className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="flex-1 text-lg font-semibold leading-snug">
              {item.name}
            </h3>
            <div className="ml-3 shrink-0 text-lg font-semibold leading-snug">
              ${item.price.toFixed(2)}
            </div>
          </div>

          <p className="mt-2 text-sm text-gray-600">{item.desc}</p>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">
              Special Instructions
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. no mayo"
              className="h-12 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-9 w-9 place-items-center rounded-full border bg-white hover:bg-gray-50"
                aria-label="Decrease"
              >
                <Icon.Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[2ch] text-center">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="grid h-9 w-9 place-items-center rounded-full border bg-white hover:bg-gray-50"
                aria-label="Increase"
              >
                <Icon.Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => {
                onAdd?.({ item, qty, notes });
                onClose();
              }}
              className="ml-auto h-10 rounded-xl bg-[#21421B] px-4 text-sm font-medium text-white hover:bg-[#21421B]/90"
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StallEmenu() {
  const { stallId } = useParams();

  const [stall, setStall] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState("menu");
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("All");
  const [openFilter, setOpenFilter] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFullBlurb, setShowFullBlurb] = useState(false);
  const controlsRef = useRef(null);

  const [stallPfp, setStallPfp] = useState(null);

  const [selected, setSelected] = useState(null);
  const [showItem, setShowItem] = useState(false);

  const { addToCart } = useCart();
  const [toast, setToast] = useState(null);

  // Fetch stall from API
  useEffect(() => {
    let cancelled = false;

    async function loadStall() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/stalls/${stallId}`);
        if (cancelled) return;

        const data = res.data; // stall object
        setStallPfp(data.image_url || null);

        setStall(data);
        console.log("Fetched stall data:", data);

        // Map menuItems -> UI menu items
        const mappedMenu =
          (data.menuItems || [])
            .filter((m) => m.isActive !== false)
            .map((m) => {
              // 👇 take the top upload for this menu item (Prisma already limited to 1)
              const topUpload = m.mediaUploads?.[0];



              return {
                id: m.id,
                name: m.name,
                desc: m.description || "",
                price: (m.priceCents || 0) / 100,
                category: m.category || "Others",
                // 👇 use imageUrl from the top upload, fallback to placeholder
                img:
                  topUpload?.imageUrl ||
                  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800",
                // optional: show upvote count from the top upload
                votes:
                  typeof topUpload?.upvoteCount === "number"
                    ? topUpload.upvoteCount
                    : undefined,
              };
            }) || [];

        setMenu(mappedMenu);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Failed to load stall.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (stallId) {
      loadStall();
    }

    return () => {
      cancelled = true;
    };
  }, [stallId]);

  // Build STALL-like meta so JSX doesn’t change much
  const STALL_META = useMemo(() => {
    if (!stall) return null;
    return {
      name: stall.name,
      market: stall.location || "Hawker Centre",
      blurb: stall.description || "",
      address: stall.location || "",
      distance: stall.cuisineType
        ? `${stall.cuisineType} · Hawker stall`
        : "Hawker stall",
      waitTime: "Approx. 10–15 mins", // placeholder until you have real data
      hours: "8:00 AM – 8:00 PM", // placeholder
      days: "Daily", // placeholder
    };
  }, [stall]);

  const sections = useMemo(() => {
    const list = Array.from(new Set(menu.map((m) => m.category)));
    return ["All", ...list];
  }, [menu]);

  useEffect(() => {
    function onDocClick(e) {
      if (controlsRef.current && !controlsRef.current.contains(e.target)) {
        setOpenFilter(false);
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.filter((m) => {
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.desc.toLowerCase().includes(q) ||
        String(m.price).includes(q);
      const matchSection =
        activeSection === "All" || m.category === activeSection;
      return matchQuery && matchSection;
    });
  }, [query, activeSection, menu]);

  const grouped = useMemo(() => {
    const bucket = {};
    for (const item of filtered) {
      const key = item.category || "Others";
      bucket[key] ??= [];
      bucket[key].push(item);
    }
    const order = sections.filter((s) => s !== "All");
    return order
      .filter((s) => bucket[s]?.length)
      .map((s) => ({ section: s, items: bucket[s] }));
  }, [filtered, sections]);

  const crumbs = [
    { label: "Home", to: "/" },
    { label: "Hawkers", to: "/hawker-centres" },
    { label: STALL_META?.market || "Stall" },
  ];

  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < 768 : true;
  const blurbLimit = 100;
  const blurb =
    showFullBlurb || !STALL_META
      ? STALL_META?.blurb || ""
      : STALL_META.blurb.length > blurbLimit
        ? STALL_META.blurb.slice(0, blurbLimit) + "…"
        : STALL_META.blurb;

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="fixed inset-0 -z-10 bg-[#F5F7F2]" />
        <main className="relative z-10 mx-auto w-full max-w-[430px] px-3 py-5 sm:px-4 md:max-w-6xl">
          <p className="text-sm text-gray-600">Loading stall…</p>
        </main>
      </div>
    );
  }

  if (error || !STALL_META) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="fixed inset-0 -z-10 bg-[#F5F7F2]" />
        <main className="relative z-10 mx-auto w-full max-w-[430px] px-3 py-5 sm:px-4 md:max-w-6xl">
          <p className="text-sm text-red-600">
            {error || "Stall not found."}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 -z-10 bg-[#F5F7F2]" />

      <main className="relative z-10 mx-auto w-full max-w-[430px] px-3 py-5 sm:px-4 md:max-w-6xl">
        <nav className="mt-4 mb-3 md:mt-0">
          <ol className="flex items-center gap-1.5 text-xs md:text-sm">
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={i} className="flex items-center gap-1.5">
                  {c.to ? (
                    <Link
                      to={c.to}
                      className="text-gray-700 hover:text-[#21421B]"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-900">
                      {c.label}
                    </span>
                  )}
                  {!isLast && (
                    <Icon.Chevron className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <section className="rounded-2xl py-6 px-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] relative overflow-hidden md:bg-white md:border md:border-slate-200">
          {/* Background image for mobile */}
          <div 
            className="absolute inset-0 md:hidden bg-cover bg-center"
            style={{ backgroundImage: `url(${stallPfp || foodStallIcon})` }}
          />
          
          {/* Dark overlay for mobile */}
          <div className="absolute inset-0 bg-black/60 md:hidden" />
          
          {/* White background for desktop */}
          <div className="hidden md:block absolute inset-0 bg-white" />

          <div className="hidden md:block w-52 h-52 flex-shrink-0 rounded-xl overflow-hidden relative z-10 border">
            <img
              src={stallPfp || foodStallIcon}
              alt="stall"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content section */}
          <div className="flex-1 flex flex-col gap-3 relative z-10 justify-center md:justify-start">
            {/* Title + description */}
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-white md:text-slate-900">
                {STALL_META.name}
              </h1>
              <p className="text-sm font-medium text-white/80 md:text-gray-600 mt-0.5">
                ({STALL_META.market})
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/90 md:text-gray-600">
                {blurb}
                {isMobile && STALL_META.blurb.length > blurbLimit && (
                  <button
                    onClick={() => setShowFullBlurb((v) => !v)}
                    className="ml-1 font-medium text-white underline md:text-[#21421B] md:no-underline md:hover:underline"
                  >
                    {showFullBlurb ? "show less" : "more"}
                  </button>
                )}
              </p>
            </div>

            {/* Location + Wait time row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/90 md:text-gray-600">
              {/* Location */}
              <div className="flex items-start gap-2">
                <div className="mt-[2px] flex h-6 w-6 items-center justify-center rounded-full border border-white/50 md:border-gray-300">
                  <Icon.MapPin className="h-3.5 w-3.5 text-white md:text-gray-600" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70 md:text-gray-500">
                    Location
                  </p>
                  <p className="text-sm font-medium text-white md:text-gray-800">
                    {STALL_META.address}
                  </p>
                  <p className="text-xs text-white/70 md:text-gray-500">
                    {STALL_META.distance}
                  </p>
                </div>
              </div>

              {/* Wait time */}
              <div className="flex items-start gap-2">
                <div className="mt-[2px] flex h-6 w-6 items-center justify-center rounded-full border border-white/50 md:border-gray-300">
                  <Icon.Clock className="h-3.5 w-3.5 text-white md:text-gray-600" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70 md:text-gray-500">
                    Estimated waiting time
                  </p>
                  <p className="text-sm font-medium text-white md:text-gray-800">
                    {STALL_META.waitTime}
                  </p>
                </div>
              </div>
            </div>

            {/* View on map button */}
            <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-full bg-white md:bg-[#21421B] text-[#21421B] md:text-white w-max hover:bg-white/90 md:hover:bg-[#21421B]/90 transition-colors">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M4 7l6-2 6 2 4-1v11l-4 1-6-2-6 2-4-1V8z"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              View on map
            </button>
          </div>
        </section>

        <section className="mt-5" ref={controlsRef}>
          {/* Tab toggles row */}
          <div className="flex items-center justify-between">
            <div className="inline-flex bg-white border border-[#E5E5E5] rounded-xl p-1 gap-[3px]">
              <button
                onClick={() => setTab("menu")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg font-medium transition-colors ${tab === "menu"
                    ? "bg-[#21421B] text-white"
                    : "text-gray-400"
                  }`}
              >
                <Icon.MenuList className="h-4 w-4" />
                Menu
              </button>
              <button
                onClick={() => setTab("photos")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg font-medium transition-colors ${tab === "photos"
                    ? "bg-[#21421B] text-white"
                    : "text-gray-400"
                  }`}
              >
                <Icon.Photo className="h-4 w-4" />
                Photos
              </button>
              <button
                onClick={() => setTab("about")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg font-medium transition-colors ${tab === "about"
                    ? "bg-[#21421B] text-white"
                    : "text-gray-400"
                  }`}
              >
                <Icon.Info className="h-4 w-4" />
                About
              </button>
            </div>
          </div>

          {/* Filter controls row - only shown on menu tab */}
          {tab === "menu" && (
            <div className="mt-3 flex items-start gap-2">
              <div className="relative h-10">
                <button
                  onClick={() => {
                    setOpenFilter((v) => !v);
                    setShowSearch(false);
                  }}
                  className="flex h-10 items-center justify-between gap-2 rounded-xl border bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 min-w-[100px]"
                >
                  <span className="truncate">
                    {activeSection === "All" ? "Filter" : activeSection}
                  </span>
                  <Icon.Caret className="h-4 w-4 text-gray-500 flex-shrink-0" />
                </button>

                {openFilter && (
                  <div className="absolute left-0 top-full mt-1 z-20 w-44 rounded-xl border bg-white py-1 shadow-lg">
                    {sections.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setActiveSection(s);
                          setOpenFilter(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${activeSection === s
                            ? "font-medium text-[#21421B]"
                            : "text-gray-800"
                          }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search button - next to filter */}
              <div className="relative flex items-center">
                <button
                  onClick={() => {
                    setShowSearch(true);
                    setOpenFilter(false);
                  }}
                  className={`grid h-10 w-10 place-items-center rounded-xl border bg-white hover:bg-gray-50 ${showSearch ? "hidden" : ""
                    }`}
                  aria-label="Open search"
                >
                  <Icon.Search className="h-4 w-4 text-gray-700" />
                </button>

                <div
                  className={`absolute left-0 top-0 z-30 h-10 overflow-hidden transition-all duration-300 ${showSearch
                      ? "w-[200px] opacity-100 sm:w-[240px]"
                      : "pointer-events-none w-0 opacity-0"
                    }`}
                >
                  <div className="relative h-full">
                    <Icon.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && e.preventDefault()
                      }
                      placeholder="Search in menu"
                      className="h-full w-full rounded-xl border bg-white pl-9 pr-9 text-sm outline-none focus:border-gray-300"
                    />
                    <button
                      onClick={() => {
                        setQuery("");
                        setShowSearch(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-gray-100"
                      aria-label="Close search"
                      type="button"
                    >
                      <Icon.Close className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "menu" && (
            <>
              {grouped.length === 0 ? (
                <div className="mt-3 rounded-xl border bg-white p-5 text-sm text-gray-600">
                  No results for{" "}
                  <span className="font-medium">
                    “{query || activeSection}”
                  </span>{" "}
                  try a different term
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {grouped.map(({ section, items }) => (
                    <div key={section}>
                      <h2 className="mb-2 text-[15px] font-semibold text-gray-800">
                        {section}
                      </h2>
                      <ul className="-mt-1 space-y-2">
                        {items.map((item) => (
                          <li
                            key={`${item.id}-${item.name}`}
                            className="flex cursor-pointer items-center gap-2.5 rounded-xl border bg-white p-2.5 md:p-4"
                            onClick={() => {
                              setSelected(item);
                              setShowItem(true);
                            }}
                          >
                            <img
                              src={item.img}
                              alt={item.name}
                              className="h-14 w-14 rounded-lg border object-cover sm:h-20 sm:w-20"
                            />
                            <div className="flex-1">
                              <div className="text-[15px] font-semibold">
                                {item.name}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-[13px] text-gray-800">
                                <span>${item.price.toFixed(2)}</span>
                                {typeof item.votes === "number" && (
                                  <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                    <Icon.TrendUp className="h-3 w-3" />
                                    {item.votes}
                                  </span>
                                )}
                              </div>

                              <p className="mt-0.5 line-clamp-2 text-[12px] text-gray-600">
                                {item.desc}
                              </p>
                            </div>
                            <button
                              className="ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#21421B] text-white hover:bg-[#21421B]/90"
                              aria-label={`Add ${item.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(item);
                                setShowItem(true);
                              }}
                            >
                              <Icon.Plus className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "photos" && (
            <div className="mt-3">
              <StallGallery
                onNavigateToMenuItem={(menuItemId) => {
                  // Switch to menu tab
                  setTab("menu");

                  // Find the menu item by ID
                  const menuItem = menu.find(item => item.id === menuItemId);
                  if (menuItem) {
                    // Open the item dialog
                    setSelected(menuItem);
                    setShowItem(true);
                  }
                }}
              />
            </div>
          )}

          {tab === "about" && (
            <div className="mt-3 rounded-xl border bg-white p-4 text-sm text-gray-700">
              <p>{STALL_META.blurb}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">Address</div>
                  <div className="font-medium">{STALL_META.address}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">Opening hours</div>
                  <div className="font-medium">
                    {STALL_META.hours} — {STALL_META.days}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <ItemDialog
        open={showItem}
        item={selected}
        onClose={() => setShowItem(false)}
        onAdd={({ item, qty, notes }) => {
          addToCart(
            {
              ...item,
              stallName: STALL_META.name,
              stallMarket: STALL_META.market,
              stallId: stall.id,
            },
            qty,
            notes
          );
          console.log("Added to cart:", stall.id);
          setToast({ message: `Added ${item.name} x${qty} to cart` });
          setTimeout(() => setToast(null), 1800);
        }}
      />

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
          <div className="rounded-full bg-gray-900 px-4 py-2 text-xs text-white sm:text-sm shadow-lg">
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
