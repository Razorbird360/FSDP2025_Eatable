// pages/StallEmenu.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import foodStallIcon from "./Assets/FoodStall_Icon.png";
import { Link } from "react-router-dom";

const STALL = {
  name: "Ah Heng Coffee Stall",
  market: "Tiong Bahru Market",
  address: "Tiong Bahru Market #02-05",
  distance: "0.3 km away",
  hours: "6:00 AM - 10:00 PM",
  days: "Daily",
  blurb:
    "Started in 1985 we roast our kopi beans with butter and sugar every morning — cannot rush one. Our kaya also homemade using the same recipe for 40 years already. You try once confirm come back again",
};

// Add a section field so each item lives under a header
const MENU = [
  {
    id: 1,
    section: "Breakfast",
    name: "French Toast with Kaya",
    price: 4.9,
    desc:
      "Soft golden toast slices dipped in egg and grilled then spread generously with Ya Kun’s signature kaya and butter.",
    img: "https://app.yakun.com/media/catalog/product/cache/f77d76b011e98ab379caeb79cadeeecd/f/r/french-toast-with-kaya.jpg",
  },
  {
    id: 4,
    section: "Breakfast",
    name: "French Toast",
    price: 4.9,
    desc:
      "Soft golden toast slices dipped in egg and grilled then spread generously with Ya Kun’s signature kaya and butter.",
    img: "https://app.yakun.com/media/catalog/product/cache/f77d76b011e98ab379caeb79cadeeecd/f/r/french-toast-with-kaya.jpg",
  },
  {
    id: 2,
    section: "Toastwich",
    name: "Tuna Mayo Toastwich",
    price: 5.5,
    desc:
      "Toasted sandwich filled with creamy tuna mayonnaise served hot and crispy — perfect for a light meal.",
    img: "https://app.yakun.com/media/catalog/product/cache/f77d76b011e98ab379caeb79cadeeecd/t/u/tuna-mayo-toastwich.jpg",
  },
  {
    id: 3,
    section: "Breakfast Set",
    name: "Soft-Boiled Eggs with Kaya Toast",
    price: 6.2,
    desc:
      "Classic Ya Kun breakfast set featuring kaya toast two perfectly soft-boiled eggs and a cup of traditional kopi or teh.",
    img: "https://www.seriouseats.com/thmb/EZYSWSoZpgIpE7_bdqr-jpnpEEs%3D/1500x0/filters%3Ano_upscale%28%29%3Amax_bytes%28150000%29%3Astrip_icc%28%29/__opt__aboutcom__coeus__resources__content_migration__serious_eats__seriouseats.com__recipes__images__2014__09__20140917-singapore-soft-eggs-kaya-toast-2-44f258b0f6d34a9e89b0acb102955c6a.jpg",
  },
];

