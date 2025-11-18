import { Link } from 'react-router-dom';
import arrowRight from '../../../assets/hawker/arrow-right.svg';
import Filters from './Filters';
import FiltersMobile from './FiltersMobile';

const HawkerCentresPage = () => {
  return (
    <section className="px-[4vw] py-8 w-90vw h-auto font-sans">
      <div className="w-full mb-4 py-2">
        <h1 className="text-2xl font-bold text-brand mb-2">Browse Hawker Centres</h1>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <Link to="/home" className="hover:text-brand hover:underline hover:decoration-gray-400 cursor-pointer">
            Home
          </Link>
          <img src={arrowRight} alt=">" className="w-2.5 h-2.5" />
          <span className="text-brand">Hawkers</span>
        </div>
      </div>

      <div className="w-full flex gap-4">
        {/* Desktop Filters - Hidden on mobile/tablet */}
        <div className="hidden lg:block w-[22vw] sticky top-24">
          <Filters />
        </div>

        {/* Content Area */}
        <div className="w-full lg:w-[75vw] min-h-[60vh] bg-orange-400 pb-20 lg:pb-0">
          {/* Mobile Filters - Shown only on mobile/tablet */}
          <div className="lg:hidden">
            <FiltersMobile />
          </div>

          {/* Hawker Centre Cards will go here */}
        </div>
      </div>
    </section>
  );
};

export default HawkerCentresPage;
