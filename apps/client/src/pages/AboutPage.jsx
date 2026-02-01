import { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import aboutUsImage from "../assets/about/aboutUs.jpg";

function AboutPage() {
  const [stats, setStats] = useState({
    activeStalls: null,
    menuItemsWithPrep: null,
    stallsWithUploads: null,
  });
  const [displayStats, setDisplayStats] = useState({
    activeStalls: null,
    menuItemsWithPrep: null,
    stallsWithUploads: null,
  });
  const animationFrameRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        const res = await api.get("/about/stats");
        const percentages = res.data?.percentages || {};
        if (!isMounted) return;
        const nextStats = {
          activeStalls: percentages.activeStalls ?? null,
          menuItemsWithPrep: percentages.menuItemsWithPrep ?? null,
          stallsWithUploads: percentages.stallsWithUploads ?? null,
        };
        setStats(nextStats);
        setDisplayStats({
          activeStalls: nextStats.activeStalls ? 0 : null,
          menuItemsWithPrep: nextStats.menuItemsWithPrep ? 0 : null,
          stallsWithUploads: nextStats.stallsWithUploads ? 0 : null,
        });
      } catch (error) {
        console.error("[AboutPage] Failed to load stats", error);
      }
    };
    loadStats();
    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const hasTargets =
      typeof stats.activeStalls === "number" ||
      typeof stats.menuItemsWithPrep === "number" ||
      typeof stats.stallsWithUploads === "number";

    if (!hasTargets) {
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const start = performance.now();
    const durationMs = 1200;
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -8 * t));

    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutExpo(progress);

      setDisplayStats({
        activeStalls:
          typeof stats.activeStalls === "number"
            ? Math.round(stats.activeStalls * eased)
            : null,
        menuItemsWithPrep:
          typeof stats.menuItemsWithPrep === "number"
            ? Math.round(stats.menuItemsWithPrep * eased)
            : null,
        stallsWithUploads:
          typeof stats.stallsWithUploads === "number"
            ? Math.round(stats.stallsWithUploads * eased)
            : null,
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [stats]);

  const formatPercent = (value) =>
    typeof value === "number" ? `${value}%` : "--";

  return (
    <div className="min-h-screen bg-[#FBF7F0]">
      {/* Hero Section with Background Image */}
      <section className="relative w-full h-[50vh] min-h-[400px] overflow-hidden">
        <img
          src={aboutUsImage}
          alt="Hawker centre dining experience with various local dishes"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Semi-transparent overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Hero Text Content */}
        <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-24">
          <h1 className="text-white text-5xl sm:text-6xl md:text-7xl font-serif italic font-light mb-4">
            About Us
          </h1>
          <p className="text-white text-lg sm:text-xl md:text-2xl font-semibold max-w-md">
            Empowering Hawker Centers,
            <br />
            Embracing Changes
          </p>
        </div>
      </section>

      {/* Mission Statement Section */}
      <section className="px-6 sm:px-12 md:px-16 lg:px-24 py-12 md:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
            We connect hawker centres and diners through a community-powered menu experience. Diners share
            real food photos, upvote favourites, and help stalls showcase their best dishes. Hawkers get a
            simple digital storefront, and customers get clear, updated menus with quick ordering and payment.
          </p>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="px-6 sm:px-12 md:px-16 lg:px-24 py-8 md:py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-[#21421B]/30">
          {/* Stat 1 */}
          <div className="flex flex-col items-center text-center py-4 md:py-0">
            <span className="text-[#21421B] text-5xl sm:text-6xl md:text-7xl font-bold">
              {formatPercent(displayStats.activeStalls)}
            </span>
            <span className="text-[#21421B] text-base sm:text-lg font-medium mt-2">
              Stalls with
              <br />
              active menus
            </span>
          </div>

          {/* Stat 2 */}
          <div className="flex flex-col items-center text-center py-4 md:py-0">
            <span className="text-[#21421B] text-5xl sm:text-6xl md:text-7xl font-bold">
              {formatPercent(displayStats.menuItemsWithPrep)}
            </span>
            <span className="text-[#21421B] text-base sm:text-lg font-medium mt-2">
              Menu items
              <br />
              with prep time
            </span>
          </div>

          {/* Stat 3 */}
          <div className="flex flex-col items-center text-center py-4 md:py-0">
            <span className="text-[#21421B] text-5xl sm:text-6xl md:text-7xl font-bold">
              {formatPercent(displayStats.stallsWithUploads)}
            </span>
            <span className="text-[#21421B] text-base sm:text-lg font-medium mt-2">
              Stalls with
              <br />
              community photos
            </span>
          </div>
        </div>
      </section>

      {/* Our Vision Section */}
      <section className="px-6 sm:px-12 md:px-16 lg:px-24 py-12 md:py-16 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[#21421B] text-3xl sm:text-4xl font-bold mb-6">Our Vision</h2>
          <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
            Preserve hawker culture while making it easier to discover, order, and support local stalls.
            We aim to build a trusted loop where verified hawkers and the community keep menus fresh,
            authentic, and useful for everyone.
          </p>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
