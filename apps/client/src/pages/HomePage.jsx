import advertiseHero from '../assets/HomePage/Advertise.png';
import rating from '../assets/icons/rating.svg';
import favourite from '../assets/icons/favourite-brand.svg';
import location from '../assets/icons/location.svg';
import CuisineBox from '../ui/CuisineBox';

const CUISINE_TYPES = ['malay', 'indian', 'western', 'chinese', 'desserts', 'local'];

function HomePage() {
  return (
    <section className="box-border flex w-full flex-col items-center gap-6 bg-blue-200 px-4 py-6 max-[430px]:gap-5 max-[430px]:px-3.5 sm:px-8 md:px-40 md:py-16">
      <div className="bg-red-100 w-[90vw] max-w-[24rem] rounded-lg px-4 py-3 max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] max-[430px]:px-3">
        <p className="mt-2 text-center text-brand text-lg font-bold max-[430px]:text-base sm:text-left sm:text-xl">
          Discover, vote, and order from Singapore&apos;s hawker favourites
        </p>
      </div>

      <div
        className="relative w-[90vw] max-w-[24rem] min-h-[22rem] rounded-xl bg-gray-200 bg-cover bg-center max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] max-[430px]:min-h-[20rem] sm:min-h-[24rem] md:min-h-[26rem]"
        style={{ backgroundImage: `url(${advertiseHero})` }}
        aria-label="Hawker food collage">
          <span className='absolute inset-0 h-full w-full rounded-xl bg-gradient-to-b from-transparent via-black/30 to-black/70 z-0'></span>
          <div className="relative z-10 flex w-full items-center justify-between px-5 py-4 max-[430px]:px-4">
            <div className='flex h-9 w-32 items-center justify-evenly rounded-full bg-brand p-0 text-white max-[430px]:h-8 max-[430px]:w-[7.25rem]'>
              <img src={rating} alt="Rating" className="h-5 w-5 max-[430px]:h-[1.125rem] max-[430px]:w-[1.125rem]" />
              <p className="-translate-x-1 text-base max-[430px]:text-sm">Top-Rated</p>
            </div>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-white p-1 max-[430px]:h-9 max-[430px]:w-9'>
              <img src={favourite} alt="Favourite" className="h-6 w-6 max-[430px]:h-5 max-[430px]:w-5" />
            </div>
          </div>

          <div className='absolute bottom-0 mb-1 flex w-full flex-col px-5 py-4 text-white max-[430px]:px-4'>
            <p className="text-2xl max-[430px]:text-xl">Grilled Beef Fried Rice</p>
            <p className="-translate-y-1 text-base max-[430px]:text-sm">John&apos;s famous steaks</p>
            <div className='flex w-full items-center justify-between gap-4'>
              <div className='flex h-12 w-full max-w-[16rem] items-center justify-center rounded-full bg-brand px-6 max-[430px]:h-11 max-[430px]:max-w-[14rem]'>
                <p className='text-base font-bold max-[430px]:text-sm'>Order now</p>
              </div>
              <div className='flex h-12 w-12 items-center justify-center rounded-full bg-white/30 max-[430px]:h-11 max-[430px]:w-11'>
                <img src={location} alt="Location" className="h-7 w-7 max-[430px]:h-6 max-[430px]:w-6" />
              </div>
            </div>
          </div>
      </div>

      <div className="grid w-[90vw] max-w-[24rem] grid-cols-3 gap-x-3 gap-y-3 max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] max-[430px]:gap-x-2 max-[430px]:gap-y-2">
        {CUISINE_TYPES.map((cuisine) => (
          <CuisineBox key={cuisine} type={cuisine} />
        ))}
      </div>

    </section>
  );
}

export default HomePage;
