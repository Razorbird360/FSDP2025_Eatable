import { Link } from 'react-router-dom';
import arrowRight from '../../../assets/hawker/arrow-right.svg';
import locationIcon from '../../../assets/hawker/location.svg';
import Filters from './Filters';
import FiltersMobile from './FiltersMobile';
import StallCard from './StallCard';

const HawkerCentresPage = () => {
  return (
    <section className="px-[4vw] py-8 w-90vw h-auto font-sans">
      <div className="w-full mb-4 py-2">
        <h1 className="text-3xl font-bold text-brand mb-2">Browse Hawker Centres</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Link to="/home" className="hover:text-brand hover:underline hover:decoration-gray-400 cursor-pointer">
            Home
          </Link>
          <img src={arrowRight} alt=">" className="w-3 h-3" />
          <span className="text-brand">Hawkers</span>
        </div>
      </div>

      <div className="w-full flex gap-8">
        {/* Desktop Filters - Hidden on mobile/tablet */}
        <div className="hidden lg:block w-[22vw] sticky top-24">
          <Filters />
        </div>

        {/* Content Area */}
        <div className="w-full lg:w-[71vw] min-h-[60vh] pb-20 lg:pb-0">
          {/* Mobile Filters - Shown only on mobile/tablet */}
          <div className="lg:hidden">
            <FiltersMobile />
          </div>

          {/* Hawker Centre Header */}
          <div className="w-full p-4">
            <div className="flex items-start justify-between">
              {/* Left side - Name and stalls count */}
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-brand">Tiong Bahru Market</h2>
                <span className="text-sm text-brand">19 stalls open</span>
              </div>

              {/* Right side - Distance and button */}
              <div className="flex items-center gap-4">
                {/* Distance */}
                <div className="flex items-center gap-1.5">
                  <img src={locationIcon} alt="" className="w-4 h-4" />
                  <span className="text-sm text-brand">0.3 km</span>
                </div>

                {/* View All Stalls Button */}
                <button className="px-4 py-2 border-2 border-brand text-brand font-bold text-xs rounded-xl hover:bg-brand hover:text-white transition-colors">
                  View All Stalls
                </button>
              </div>
            </div>
          </div>

          {/* Divider Line */}
          <div className="w-full h-px bg-gray-300 mb-6"></div>

          {/* Stall Cards Grid */}
          <div className="grid grid-cols-3 gap-6 px-4">
            <StallCard
              name="John's Famous Steak"
              cuisineType="Western"
              rating={201}
              price="$7.50"
              imageUrl="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800"
            />
            <StallCard
              name="Xin Lu Traditional TeoChew Handmade Fishball Noodles"
              cuisineType="Local"
              rating={201}
              price="$7.50"
              imageUrl="https://images.unsplash.com/photo-1585036156171-384164a8c675?q=80&w=800"
            />
            <StallCard
              name="Yuan Ji Chicken Rice"
              cuisineType="Local"
              rating={201}
              price="$7.50"
              imageUrl="https://images.unsplash.com/photo-1604908176997-1251886d2c87?q=80&w=800"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HawkerCentresPage;
