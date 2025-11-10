import React, { useEffect, useRef } from "react";

export default function StallGallery() {
  const gridRef = useRef(null);

  useEffect(() => {
    let gridInstance;
    let onResize;

    const initBento = async () => {
      const { default: BentoGrid } = await import(
        "https://cdn.jsdelivr.net/npm/@bentogrid/core@1.1.1/BentoGrid.min.js"
      );

      // Wait for the container to mount
      const container = await new Promise((resolve) => {
        const check = () =>
          gridRef.current ? resolve(gridRef.current) : requestAnimationFrame(check);
        check();
      });

      const imgs = [
        "https://images.unsplash.com/photo-1580832817674-8e0169c9bfa7?q=80&w=1200",
        "https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=1200",
        "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=1200",
        "https://images.unsplash.com/photo-1514512364185-4c2b3f3f0b38?q=80&w=1200",
        "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?q=80&w=1200",
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200",
        "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200",
      ];

      // -------- layout rules --------
      // No tall items: use only 1-row spans.
      // (Flip ALLOW_OCCASIONAL_TALL to true if you ever want a few 1x2 tiles.)
      const ALLOW_OCCASIONAL_TALL = false;
      const TALL_RATIO = 0.0; // 0% tall

      const pickShape = (i) => {
        const w = container.clientWidth;
        const isMd = w >= 768;
        const isLg = w >= 1024;

        // Short (1-row) shapes only
        const shortSm = ["1x1", "2x1"];
        const shortMd = ["1x1", "2x1", "3x1"];
        const shortLg = ["1x1", "2x1", "3x1"];

        // If you ever allow tall items, define them here
        const tallSm = ["1x1"];               // rarely on small screens
        const tallMd = ["1x1"];               // still rare
        const tallLg = ["1x1"];               // optional

        // choose pools by width
        const shortPool = isLg ? shortLg : isMd ? shortMd : shortSm;
        const tallPool  = isLg ? tallLg  : isMd ? tallMd  : tallSm;

        // Decide if this index can be tall
        const wantTall = ALLOW_OCCASIONAL_TALL && Math.random() < TALL_RATIO;
        const pool = wantTall ? tallPool : shortPool;

        return pool[Math.floor(Math.random() * pool.length)];
      };

      // Build tiles in the **same order** as the array
      container.innerHTML = imgs
        .map(
          (src, i) => `
            <div data-bento="${pickShape(i)}" data-bento-order="${i}" class="relative overflow-hidden rounded-lg">
              <img src="${src}" class="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          `
        )
        .join("");

      // Initialize BentoGrid
      gridInstance = new BentoGrid({
        target: container,
        cellGap: 6,
        aspectRatio: 5 / 4,         // landscape-ish => naturally shorter cells
        minCellWidth: 120,          // small cells = dense grid
        breakpointReference: "window",
        balanceFillers: false,      // keep strict array order
        breakpoints: {
          640:  { minCellWidth: 130, cellGap: 8 },
          768:  { minCellWidth: 140, cellGap: 10 },
          1024: { minCellWidth: 150, cellGap: 10 },
          1280: { minCellWidth: 170, cellGap: 12 },
        },
      });

      onResize = () => gridInstance.layout();
      window.addEventListener("resize", onResize);
    };

    initBento();

    return () => {
      if (onResize) window.removeEventListener("resize", onResize);
      if (gridInstance?.destroy) gridInstance.destroy();
    };
  }, []);

  return (
    <section className="mt-12 mb-16 px-4 md:px-8">
      <h2 className="mb-6 text-2xl font-semibold text-emerald-950">
        Community Favourites
      </h2>
      <div
        ref={gridRef}
        id="bento-grid"
        className="bentogrid max-w-7xl mx-auto w-full"
      />
    </section>
  );
}
