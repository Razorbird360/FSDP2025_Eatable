// components/BentoGrid.jsx
import React from "react";

// --- tiny seeded RNG so layout is stable for each item id/url ---
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);

// Choose a span “shape” with weighted randomness
function pickShape(seed) {
  const rnd = mulberry32(seed)();
  // weights: many singles, some wides/talls, a few bigs
  if (rnd < 0.58) return { c: 1, r: 1 };      // 1x1
  if (rnd < 0.78) return { c: 2, r: 1 };      // 2x1 (wide)
  if (rnd < 0.93) return { c: 1, r: 2 };      // 1x2 (tall)
  return { c: 2, r: 2 };                      // 2x2 (big)
}

export default function BentoGrid({ items }) {
  return (
    <div
      className="
        grid grid-flow-dense gap-3
        grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6
        [grid-auto-rows:120px] sm:[grid-auto-rows:140px] lg:[grid-auto-rows:110px]
      "
    >
      {items.map((src, i) => {
        const seed = hash(String(src) + "-" + i);
        const { c, r } = pickShape(seed);

        // clamp spans to current breakpoints: on small screens,
        // keep things simple so we don't create empty gaps.
        const colSpan =
          "col-span-" +
          (typeof window !== "undefined" && window.innerWidth < 1024 ? 1 : Math.min(c, 2));
        const rowSpan = "row-span-" + r;

        return (
          <figure
            key={i}
            className={`overflow-hidden rounded-md border border-emerald-100 bg-white ${colSpan} ${rowSpan}`}
          >
            <img
              src={src}
              alt={`Tile ${i + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
            />
          </figure>
        );
      })}
    </div>
  );
}
