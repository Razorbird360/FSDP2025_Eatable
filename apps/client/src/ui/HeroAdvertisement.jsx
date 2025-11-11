import advertiseHero from '../assets/HomePage/Advertise.png';
import rating from '../assets/icons/rating.svg';
import favourite from '../assets/icons/favourite-brand.svg';
import location from '../assets/icons/location.svg';

function HeroAdvertisement() {
  return (
    <div
      className="relative w-[90vw] max-w-[22rem] min-h-[21rem] rounded-xl bg-gray-200 bg-cover bg-center max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] max-[430px]:min-h-[20rem] sm:min-h-[22rem] md:w-[22rem] md:max-w-none md:min-h-[23rem] lg:w-[23rem] lg:min-h-[24rem] xl:w-[23.5rem] xl:min-h-[24.5rem] 2xl:w-[24.75rem] 2xl:min-h-[26rem]"
      style={{ backgroundImage: `url(${advertiseHero})` }}
      aria-label="Hawker food collage">
        <span className='absolute inset-0 h-full w-full rounded-xl bg-gradient-to-b from-transparent via-black/30 to-black/70 z-0'></span>
        <div className="relative z-10 flex w-full items-center justify-between px-5 py-4 max-[430px]:px-4">
          <div className='flex h-9 w-32 items-center justify-evenly rounded-full bg-brand p-0 text-white max-[430px]:h-8 max-[430px]:w-[7.25rem]'>
            <img src={rating} alt="Rating" className="h-5 w-5 max-[430px]:h-[1.125rem] max-[430px]:w-[1.125rem] hover:filter hover:invert hover:brightness-200 transition duration-150 ease-in-out" />
            <p className="-translate-x-1 text-base max-[430px]:text-sm">Top-Rated</p>
          </div>
          <div className='group flex h-10 w-10 items-center justify-center rounded-full bg-white p-1 transition-colors duration-150 ease-in-out hover:bg-brand max-[430px]:h-9 max-[430px]:w-9'>
            <img src={favourite} alt="Favourite" className="h-6 w-6 transition duration-150 ease-in-out group-hover:brightness-200 group-hover:invert max-[430px]:h-5 max-[430px]:w-5" />
          </div>
        </div>

        <div className='absolute bottom-0 mb-1 flex w-full flex-col px-5 py-4 text-white max-[430px]:px-4'>
          <p className="text-2xl max-[430px]:text-xl">Grilled Beef Fried Rice</p>
          <p className="-translate-y-1 text-base max-[430px]:text-sm">John&apos;s famous steaks</p>
          <div className='flex w-full items-center justify-between gap-4'>
            <div className='flex h-12 w-full max-w-[18rem] items-center justify-center rounded-full bg-brand px-6 max-[430px]:h-11 max-[430px]:w-full max-[430px]:max-w-[14rem] xl:max-w-[17rem] 2xl:max-w-none 2xl:w-[20rem]'>
              <p className='text-base font-bold max-[430px]:text-sm'>Order now</p>
            </div>
            <div className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/30 max-[430px]:h-11 max-[430px]:w-11'>
              <img src={location} alt="Location" className="h-7 w-7 max-[430px]:h-6 max-[430px]:w-6 hover:filter hover:invert hover:brightness-200 transition duration-150 ease-in-out" />
            </div>
          </div>
        </div>
    </div>
  );
}

export default HeroAdvertisement;