// tiny inline svg icons
const Icon = {
  MapPin: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-4.35-6-9a6 6 0 1112 0c0 4.65-6 9-6 9z" />
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
      <path d="M21 15l-4.5-4.5L9 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
      <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Caret: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Close: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

// Item modal
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
    // reset when switching items
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
        {/* top photo */}
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

        {/* body */}
        <div className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="flex-1 text-lg font-semibold leading-snug">
              {item.name}
            </h3>
            <div className="text-lg font-semibold leading-snug shrink-0 ml-3">
              ${item.price.toFixed(2)}
            </div>
          </div>
                
          <p className="mt-2 text-sm text-gray-600">{item.desc}</p>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Special Instructions
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. no mayo"
              className="w-full h-12 px-3 rounded-xl border bg-white text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-9 h-9 grid place-items-center rounded-full border bg-white hover:bg-gray-50"
                aria-label="Decrease"
              >
                <Icon.Minus className="w-4 h-4" />
              </button>
              <span className="min-w-[2ch] text-center">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-9 h-9 grid place-items-center rounded-full border bg-white hover:bg-gray-50"
                aria-label="Increase"
              >
                <Icon.Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                onAdd?.({ item, qty, notes });
                onClose();
              }}
              className="ml-auto px-4 h-10 rounded-xl bg-[#21421B] text-white text-sm font-medium hover:bg-[#21421B]/90"
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
  const [tab, setTab] = useState("menu");
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("All");
  const [openFilter, setOpenFilter] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const controlsRef = useRef(null);

  // new: selected item modal state
  const [selected, setSelected] = useState(null);
  const [showItem, setShowItem] = useState(false);

  // sections in the order they first appear
  const sections = useMemo(() => {
    const list = Array.from(new Set(MENU.map((m) => m.section)));
    return ["All", ...list];
  }, []);

  // click outside to close filter and search
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

  // filtering logic by query and section
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MENU.filter((m) => {
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.desc.toLowerCase().includes(q) ||
        String(m.price).includes(q);
      const matchSection = activeSection === "All" || m.section === activeSection;
      return matchQuery && matchSection;
    });
  }, [query, activeSection]);

  // group into {section: items[]} for rendering headers
  const grouped = useMemo(() => {
    const bucket = {};
    for (const item of filtered) {
      bucket[item.section] ??= [];
      bucket[item.section].push(item);
    }
    const order = sections.filter((s) => s !== "All");
    return order
      .filter((s) => bucket[s]?.length)
      .map((s) => ({ section: s, items: bucket[s] }));
  }, [filtered, sections]);

  // breadcrumb
  const crumbs = [
    { label: "Home", to: "/" },
    { label: "Hawkers", to: "/hawkers" },
    { label: STALL.market },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F2]">
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* breadcrumb */}
        <nav className="mb-3">
          <ol className="flex items-center gap-2 text-sm">
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={i} className="flex items-center gap-2">
                  {c.to ? (
                    <Link to={c.to} className="text-gray-700 hover:text-[#21421B]">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-900">{c.label}</span>
                  )}
                  {!isLast && <Icon.Chevron className="w-4 h-4 text-gray-400" />}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* stall hero */}
        <section className="bg-white rounded-2xl border p-4 md:p-6 flex gap-4">
          <img
            src={foodStallIcon}
            alt="stall"
            className="w-28 h-28 md:w-40 md:h-40 object-cover rounded-xl border"
          />
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-semibold">
              {STALL.name}{" "}
              <span className="text-gray-600 font-normal">({STALL.market})</span>
            </h1>
            <p className="text-xs md:text-sm text-gray-600 mt-1 leading-snug line-clamp-2">
              {STALL.blurb}
            </p>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2 text-sm">
                <Icon.MapPin className="w-4 h-4 mt-0.5" />
                <div>
                  <div className="font-medium">{STALL.address}</div>
                  <div className="text-gray-600 text-xs">{STALL.distance}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Icon.Clock className="w-4 h-4 mt-0.5" />
                <div>
                  <div className="font-medium">{STALL.hours}</div>
                  <div className="text-gray-600 text-xs">{STALL.days}</div>
                </div>
              </div>
            </div>

            <button className="mt-3 inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg bg-[#21421B] text-white hover:bg-[#21421B]/90">
              View on map
            </button>
          </div>
        </section>

        {/* tabs + controls */}
        <section className="mt-6">
          <div className="flex items-center justify-between gap-3" ref={controlsRef}>
            {/* tabs */}
            <div className="inline-flex bg-white rounded-xl border p-1">
              <button
                onClick={() => setTab("menu")}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${
                  tab === "menu"
                    ? "bg-[#21421B] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon.MenuList className="w-4 h-4" />
                Menu
              </button>
              <button
                onClick={() => setTab("photos")}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${
                  tab === "photos"
                    ? "bg-[#21421B] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon.Photo className="w-4 h-4" />
                Photos
              </button>
              <button
                onClick={() => setTab("about")}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${
                  tab === "about"
                    ? "bg-[#21421B] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon.Info className="w-4 h-4" />
                About
              </button>
            </div>

            {/* filter + expanding search */}
            {tab === "menu" && (
              <div className="relative flex items-center gap-2">
                {/* Filter button */}
                <button
                  onClick={() => {
                    setOpenFilter((v) => !v);
                    setShowSearch(false);
                  }}
                  className="relative w-40 h-10 rounded-xl border bg-white px-3 text-sm text-gray-700 flex items-center justify-between hover:bg-gray-50 focus:outline-none"
                >
                  <span className="truncate">
                    {activeSection === "All" ? "Filter" : activeSection}
                  </span>
                  <Icon.Caret className="w-4 h-4 text-gray-500" />
                </button>

                {/* Dropdown */}
                {openFilter && (
                  <div className="absolute right-12 top-12 z-20 w-40 rounded-xl border bg-white shadow-sm py-1">
                    {sections.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setActiveSection(s);
                          setOpenFilter(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                          activeSection === s ? "font-medium text-[#21421B]" : "text-gray-800"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search trigger button */}
                <button
                  onClick={() => {
                    setShowSearch(true);
                    setOpenFilter(false);
                  }}
                  className={`w-10 h-10 grid place-items-center rounded-xl border bg-white hover:bg-gray-50 ${
                    showSearch ? "hidden" : ""
                  }`}
                  aria-label="Open search"
                >
                  <Icon.Search className="w-4 h-4 text-gray-700" />
                </button>

                {/* Expanding search bar with inside close X */}
                <div
                  className={`absolute right-0 top-0 h-10 z-30 transition-all duration-300 overflow-hidden ${
                    showSearch
                      ? "w-[11rem] md:w-[14rem]"
                      : "w-0 opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="relative h-full">
                    <Icon.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault();
                      }}
                      placeholder="Search in menu"
                      className="w-full h-10 pl-9 pr-9 rounded-xl border bg-white text-sm outline-none focus:border-gray-300"
                    />
                    {/* close X inside the field */}
                    <button
                      onClick={() => {
                        setQuery("");
                        setShowSearch(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                      aria-label="Close search"
                      type="button"
                    >
                      <Icon.Close className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MENU CONTENT */}
          {tab === "menu" && (
            <>
              {grouped.length === 0 ? (
                <div className="mt-4 bg-white border rounded-xl p-6 text-sm text-gray-600">
                  No results for <span className="font-medium">“{query || activeSection}”</span> try a different term
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {grouped.map(({ section, items }) => (
                    <div key={section}>
                      <h2 className="text-lg font-semibold text-gray-800 mb-3">{section}</h2>
                      <ul className="space-y-2 -mt-2.5">
                        {items.map((item) => (
                          <li
                            key={`${item.id}-${item.name}`}
                            className="bg-white rounded-xl border p-3 md:p-4 flex items-center gap-3 cursor-pointer"
                            onClick={() => {
                              setSelected(item);
                              setShowItem(true);
                            }}
                          >
                            <img
                              src={item.img}
                              alt={item.name}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border"
                            />
                            <div className="flex-1">
                              <div className="font-semibold">{item.name}</div>
                              <div className="text-sm text-gray-800 mt-0.5">
                                ${item.price.toFixed(2)}
                              </div>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {item.desc}
                              </p>
                            </div>
                            <button
                              className="ml-2 shrink-0 w-8 h-8 rounded-full bg-[#21421B] text-white grid place-items-center hover:bg-[#21421B]/90"
                              aria-label={`Add ${item.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(item);
                                setShowItem(true);
                              }}
                            >
                              <Icon.Plus className="w-4 h-4" />
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

          {/* PHOTOS CONTENT respects search and section */}
          {tab === "photos" && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filtered.map((m) => (
                <img
                  key={`${m.id}-${m.name}`}
                  src={m.img}
                  alt={m.name}
                  className="w-full aspect-square object-cover rounded-lg border"
                />
              ))}
            </div>
          )}

          {tab === "about" && (
            <div className="mt-4 bg-white rounded-xl border p-4 text-sm text-gray-700">
              <p>
                We serve classic local breakfast sets with kopi or teh choose your bread spread
                and add-ons. Freshly brewed all day
              </p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border">
                  <div className="text-xs text-gray-500">Address</div>
                  <div className="font-medium">{STALL.address}</div>
                </div>
                <div className="p-3 rounded-lg border">
                  <div className="text-xs text-gray-500">Opening hours</div>
                  <div className="font-medium">
                    {STALL.hours} — {STALL.days}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Item modal */}
      <ItemDialog
        open={showItem}
        item={selected}
        onClose={() => setShowItem(false)}
        onAdd={({ item, qty, notes }) => {
          // hook up to your cart here
          // console.log("add", item.name, qty, notes);
        }}
      />
    </div>
  );
}
