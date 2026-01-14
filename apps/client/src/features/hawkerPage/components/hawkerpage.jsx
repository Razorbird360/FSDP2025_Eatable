// src/features/hawkers/pages/HawkerCentreDetailPage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Clock, LayoutGrid, List, MapPin, TrendingUp } from 'lucide-react';
import Filters from "../../hawkerCentres/components/Filters";
import FiltersMobile from "../../hawkerCentres/components/FiltersMobile";
import api from "@lib/api";
import { useFilters } from "../../hawkerCentres/hooks/useFilters";
import { useUserLocation } from "../../hawkerCentres/hooks/useUserLocation";
import { resolveTagConflicts } from "../../../utils/tagging";

const fallbackHeroImg =
  "https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=800&auto=format&fit=crop";

const fallbackDishImg =
  "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop";

const formatRelativeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  if (diffMs <= 0) return "today";
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
};

function DishCard({ dish }) {
  const navigate = useNavigate();
  const verifiedLabel =
    dish.approvedUploadCount > 0
      ? `${dish.approvedUploadCount} verified photo${dish.approvedUploadCount === 1 ? "" : "s"}`
      : "No verified photos yet";
  const lastUploadLabel = formatRelativeDate(dish.lastApprovedUploadAt);

  return (
    <div
      onClick={() => navigate(`/stalls/${dish.stallId}`)}
      className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
    >
      <div className="aspect-[4/3] w-full overflow-hidden">
        <img
          src={dish.imageUrl || fallbackDishImg}
          alt={dish.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Card content */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-1">
          {dish.name}
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {dish.cuisine}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          <span>{verifiedLabel}</span>
          {lastUploadLabel && <span>Last upload {lastUploadLabel}</span>}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            {/* Orders/upvotes with trend-up icon */}
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>{dish.orders ?? "–"}</span>
            </div>

            {/* Prep time with clock icon */}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>{dish.prepTime}</span>
            </div>
          </div>

          {/* Price */}
          <div className="font-semibold text-slate-900">
            ${dish.price.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

function StallCard({ stall }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex items-center gap-4">
      <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
        <img
          src={stall.image_url}
          alt={stall.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 flex flex-col justify-between gap-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
            {stall.name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {stall.cuisineType} · {stall.location}
          </p>
        </div>
        <Link
          to={`/stalls/${stall.id}`}
          className="mt-2 inline-flex items-center text-[11px] font-medium text-brand hover:underline"
        >
          View stall
        </Link>
      </div>
    </div>
  );
}

const HawkerCentreDetailPage = () => {
  const { hawkerId } = useParams();
  const navigate = useNavigate(); // 1. Initialize navigate hook
  const [activeTab, setActiveTab] = useState("dishes");

  // Centre info from /info/:hawkerId + some UI-only fields
  const [centre, setCentre] = useState({
    id: hawkerId,
    name: "",
    address: "",
    postalCode: "",
    latitude: null,
    longitude: null,
    stallCount: 0,
    openCount: 0,
    imageUrl: fallbackHeroImg,
  });

  const [dishes, setDishes] = useState([]);
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const filters = useFilters();
  const { coords, status: locationStatus } = useUserLocation();

  const prepTimeLimit = filters.prepTime[0];
  const selectedPriceRanges = filters.selectedPriceRanges;
  const selectedCuisines = filters.selectedCuisines;
  const selectedDietary = filters.selectedDietary;
  const cuisineOptions = filters.cuisines;

  const applyPrepTimeFilter = prepTimeLimit > 0 && prepTimeLimit < 20;
  const applyPriceFilter =
    selectedPriceRanges.length > 0 && !selectedPriceRanges.includes("All");
  const applyCuisineFilter =
    selectedCuisines.length > 0 && !selectedCuisines.includes("All");
  const applyDietaryFilter = selectedDietary.length > 0;
  const knownCuisines = cuisineOptions.filter(
    (cuisine) => cuisine !== "All" && cuisine !== "Other"
  );

  const priceRangeMatchers = {
    "Under $5": (value) => value < 500,
    "$5 - $10": (value) => value >= 500 && value < 1000,
    "$10 - $15": (value) => value >= 1000 && value < 1500,
    "Above $15": (value) => value >= 1500,
  };

  useEffect(() => {
    if (!hawkerId) return;

    let isCancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [infoRes, stallsRes, dishesRes] = await Promise.all([
          api.get(`/hawker-centres/info/${hawkerId}`),
          api.get(`/hawker-centres/stalls/${hawkerId}`),
          api.get(`/hawker-centres/dishes/${hawkerId}`),
        ]);

        const info = infoRes.data ?? infoRes;
        const stallsRaw = stallsRes.data ?? stallsRes ?? [];
        const dishesRaw = dishesRes.data ?? dishesRes ?? [];

        if (isCancelled) return;

        const mappedStalls = stallsRaw.map((stall) => ({
          ...stall,
        }));

        const mappedDishes = dishesRaw.map((dish) => {
          const stallForDish = mappedStalls.find(
            (s) => s.id === dish.stallId
          );
          const approvedUploadCount =
            typeof dish.approvedUploadCount === "number"
              ? dish.approvedUploadCount
              : 0;
          const resolvedTags = resolveTagConflicts(
            dish.menuItemTagAggs || [],
            approvedUploadCount,
            3
          );

          return {
            ...dish,
            stallId: dish.stallId,
            stallName: stallForDish?.name ?? "View stall",
            cuisine: dish.category || stallForDish?.cuisineType || "Food",
            prepTime: dish.prepTimeMins ? `${dish.prepTimeMins} min` : "???",
            price:
              typeof dish.priceCents === "number"
                ? dish.priceCents / 100
                : 0,
            imageUrl: dish.mediaUploads?.[0]?.imageUrl || fallbackDishImg,
            approvedUploadCount,
            lastApprovedUploadAt: dish.lastApprovedUploadAt || null,
            verified: approvedUploadCount > 0,
            tags: resolvedTags,
            expectations:
              resolvedTags.length > 0
                ? resolvedTags
                  .map((tag) => tag.label)
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(", ")
                : null,
            orders: typeof dish.upvoteCount === "number" ? dish.upvoteCount : null,
          };
        });


        setStalls(mappedStalls);
        setDishes(mappedDishes);

        setCentre((prev) => ({
          ...prev,
          ...info,
          stallCount: mappedStalls.length,
          openCount: mappedStalls.length,
        }));
      } catch (err) {
        console.error("[HawkerCentreDetailPage] Failed to load data", err);
        if (!isCancelled) {
          setError("Failed to load hawker centre data. Please try again.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [hawkerId]);

  const filteredStalls = stalls.filter((stall) => {
    const stallCuisine = stall.cuisineType ?? "";
    const stallDietary = Array.isArray(stall.dietaryTags) ? stall.dietaryTags : [];

    if (applyCuisineFilter) {
      const cuisineMatches = selectedCuisines.some((selectedCuisine) => {
        if (selectedCuisine === "Other") {
          return stallCuisine === "" || !knownCuisines.includes(stallCuisine);
        }
        return stallCuisine === selectedCuisine;
      });
      if (!cuisineMatches) return false;
    }

    if (applyDietaryFilter) {
      const dietaryMatches = selectedDietary.some((tag) => stallDietary.includes(tag));
      if (!dietaryMatches) return false;
    }

    return true;
  });

  const filteredDishes = dishes.filter((dish) => {
    const stallForDish = stalls.find((stall) => stall.id === dish.stallId);
    if (!stallForDish) return false;

    const stallCuisine = stallForDish.cuisineType ?? "";
    const stallDietary = Array.isArray(stallForDish.dietaryTags)
      ? stallForDish.dietaryTags
      : [];

    if (applyCuisineFilter) {
      const cuisineMatches = selectedCuisines.some((selectedCuisine) => {
        if (selectedCuisine === "Other") {
          return stallCuisine === "" || !knownCuisines.includes(stallCuisine);
        }
        return stallCuisine === selectedCuisine;
      });
      if (!cuisineMatches) return false;
    }

    if (applyDietaryFilter) {
      const dietaryMatches = selectedDietary.some((tag) => stallDietary.includes(tag));
      if (!dietaryMatches) return false;
    }

    if (applyPriceFilter) {
      if (typeof dish.priceCents !== "number") return false;
      const priceMatches = selectedPriceRanges.some((range) => {
        const matcher = priceRangeMatchers[range];
        return matcher ? matcher(dish.priceCents) : false;
      });
      if (!priceMatches) return false;
    }

    if (applyPrepTimeFilter) {
      const prepTimeValue =
        typeof dish.prepTimeMins === "number" ? dish.prepTimeMins : 5;
      if (prepTimeValue > prepTimeLimit) return false;
    }

    return true;
  });

  const distanceKm =
    locationStatus === "granted" &&
      coords &&
      typeof centre.latitude === "number" &&
      typeof centre.longitude === "number"
      ? (() => {
        const toRad = (degrees) => (degrees * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(centre.latitude - coords.lat);
        const dLon = toRad(centre.longitude - coords.lng);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(coords.lat)) *
          Math.cos(toRad(centre.latitude)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      })()
      : null;

  return (
    <section className="px-[4vw] py-8 w-full min-h-screen bg-[#f5f7f4] font-sans">
      {/* Breadcrumbs */}
      <div className="w-full mb-4 py-2">
        <div className="flex items-center gap-3 text-xs md:text-sm text-gray-500">
          <Link
            to="/home"
            className="hover:text-brand hover:underline hover:decoration-gray-400 cursor-pointer"
          >
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-gray-400" aria-hidden="true" />
          <Link
            to="/hawker-centres"
            className="hover:text-brand hover:underline hover:decoration-gray-400 cursor-pointer"
          >
            Hawkers
          </Link>
          <ChevronRight className="w-3 h-3 text-gray-400" aria-hidden="true" />
          <span className="text-brand font-medium">
            {centre.name || "Details"}
          </span>
        </div>
      </div>

      {/* Top summary card */}
      <div
        className="w-full rounded-2xl py-6 pl-6 pr-4 md:p-6 flex flex-col md:flex-row md:items-center gap-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] relative overflow-hidden md:bg-white md:border md:border-slate-200"
      >
        {/* Background image for mobile */}
        <div
          className="absolute inset-0 md:hidden bg-cover bg-center"
          style={{ backgroundImage: `url(${centre.imageUrl || fallbackHeroImg})` }}
        />

        {/* Dark overlay for mobile */}
        <div className="absolute inset-0 bg-black/50 md:hidden" />

        {/* White background for desktop */}
        <div className="hidden md:block absolute inset-0 bg-white" />

        {/* Hero image - visible on desktop */}
        <div className="hidden md:block w-44 h-44 flex-shrink-0 rounded-xl overflow-hidden relative z-10">
          <img
            src={centre.imageUrl || fallbackHeroImg}
            alt={centre.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content section */}
        <div className="flex-1 flex flex-col gap-4 relative z-10 justify-center md:justify-start">
          {/* Title + stats */}
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-white md:text-slate-900">
              {centre.name || "Hawker Centre"}
            </h2>
            <p className="mt-1 text-xs md:text-sm text-white/90 md:text-gray-600">
              <span className="font-semibold">{centre.stallCount}</span> stalls
              <span className="mx-1.5">•</span>
              <span className="font-semibold text-white md:text-brand">
                {centre.openCount} open
              </span>
            </p>
          </div>

          {/* Location + Hours row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm text-white/90 md:text-gray-600">
            {/* Location */}
            <div className="flex items-start gap-2">
              <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-full border border-white/50 md:border-gray-300">
                <MapPin className="w-3 h-3 text-white md:text-gray-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-white/70 md:text-gray-500">
                  Location
                </p>
                <p className="text-sm text-white md:text-gray-600">
                  {distanceKm != null
                    ? `${distanceKm.toFixed(1)} km from you`
                    : locationStatus === "pending"
                      ? "Locating..."
                      : "Distance unavailable"}
                </p>
              </div>
            </div>

            {/* Hours */}
            <div className="flex items-start gap-2">
              <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-full border border-white/50 md:border-gray-300">
                <Clock className="w-3 h-3 text-white md:text-gray-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-white/70 md:text-gray-500">
                  Hours
                </p>
                <p className="text-sm text-white md:text-gray-600">
                  {centre.hours || "6:00 AM - 10:00 PM"}
                </p>
                <p className="text-[11px] text-white/70 md:text-gray-500">
                  {centre.days || "Daily"}
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              const id = centre.id || hawkerId;
              if (id) {
                navigate(`/hawker-centres/map?centreId=${encodeURIComponent(id)}`);
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-full bg-white md:bg-brand text-brand md:text-white w-max hover:bg-white/90 md:hover:bg-brand/90 transition-colors"
          >
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
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between my-4 md:mb-4 md:mt-10">
        <div className="inline-flex bg-white border border-[#E5E5E5] rounded-xl p-1 gap-[3px]">
          <button
            type="button"
            onClick={() => setActiveTab("stalls")}
            className={`flex items-center gap-2 pl-[18px] pr-5 py-2 text-sm rounded-lg font-medium transition-colors
              ${activeTab === "stalls"
                ? "bg-brand text-white"
                : "text-gray-400"
              }`}
          >
            <LayoutGrid
              className={`w-4 h-4 ${activeTab === "stalls" ? "text-white" : "text-gray-400"}`}
              aria-hidden="true"
            />
            Stalls
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dishes")}
            className={`flex items-center gap-2 pl-[18px] pr-5 py-2 text-sm rounded-lg font-medium transition-colors
              ${activeTab === "dishes"
                ? "bg-brand text-white"
                : "text-gray-400"
              }`}
          >
            <List
              className={`w-4 h-4 ${activeTab === "dishes" ? "text-white" : "text-gray-400"}`}
              aria-hidden="true"
            />
            Dishes
          </button>
        </div>
      </div>

      {/* Layout: Filters + Grid */}
      <div className="w-full flex gap-6">
        {/* Desktop filters */}
        <div className="hidden lg:block w-[22vw] sticky top-24">
          <Filters filters={filters} />
        </div>

        {/* Main content */}
        <div className="w-full lg:w-[72vw] pb-10">
          {/* Mobile filters */}
          <div className="lg:hidden mb-4">
            <FiltersMobile filters={filters} />
          </div>

          {loading && (
            <div className="text-sm text-gray-500">Loading…</div>
          )}
          {error && !loading && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {activeTab === "dishes" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                  {filteredDishes.map((dish) => (
                    <DishCard key={dish.id} dish={dish} />
                  ))}
                  {filteredDishes.length === 0 && (
                    <p className="text-sm text-gray-500 col-span-full">
                      No dishes found for this hawker centre yet.
                    </p>
                  )}
                </div>
              )}

              {activeTab === "stalls" && (
                <div className="space-y-3 text-sm text-gray-700">
                  {filteredStalls.map((stall) => (
                    <StallCard key={stall.id} stall={stall} />
                  ))}
                  {filteredStalls.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No stalls found for this hawker centre yet.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default HawkerCentreDetailPage;
