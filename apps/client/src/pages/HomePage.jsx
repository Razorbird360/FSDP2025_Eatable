import advertiseHero from '../assets/HomePage/Advertise.png';
import rating from '../assets/icons/rating.svg';
import favourite from '../assets/icons/favourite-brand.svg';
import location from '../assets/icons/location.svg';

function HomePage() {
  return (
    <section className="bg-blue-200 md:px-40 md:py-16 px-16 py-4 flex justify-between w-screen flex-col gap-6 items-center">
      <div className='bg-red-100'>
        <p className="mt-2 text-brand font-bold text-xl">Discover, vote, and order from Singapore&apos;s hawker favourites</p>
      </div>

      <div
        className="w-80 h-80 rounded-xl bg-gray-200 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${advertiseHero})` }}
        aria-label="Hawker food collage">
          <span className='absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-black/30 to-black/70 rounded-xl z-0'></span>
          <div className="flex justify-between w-full p-3 px-4 items-center relative z-10">
            <div className='w-32 h-8 bg-brand rounded-full flex justify-evenly p-0 items-center text-white'>
              <img src={rating} alt="Rating" />
              <p className="-translate-x-1 text-sm">Top-Rated</p>
            </div>
            <div className='bg-white w-8 h-8 rounded-full flex items-center justify-center p-1'>
              <img src={favourite} alt="Favourite" className="w-5 h-5" />
            </div>
          </div>

          <div className='text-white w-full flex flex-col p-3 px-4 absolute bottom-0 mb-1'>
            <p className="text-xl">Grilled Beef Fried Rice</p>
            <p className="-translate-y-1">John&apos;s famous steaks</p>
            <div className='flex justify-between'>
              <div className='bg-brand w-60 h-10 rounded-full flex justify-center items-center'>
                <p className='font-bold text-sm'>Order now</p>
              </div>
              <div className='bg-white/30 h-10 w-10 rounded-full flex items-center justify-center'>
                <img src={location} alt="Location" className="w-6 h-6" />
              </div>
            </div>

          </div>
      </div>
    </section>
  );
}

export default HomePage;
