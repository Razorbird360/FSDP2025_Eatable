import arrowRight from '../assets/icons/arrow right.svg';
import cameraIcon from '../assets/icons/camera.svg';
import point from '../assets/icons/point.svg';
import trendUp from '../assets/icons/trend-up.svg';
import locationIcon from '../assets/icons/location.svg';
import CuisineBox from '../ui/CuisineBox';
import HeroAdvertisement from '../ui/HeroAdvertisement';
import { Button } from '@chakra-ui/react';
import logo_full from '../assets/logo/logo_full.png';

const CUISINE_TYPES = ['malay', 'indian', 'western', 'chinese', 'desserts', 'local'];

const NEARBY_ITEMS = [
  {
    name: 'Char Kway Teow',
    price: '5.00',
    vendor: 'Fried Kway Teow Master',
    upvotes: 245
  },
  {
    name: 'Prawn Mee',
    price: '5.50',
    vendor: 'Kian Seng Lor Mee Prawn Mee Laksa',
    upvotes: 191
  },
  {
    name: 'Nasi Lemak',
    price: '4.80',
    vendor: 'Hani Food Stall',
    upvotes: 176
  }
];

function HomePage() {
  return (
    <section className="box-border flex w-full flex-col items-center gap-6 px-4 py-6 max-[430px]:gap-5 max-[430px]:px-3.5 sm:px-8 md:px-0 md:pt-0 md:pb-0 md:flex-row md:gap-0 md:min-h-[calc(100vh-5rem)] md:items-stretch bg-[#FBF7F0]">
      <div className="w-[90vw] max-w-[24rem] rounded-lg px-4 py-4 max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] max-[430px]:px-3 md:w-[32vw] md:max-w-none md:py-10 md:pl-[4.5vw] md:pr-3 xl:py-12 xl:pl-[5.25vw] xl:pr-4 2xl:py-16 2xl:pl-[6vw]">
        <img src={logo_full} alt="eatable logo" className='hidden md:block h-16 mb-16' />
        <div className='flex flex-col gap-4'>
          <p className="text-center text-brand text-3xl sm:text-4xl md:text-3xl font-bold leading-tight max-[430px]:text-xl sm:text-left">
            Discover, vote, and order from Singapore&apos;s hawker favourites
          </p>
          <p className='mt-2 text-lg hidden md:block'>Community-powered reviews and reliable menus from your local hawker centres</p>
        </div>
        <div className='mt-6 hidden md:block'>
          <div className="flex flex-col gap-3.5 max-w-[20vw]">  
            <Button
              height="56px"
              rounded="10px"
              w="full"
              px={6}
              bg="#21421B"
              color="white"
              fontWeight="semibold"
              fontSize="md"
              justifyContent="space-between"
              boxShadow="0 4px 12px rgba(33, 66, 27, 0.18)"
              _hover={{ bg: '#1A3517' }}
              _active={{ bg: '#142812' }}
            >
              Explore Stalls
              <img src={arrowRight} alt="" className="h-6 w-6 hover:filter hover:invert hover:brightness-200 transition duration-150 ease-in-out" aria-hidden="true" />
            </Button>

            <Button
              height="56px"
              rounded="10px"
              w="full"
              px={6}
              bg="#F6FBF2"
              borderWidth="2px"
              borderColor="#21421B"
              color="#21421B"
              fontWeight="semibold"
              fontSize="md"
              gap="12px"
              justifyContent="center"
              boxShadow="0 3px 10px rgba(33, 66, 27, 0.14)"
              _hover={{ bg: '#ECF5E7' }}
            >
              <img src={cameraIcon} alt="" className="h-6 w-6 hover:filter hover:invert hover:brightness-200 transition duration-150 ease-in-out" aria-hidden="true" />
              Upload a dish photo
            </Button>
          </div>

        </div>


        <div className='bg-gray-300 h-[2px] w-full my-8 opacity-40 hidden md:block'></div>
        
        <div className='flex-col gap-4 hidden md:flex'>
          <div className='flex items-center gap-3'>
            <img src={point} alt="" className="h-5 w-5" aria-hidden="true" />
            <p className='text-base'>Community-verified photos</p>
          </div>
          <div className='flex items-center gap-3'>
            <img src={point} alt="" className="h-5 w-5" aria-hidden="true" />
            <p className='text-base'>Secure NETS QR Payment</p>
          </div>
          <div className='flex items-center gap-3'>
            <img src={point} alt="" className="h-5 w-5" aria-hidden="true" />
            <p className='text-base'>Fast pickup guaranteed</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center md:w-[36vw] md:py-8 xl:py-10 2xl:py-14">
        <div className="md:hidden">
          <HeroAdvertisement/>
          <div className="grid w-[90vw] max-w-[24rem] grid-cols-3 gap-x-3 mt-6 gap-y-3 max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] max-[430px]:gap-x-2 max-[430px]:gap-y-2">
            {CUISINE_TYPES.map((cuisine) => (
              <CuisineBox key={cuisine} type={cuisine} />
            ))}
          </div>

          <div className="flex flex-col gap-3 w-[90vw] max-w-[24rem] max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] mt-6">
            <Button
              height="56px"
              rounded="10px"
              w="full"
              px={6}
              bg="#21421B"
              color="white"
              fontWeight="semibold"
              fontSize="md"
              justifyContent="space-between"
              boxShadow="0 4px 12px rgba(33, 66, 27, 0.18)"
              _hover={{ bg: '#1A3517' }}
              _active={{ bg: '#142812' }}
            >
              Explore Stalls
              <img src={arrowRight} alt="" className="h-6 w-6 hover:filter hover:invert hover:brightness-200 transition duration-150 ease-in-out" aria-hidden="true" />
            </Button>

            <Button
              height="56px"
              rounded="10px"
              w="full"
              px={6}
              bg="#F6FBF2"
              borderWidth="2px"
              borderColor="#21421B"
              color="#21421B"
              fontWeight="semibold"
              fontSize="md"
              gap="12px"
              justifyContent="center"
              boxShadow="0 3px 10px rgba(33, 66, 27, 0.14)"
              _hover={{ bg: '#ECF5E7' }}
            >
              <img src={cameraIcon} alt="" className="h-6 w-6 hover:filter hover:invert hover:brightness-200 transition duration-150 ease-in-out" aria-hidden="true" />
              Upload a dish photo
            </Button>
          </div>
        </div>
        

        <div className="relative hidden md:flex md:items-center md:justify-center md:py-8 xl:py-10 2xl:py-14">
          <div className="relative flex w-full max-w-[27rem] items-center justify-center pt-12 pb-14 xl:max-w-[28rem] xl:pt-14 xl:pb-16 2xl:max-w-[30rem] 2xl:pt-20 2xl:pb-24">
            <HeroAdvertisement />

            <div className="absolute -top-6 -left-6 w-16 xl:w-20 xl:-top-9 xl:-left-8 2xl:w-[5.5rem] 2xl:-top-10 2xl:-left-10">
              <CuisineBox type="malay" shape="circle" />
            </div>
            <div className="absolute -top-14 left-1/2 w-16 -translate-x-1/2 xl:-top-20 xl:w-20 2xl:-top-24 2xl:w-[5.5rem]">
              <CuisineBox type="indian" shape="circle" />
            </div>
            <div className="absolute -top-6 -right-6 w-16 xl:w-20 xl:-top-9 xl:-right-8 2xl:w-[5.5rem] 2xl:-top-10 2xl:-right-10">
              <CuisineBox type="western" shape="circle" />
            </div>

            <div className="absolute -bottom-4 -left-6 w-16 xl:w-20 xl:-bottom-6 xl:-left-8 2xl:w-[5.5rem] 2xl:-bottom-8 2xl:-left-10">
              <CuisineBox type="chinese" shape="circle" />
            </div>
            <div className="absolute -bottom-10 left-1/2 w-16 -translate-x-1/2 xl:-bottom-16 xl:w-20 2xl:-bottom-20 2xl:w-[5.5rem]">
              <CuisineBox type="desserts" shape="circle" />
            </div>
            <div className="absolute -bottom-4 -right-6 w-16 xl:w-20 xl:-bottom-6 xl:-right-8 2xl:w-[5.5rem] 2xl:-bottom-8 2xl:-right-10">
              <CuisineBox type="local" shape="circle" />
            </div>
          </div>
        </div>
      </div>

      <div className="w-[90vw] max-w-[24rem] max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] md:w-[32vw] md:max-w-none md:pr-[5vw] md:pl-4 md:flex md:flex-col md:justify-center md:min-h-[calc(100vh-6rem)] xl:min-h-[calc(100vh-4rem)] 2xl:min-h-[calc(100vh-2rem)]">
        <div className="hidden md:flex md:flex-col w-full" style={{ maxHeight: '24rem' }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-brand mb-0.5">Near you</h2>
              <p className="text-sm text-gray-700">Top picks nearby</p>
            </div>
            <button className="flex items-center gap-1.5 text-brand hover:underline">
              <img src={locationIcon} alt="" className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium">Map</span>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {NEARBY_ITEMS.map((item) => (
              <div key={item.name} className="bg-white rounded-lg p-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-semibold text-brand">{item.name}</h3>
                  <span className="text-base font-bold text-brand">${item.price}</span>
                </div>
                <p className="text-xs text-gray-600 mb-1">{item.vendor}</p>
                <div className="flex items-center gap-1 text-gray-500">
                  <img src={trendUp} alt="" className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-xs">{item.upvotes} Upvotes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


    </section>
  );
}

export default HomePage;
