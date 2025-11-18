import { Link } from 'react-router-dom';
import arrowRight from '../../../assets/hawker/arrow-right.svg';
import Filters from './Filters';

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
        <div className="w-[22vw] sticky top-24">
          <Filters />
        </div>

        <div className="w-[75vw] min-h-[60vh] bg-orange-400"></div>
      </div>
    </section>
  );
};

export default HawkerCentresPage;
