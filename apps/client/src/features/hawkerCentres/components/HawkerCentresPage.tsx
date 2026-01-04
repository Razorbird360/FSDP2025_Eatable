import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import arrowRight from '../../../assets/hawker/arrow-right.svg';
import arrowRightWhite from '../../../assets/hawker/arrow-right-white.svg';
import locationIcon from '../../../assets/hawker/location.svg';
import Filters from './Filters';
import FiltersMobile from './FiltersMobile';
import StallCard from './StallCard';
import { useHawkerCentres } from '../hooks/useHawkerCentres';
import { useFilters } from '../hooks/useFilters';
import type { PriceRange } from '../hooks/useFilters';

const HawkerCentresPage = () => {
  const [displayLimit, setDisplayLimit] = useState(6);
  const { hawkerCentres, loading, error, locationStatus } = useHawkerCentres(30); // Fetch more than we need
  const filters = useFilters();
  const navigate = useNavigate();
  const prepTimeLimit = filters.prepTime[0];
  const selectedPriceRanges = filters.selectedPriceRanges;
  const selectedCuisines = filters.selectedCuisines;
  const selectedDietary = filters.selectedDietary;
  const cuisineOptions = filters.cuisines;
  const filteredCentres = useMemo(() => {
    const applyPrepTimeFilter = prepTimeLimit > 0 && prepTimeLimit < 20;
    const applyPriceFilter =
      selectedPriceRanges.length > 0 && !selectedPriceRanges.includes('All');
    const applyCuisineFilter =
      selectedCuisines.length > 0 && !selectedCuisines.includes('All');
    const applyDietaryFilter = selectedDietary.length > 0;
    const knownCuisines = cuisineOptions.filter(
      (cuisine) => cuisine !== 'All' && cuisine !== 'Other'
    );
    const priceRangeMatchers: Record<Exclude<PriceRange, 'All'>, (value: number) => boolean> = {
      'Under $5': (value) => value < 500,
      '$5 - $10': (value) => value >= 500 && value < 1000,
      '$10 - $15': (value) => value >= 1000 && value < 1500,
      'Above $15': (value) => value >= 1500,
    };
    return hawkerCentres
      .map((centre) => {
        const stalls = Array.isArray(centre.stalls) ? centre.stalls : [];
        const filteredStalls = stalls.filter((stall) => {
          const stallCuisine = stall.cuisineType ?? '';
          const stallDietary = Array.isArray(stall.dietaryTags) ? stall.dietaryTags : [];
          if (typeof stall.avgPriceCents !== 'number') {
            return false;
          }
          if (applyPriceFilter) {
            const priceMatches = selectedPriceRanges.some((range) => {
              const matcher = priceRangeMatchers[range];
              return matcher ? matcher(stall.avgPriceCents!) : false;
            });
            if (!priceMatches) {
              return false;
            }
          }
          if (applyCuisineFilter) {
            const cuisineMatches = selectedCuisines.some((selectedCuisine) => {
              if (selectedCuisine === 'Other') {
                return stallCuisine === '' || !knownCuisines.includes(stallCuisine);
              }
              return stallCuisine === selectedCuisine;
            });
            if (!cuisineMatches) {
              return false;
            }
          }
          if (applyDietaryFilter) {
            const dietaryMatches = selectedDietary.some((tag) => stallDietary.includes(tag));
            if (!dietaryMatches) {
              return false;
            }
          }
          if (applyPrepTimeFilter) {
            const maxPrep = typeof stall.maxPrepTimeMins === 'number' ? stall.maxPrepTimeMins : 5;
            if (maxPrep > prepTimeLimit) {
              return false;
            }
          }
          return true;
        });
        return { ...centre, stalls: filteredStalls };
      })
      .filter((centre) => centre.stalls.length > 0);
  }, [
    hawkerCentres,
    prepTimeLimit,
    selectedPriceRanges,
    selectedCuisines,
    selectedDietary,
    cuisineOptions,
  ]);
  const displayedCentres = filteredCentres.slice(0, displayLimit);
  const hasMore = displayLimit < filteredCentres.length;

  const loadMore = () => {
    setDisplayLimit((prev) => prev + 3);
  };

  return (
    <section className="px-[4vw] py-8 w-90vw h-auto font-sans">
      <div className="w-full mb-4 py-2">
        <h1 className="text-3xl font-bold text-brand mb-2">Browse Hawker Centres</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Link
            to="/home"
            className="hover:text-brand hover:underline hover:decoration-gray-400 cursor-pointer"
          >
            Home
          </Link>
          <img src={arrowRight} alt=">" className="w-3 h-3" />
          <span className="text-brand">Hawkers</span>
        </div>
      </div>

      <div className="w-full flex gap-6">
        {/* Desktop Filters - Hidden on mobile/tablet */}
        <div className="hidden lg:block w-[22vw] sticky top-24">
          <Filters filters={filters} />
        </div>

        {/* Content Area */}
        <div className="w-full lg:w-[72vw] min-h-[60vh] pb-20 lg:pb-0">
          {/* Mobile Filters - Shown only on mobile/tablet */}
          <div className="lg:hidden">
            <FiltersMobile filters={filters} />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="w-full px-4 lg:px-0 py-8 text-center text-brand">
              Loading hawker centres...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="w-full px-4 lg:px-0 py-8 text-center text-red-600">
              Error loading hawker centres. Please try again later.
            </div>
          )}

          {/* Hawker Centres List */}
          {!loading &&
            !error &&
            displayedCentres.map((centre) => (
              <div key={centre.id} className="mb-8">
                {/* Hawker Centre Header */}
                <div className="w-full px-4 lg:px-0 py-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-0">
                    {/* Left side - Name and stalls count */}
                    <div className="flex flex-col gap-0.5">
                      <h2 className="text-xl font-bold text-brand">{centre.name}</h2>
                      <span className="text-sm text-brand">
                        {centre.stallCount} stalls open
                      </span>
                    </div>

                    {/* Right side - Distance and button */}
                    <div className="flex items-center justify-between lg:justify-end gap-4">
                      {/* Distance */}
                      <div className="flex items-center gap-1.5">
                        <img src={locationIcon} alt="" className="w-4 h-4" />
                        <span className="text-sm text-brand">
                          {locationStatus === 'granted' && typeof centre.distance === 'number'
                            ? `${centre.distance.toFixed(1)} km`
                            : 'Distance unavailable'}
                        </span>
                      </div>

                      {/* View All Stalls Button */}
                      <button
                        onClick={() => navigate(`/hawker-centres/${centre.id}`)}
                        className="px-4 py-2 border-2 border-brand text-brand font-bold text-xs rounded-xl hover:bg-brand hover:text-white transition-colors whitespace-nowrap"
                      >
                        View All Stalls
                      </button>
                    </div>
                  </div>
                </div>

                {/* Divider Line */}
                <div className="w-full h-px bg-gray-300 mb-4"></div>

                {/* Stall Cards */}
                <div className="lg:grid lg:grid-cols-3 lg:gap-6 flex overflow-x-auto gap-3 px-4 lg:px-0 snap-x snap-mandatory pb-4">
                  {centre.stalls.map((stall) => (
                    <div
                      key={stall.id}
                      className="w-[45vw] lg:w-auto snap-start flex-shrink-0 cursor-pointer"
                      onClick={() => navigate(`/stalls/${stall.id}`)}
                    >
                      <StallCard
                        name={stall.name}
                        cuisineType={stall.cuisineType}
                        imageUrl={stall.imageUrl}
                        avgPriceCents={stall.avgPriceCents}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {/* Load More Button */}
          {!loading && !error && hasMore && (
            <div className="relative w-full px-4 lg:px-0 flex justify-center mt-24 mb-12">
              <button
                onClick={loadMore}
                className="group relative flex items-center gap-4 px-6 py-3 text-brand font-bold text-xs rounded-full bg-white shadow-sm transition-all duration-300 hover:bg-brand hover:text-white animate-bounce"
              >
                <span>Load More Hawker Centres</span>
                <div className="relative w-3 h-3">
                  <img
                    src={arrowRight}
                    alt=""
                    className="absolute inset-0 w-full h-full rotate-90 transition-opacity duration-300 group-hover:opacity-0"
                  />
                  <img
                    src={arrowRightWhite}
                    alt=""
                    className="absolute inset-0 w-full h-full rotate-90 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HawkerCentresPage;
