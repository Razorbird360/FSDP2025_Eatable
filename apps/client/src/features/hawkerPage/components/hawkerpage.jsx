// src/features/hawkers/pages/HawkerCentreDetailPage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import arrowRight from "../../../assets/hawker/arrow-right.svg";
import locationIcon from "../../../assets/hawker/location.svg";
import Filters from "../../hawkerCentres/components/Filters";
import FiltersMobile from "../../hawkerCentres/components/FiltersMobile";
import api from "../../../lib/api";

const fallbackHeroImg =
  "https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=800&auto=format&fit=crop";

const fallbackDishImg =
  "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop";

function DishCard({ dish }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/stalls/${dish.stallId}`)}
      className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="h-44 w-full overflow-hidden">
        <img
          src={dish.imageUrl || fallbackDishImg}
          alt={dish.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-4 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
          {dish.name}
        </h3>
        <p className="text-xs text-gray-500">
          {dish.cuisine} · {dish.stallName}
        </p>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <svg
                viewBox="0 0 24 24"
                className="w-3 h-3 text-slate-400"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M4 20v-6m5 6V8m5 12V4m5 16"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{dish.orders ?? "–"}</span>
            </div>

            <div className="flex items-center gap-1">
              <svg
                viewBox="0 0 24 24"
                className="w-3 h-3 text-slate-400"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="8" strokeWidth="1.5" />
                <path
                  d="M12 8v4l2 2"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{dish.prepTime}</span>
            </div>
          </div>

          <div className="font-semibold text-slate-900 text-xs">
            ${dish.price.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

function StallCard({ stall }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex gap-3">
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
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
          {stall.tags && stall.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {stall.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-slate-50 text-[10px] text-gray-600 border border-slate-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
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

          return {
            ...dish,
            stallId: dish.stallId,
            stallName: stallForDish?.name ?? "View stall",
            cuisine: dish.category || stallForDish?.cuisineType || "Food",
            prepTime: dish.prepTimeMins ? `${dish.prepTimeMins} min` : "–",
            price:
              typeof dish.priceCents === "number"
                ? dish.priceCents / 100
                : 0,
            imageUrl: dish.mediaUploads?.[0]?.imageUrl || fallbackDishImg,
            orders: dish.orders ?? null,
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
          <img src={arrowRight} alt=">" className="w-3 h-3" />
          <Link
            to="/hawkers"
            className="hover:text-brand hover:underline hover:decoration-gray-400 cursor-pointer"
          >
            Hawkers
          </Link>
          <img src={arrowRight} alt=">" className="w-3 h-3" />
          <span className="text-brand font-medium">
            {centre.name || "Details"}
          </span>
        </div>
      </div>

      {/* Top summary card */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 md:p-6 flex flex-col gap-5">
        {/* Title + stats */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
              {centre.name || "Hawker Centre"}
            </h2>
            <p className="mt-1 text-xs md:text-sm text-gray-600">
              <span className="font-semibold">{centre.stallCount}</span> stalls
              <span className="mx-1.5">•</span>
              <span className="font-semibold text-brand">
                {centre.openCount} open
              </span>
            </p>
          </div>
        </div>

        {/* Location + Hours row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm text-gray-600">
          {/* Location */}
          <div className="flex items-start gap-2">
            <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-full border border-gray-300">
              <img src={locationIcon} alt="" className="w-3 h-3" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                Location
              </p>
              <p className="text-sm">
                {centre.distanceKm != null
                  ? `${centre.distanceKm.toFixed(1)} km from you`
                  : "Distance unavailable"}
              </p>
              {centre.address && (
                <p className="text-[11px] text-gray-500">
                  {centre.address}
                  {centre.postalCode && ` · S(${centre.postalCode})`}
                </p>
              )}
            </div>
          </div>

          {/* Hours */}
          <div className="flex items-start gap-2">
            <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-full border border-gray-300">
              <svg
                viewBox="0 0 24 24"
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="8" strokeWidth="1.5" />
                <path
                  d="M12 8v4l2 2"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                Hours
              </p>
              <p className="text-sm">
                {centre.hours || "6:00 AM - 10:00 PM"}
              </p>
              <p className="text-[11px] text-gray-500">
                {centre.days || "Daily"}
              </p>
            </div>
          </div>
        </div>

        {/* CTA - 2. Connect View on Map button */}
        <button
          onClick={() => {
            const id = centre.id || hawkerId;
            navigate(`/hawker-centres/map?centreId=${encodeURIComponent(id)}`);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-full bg-brand text-white w-max hover:bg-brand/90 transition-colors"
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-white/60 text-[9px]">
            <svg
              viewBox="0 0 24 24"
              className="w-3 h-3"
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
          </span>
          View on map
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4 mt-10">
        <div className="inline-flex bg-[#e9EFE4] rounded-full p-1">
          <button
            type="button"
            onClick={() => setActiveTab("stalls")}
            className={`px-4 py-1.5 text-xs md:text-sm rounded-full font-medium transition-colors
              ${
                activeTab === "stalls"
                  ? "bg-white text-brand shadow-sm"
                  : "text-gray-600"
              }`}
          >
            Stalls
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dishes")}
            className={`px-4 py-1.5 text-xs md:text-sm rounded-full font-medium transition-colors
              ${
                activeTab === "dishes"
                  ? "bg-white text-brand shadow-sm"
                  : "text-gray-600"
              }`}
          >
            Dishes
          </button>
        </div>
      </div>

      {/* Layout: Filters + Grid */}
      <div className="w-full flex gap-6">
        {/* Desktop filters */}
        <div className="hidden lg:block w-[22vw] sticky top-24">
          <Filters />
        </div>

        {/* Main content */}
        <div className="w-full lg:w-[72vw] pb-10">
          {/* Mobile filters */}
          <div className="lg:hidden mb-4">
            <FiltersMobile />
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
                  {dishes.map((dish) => (
                    <DishCard key={dish.id} dish={dish} />
                  ))}
                  {dishes.length === 0 && (
                    <p className="text-sm text-gray-500 col-span-full">
                      No dishes found for this hawker centre yet.
                    </p>
                  )}
                </div>
              )}

              {activeTab === "stalls" && (
                <div className="space-y-3 text-sm text-gray-700">
                  {stalls.map((stall) => (
                    <StallCard key={stall.id} stall={stall} />
                  ))}
                  {stalls.length === 0 && (
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