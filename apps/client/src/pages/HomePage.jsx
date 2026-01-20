import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, ChevronRight, CircleCheck, Dot, MapPin, TrendingUp } from 'lucide-react';
import CuisineBox from "../ui/CuisineBox";
import HeroAdvertisement from "../ui/HeroAdvertisement";
import { Button } from "@chakra-ui/react";
import logo_full from "../assets/logo/logo_full.png";
import profilePlaceholder from "../assets/HomePage/profile_placeholder.jpg";
import api from "@lib/api";
import { toaster } from "../components/ui/toaster";
import { useAuth } from "../features/auth/useAuth";
import VerificationModal from "../features/verification/components/VerificationModal";
import OrderCompletedModal from "../features/payment/OrderCompleted"


const CUISINE_TYPES = ["malay", "indian", "western", "chinese", "desserts", "local"];

const FALLBACK_NEARBY_ITEMS = [
  {
    id: 'fallback-1',
    name: "Char Kway Teow",
    priceCents: 500,
    stallId: null,
    stallName: "Fried Kway Teow Master",
    upvotes: 245,
  },
  {
    id: 'fallback-2',
    name: "Prawn Mee",
    priceCents: 550,
    stallId: null,
    stallName: "Kian Seng Lor Mee Prawn Mee Laksa",
    upvotes: 191,
  },
  {
    id: 'fallback-3',
    name: "Nasi Lemak",
    priceCents: 480,
    stallId: null,
    stallName: "Hani Food Stall",
    upvotes: 176,
  },
];



function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, refreshProfile, status } = useAuth();
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [topPicks, setTopPicks] = useState([]);
  const [topPicksLoading, setTopPicksLoading] = useState(true);
  const [activeCuisineIndex, setActiveCuisineIndex] = useState(0);
  const [featuredDishes, setFeaturedDishes] = useState({});
  const isProfileLoading = status === 'loading';

  // Modal State Added Here
  const [openOrderModal, setOpenOrderModal] = useState(false)
  const [modalOrderId, setModalOrderId] = useState(null)

  useEffect(() => {
    if (location.state?.photoUploaded) {
      toaster.create({
        title: "Photo submitted",
        description: "Thanks for sharing your dish with the community!",
        type: "success",
      });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  // Fetch top-voted menu items with fallback
  useEffect(() => {
    async function fetchTopPicks() {
      try {
        const res = await api.get('/menu/top-voted?limit=3');
        // Use API data if available, otherwise fallback
        setTopPicks(res.data?.length > 0 ? res.data : FALLBACK_NEARBY_ITEMS);
      } catch (err) {
        console.error('Failed to fetch top picks:', err);
        // Fallback to hardcoded data on error
        setTopPicks(FALLBACK_NEARBY_ITEMS);
      } finally {
        setTopPicksLoading(false);
      }
    }
    fetchTopPicks();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCuisineIndex((prev) => (prev + 1) % CUISINE_TYPES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch featured dishes from API
  useEffect(() => {
    async function fetchFeatured() {
      try {
        const res = await api.get('/menu/featured?minUpvotes=500');
        if (res.data?.items) {
          setFeaturedDishes(res.data.items);
        }
      } catch (err) {
        console.error('Failed to fetch featured dishes:', err);
      }
    }
    fetchFeatured();
  }, []);

  // Get current featured dish based on active cuisine
  const activeCuisine = CUISINE_TYPES[activeCuisineIndex];
  const currentFeaturedDish = featuredDishes[activeCuisine] || {
    name: `Top Rated ${activeCuisine.charAt(0).toUpperCase() + activeCuisine.slice(1)} Dishes`,
    stallName: 'Explore local hawker favorites',
    stallId: null,
    imageUrl: undefined,
  };

  const getButtonConfig = () => {
    // Wait for profile to load or default to explore stalls
    if (!profile) {
      return { text: 'Explore Stalls', link: '/hawker-centres' };
    }

    // Hawker-specific logic
    if (profile.role === 'hawker') {
      if (!profile.verified) {
        return {
          text: 'Verify Identity',
          onClick: () => setShowVerificationModal(true),
          Icon: CircleCheck,
          iconSize: 32,
        };
      }
      if (!profile.hasStall) {
        return {
          text: 'Setup Stall',
          link: '/stall/setup',
        };
      }
      return {
        text: 'Edit Stall Menu',
        link: `/stall/manage/${profile.stallId}`,
      };
    }

    // Default for customers and guests
    return { text: 'Explore Stalls', link: '/hawker-centres' };
  };

  const buttonConfig = isProfileLoading ? null : getButtonConfig();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    const updateScrollLock = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (isDesktop) {
        html.style.overflow = "hidden";
        body.style.overflow = "hidden";
      } else {
        html.style.overflow = previousHtmlOverflow;
        body.style.overflow = previousBodyOverflow;
      }
    };

    updateScrollLock();
    window.addEventListener("resize", updateScrollLock);

    return () => {
      window.removeEventListener("resize", updateScrollLock);
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const handleUploadClick = async () => {
    try {
      const res = await api.get("/media/skip-onboarding");

      if (res.data?.skipOnboarding === true) {
        navigate("/photo-upload");
        return;
      }
    } catch (err) {
      console.error("Failed to check skip flag", err);
    }

    navigate("/photo-upload/onboarding");
  };

  return (
    <>
      <section className="box-border flex w-full flex-col items-center gap-6 px-4 pt-0 pb-6 max-[430px]:gap-5 max-[430px]:px-3.5 sm:px-8 md:px-0 md:pt-0 md:pb-0 md:flex-row md:gap-0 md:h-[calc(100vh-4rem)] md:items-center md:justify-center md:overflow-hidden bg-[#FBF7F0]">

        {/* left column */}
        <div className="w-[90vw] max-w-[24rem] rounded-lg px-4 py-4 max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] max-[430px]:px-3 md:w-[38vw] lg:w-[36vw] xl:w-[34vw] 2xl:w-[34vw] md:max-w-none md:py-6 md:pl-[4vw] md:pr-3 xl:py-8 xl:pl-[4.75vw] xl:pr-4 2xl:py-10 2xl:pl-[5.5vw] 2xl:pr-[5.5vw] flex flex-col items-start md:justify-center md:flex-shrink-0">
          <img
            src={logo_full}
            alt="eatable logo"
            className="hidden md:block h-16 w-auto mt-4 mb-12 self-start"
          />
          <div className="flex flex-col gap-4">
            <p className="text-center md:mt-0 mt-5 text-brand text-2xl sm:text-4xl md:text-2xl font-bold leading-tight max-[430px]:text-xl sm:text-left">
              Discover, vote, and order from Singapore&apos;s hawker favourites
            </p>
            <p className="mt-2 text-base hidden md:block">
              Community-powered reviews and reliable menus from your local hawker centres
            </p>
          </div>

          <div className="mt-6 hidden md:block">
            <div className="flex flex-col gap-3.5">
              {buttonConfig ? (
                buttonConfig.link ? (
                  <Link to={buttonConfig.link} className="w-full">
                    <Button
                      height="44px"
                      rounded="10px"
                      width="16vw"
                      maxW="280px"
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
                      {buttonConfig.text}
                      <ChevronRight className="h-6 w-6 translate-y-[1px] text-white" aria-hidden="true" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    height="44px"
                    rounded="10px"
                    width="16vw"
                    maxW="280px"
                    px={6}
                    bg="#21421B"
                    color="white"
                    fontWeight="semibold"
                    fontSize="md"
                    justifyContent="center"
                    boxShadow="0 4px 12px rgba(33, 66, 27, 0.18)"
                    _hover={{ bg: '#1A3517' }}
                    _active={{ bg: '#142812' }}
                    onClick={buttonConfig.onClick}
                  >
                    <div className="flex items-center gap-3">
                      {buttonConfig.Icon && (
                        <buttonConfig.Icon
                          className="text-white"
                          style={{
                            width: buttonConfig.iconSize ?? 24,
                            height: buttonConfig.iconSize ?? 24,
                          }}
                          aria-hidden="true"
                        />
                      )}

                      <span>{buttonConfig.text}</span>
                    </div>
                  </Button>
                )
              ) : (
                <Button
                  height="44px"
                  rounded="10px"
                  width="16vw"
                  maxW="280px"
                  px={6}
                  bg="#21421B"
                  color="white"
                  fontWeight="semibold"
                  fontSize="md"
                  justifyContent="center"
                  isDisabled
                  isLoading
                  loadingText="Loading..."
                />
              )}

              <Button
                height="44px"
                rounded="10px"
                width="16vw"
                maxW="280px"
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
                _hover={{ bg: "#ECF5E7" }}
                onClick={handleUploadClick}
              >
                <Camera className="h-6 w-6 text-[#21421B]" aria-hidden="true" />
                Upload a dish photo
              </Button>
            </div>
          </div>

          <div className="bg-gray-300 h-[2px] w-full mt-6 mb-4 opacity-40 hidden md:block"></div>

          <div className="flex-col gap-4 hidden md:flex">
            <div className="flex items-center gap-3">
              <Dot className="h-5 w-5 text-brand" aria-hidden="true" />
              <p className="text-base">Community-verified photos</p>
            </div>
            <div className="flex items-center gap-3">
              <Dot className="h-5 w-5 text-brand" aria-hidden="true" />
              <p className="text-base">Secure NETS QR Payment</p>
            </div>
            <div className="flex items-center gap-3">
              <Dot className="h-5 w-5 text-brand" aria-hidden="true" />
              <p className="text-base">Fast pickup guaranteed</p>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-between gap-3 pr-1 pt-4 border-gray-200 mt-[5vh]">
            <p className="text-base font-medium text-brand whitespace-nowra">Recent community uploads</p>
            <div className="flex items-center -space-x-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <img
                  key={`recent-upload-${index}`}
                  src={profilePlaceholder}
                  alt="Community upload"
                  className="h-8 w-8 rounded-full border-2 border-white object-cover"
                />
              ))}
            </div>
          </div>
        </div>

        {/* middle column */}
        <div className="flex flex-col items-center md:w-[36vw] md:py-4 xl:py-6 2xl:py-10 md:justify-center md:flex-shrink-0">
          <div className="md:hidden">
            <HeroAdvertisement
              imageUrl={currentFeaturedDish.imageUrl}
              dishName={currentFeaturedDish.name}
              stallName={currentFeaturedDish.stallName}
              stallId={currentFeaturedDish.stallId}
            />
            <div className="grid w-[90vw] max-w-[24rem] grid-cols-3 gap-x-3 mt-6 gap-y-3 max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] max-[430px]:gap-x-2 max-[430px]:gap-y-2">
              {CUISINE_TYPES.map((cuisine, index) => (
                <CuisineBox
                  key={cuisine}
                  type={cuisine}
                  isActive={activeCuisineIndex === index}
                  navigateOnClick={true}
                />
              ))}
            </div>

            <div className="flex flex-col gap-3 w-[90vw] max-w-[24rem] max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] mt-6">
              {buttonConfig ? (
                buttonConfig.link ? (
                  <Link to={buttonConfig.link} className="w-full">
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
                      {buttonConfig.text}
                      <ChevronRight className="h-6 w-6 text-white" aria-hidden="true" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    height="56px"
                    rounded="10px"
                    w="full"
                    px={6}
                    bg="#21421B"
                    color="white"
                    fontWeight="semibold"
                    fontSize="md"
                    justifyContent="center"
                    boxShadow="0 4px 12px rgba(33, 66, 27, 0.18)"
                    _hover={{ bg: '#1A3517' }}
                    _active={{ bg: '#142812' }}
                    onClick={buttonConfig.onClick}
                  >
                    <div className="flex items-center gap-3">
                      {buttonConfig.Icon && (
                        <buttonConfig.Icon
                          className="text-white"
                          style={{
                            width: buttonConfig.iconSize ?? 24,
                            height: buttonConfig.iconSize ?? 24,
                          }}
                          aria-hidden="true"
                        />
                      )}

                      <span>{buttonConfig.text}</span>
                    </div>
                  </Button>
                )
              ) : (
                <Button
                  height="56px"
                  rounded="10px"
                  w="full"
                  px={6}
                  bg="#21421B"
                  color="white"
                  fontWeight="semibold"
                  fontSize="md"
                  justifyContent="center"
                  isDisabled
                  isLoading
                  loadingText="Loading..."
                />
              )}

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
                _hover={{ bg: "#ECF5E7" }}
                onClick={handleUploadClick}
              >
                <Camera className="h-6 w-6 text-[#21421B]" aria-hidden="true" />
                Upload a dish photo
              </Button>
            </div>
          </div>

          <div className="relative hidden md:flex md:items-center md:justify-center">
            <div
              className="relative flex flex-col items-center pt-10 pb-10 xl:pt-12 xl:pb-12 2xl:pt-16 2xl:pb-16"
            >
              <div className="flex justify-between w-full mb-3" style={{ transform: "translateY(-2vh)" }}>
                <div className="w-14 xl:w-16 flex justify-center" style={{ transform: "translateX(-3vw)" }}>
                  <CuisineBox
                    type="malay"
                    shape="circle"
                    isActive={activeCuisineIndex === 0}
                    navigateOnClick={true}
                  />
                </div>
                <div className="w-14 xl:w-16 flex justify-center" style={{ transform: "translateY(-4vh)" }}>
                  <CuisineBox
                    type="indian"
                    shape="circle"
                    isActive={activeCuisineIndex === 1}
                    navigateOnClick={true}
                  />
                </div>
                <div className="w-14 xl:w-16 flex justify-center" style={{ transform: "translateX(3vw)" }}>
                  <CuisineBox
                    type="western"
                    shape="circle"
                    isActive={activeCuisineIndex === 2}
                    navigateOnClick={true}
                  />
                </div>
              </div>

              <HeroAdvertisement
                imageUrl={currentFeaturedDish.imageUrl}
                dishName={currentFeaturedDish.name}
                stallName={currentFeaturedDish.stallName}
                stallId={currentFeaturedDish.stallId}
              />

              <div className="flex justify-between w-full mt-3" style={{ transform: "translateY(2vh)" }}>
                <div className="w-14 xl:w-16 flex justify-center" style={{ transform: "translateX(-3vw)" }}>
                  <CuisineBox
                    type="chinese"
                    shape="circle"
                    isActive={activeCuisineIndex === 3}
                    navigateOnClick={true}
                  />
                </div>
                <div className="w-14 xl:w-16 flex justify-center" style={{ transform: "translateY(4vh)" }}>
                  <CuisineBox
                    type="desserts"
                    shape="circle"
                    isActive={activeCuisineIndex === 4}
                    navigateOnClick={true}
                  />
                </div>
                <div className="w-14 xl:w-16 flex justify-center" style={{ transform: "translateX(3vw)" }}>
                  <CuisineBox
                    type="local"
                    shape="circle"
                    isActive={activeCuisineIndex === 5}
                    navigateOnClick={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* right column */}
        <div className="w-[90vw] max-w-[24rem] max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] md:w-[32vw] md:max-w-none md:pr-[4.5vw] md:pl-4 md:flex md:flex-col md:justify-center md:flex-shrink-0">
          <div className="hidden md:flex md:flex-col w-full mb-16" style={{ maxHeight: "22rem" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold text-brand mb-0.5">Near you</h2>
                <p className="text-sm text-gray-700">Top picks nearby</p>
              </div>
              <Link to="/hawker-centres" className="flex items-center gap-1 text-brand hover:underline">
                <MapPin className="h-4 w-4 text-brand" aria-hidden="true" />
                <span className="text-sm font-medium">Map</span>
              </Link>
            </div>

            <div className="flex flex-col gap-4">
              {topPicksLoading ? (
                <div className="text-sm text-gray-500">Loading top picks...</div>
              ) : topPicks.length === 0 ? (
                <div className="text-sm text-gray-500">No top picks available yet.</div>
              ) : (
                topPicks.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => item.stallId && navigate(`/stalls/${item.stallId}`)}
                    className={`bg-white rounded-lg p-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow ${item.stallId ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-base font-semibold text-brand">{item.name}</h3>
                      <span className="text-base font-bold text-brand">
                        ${(item.priceCents / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{item.stallName}</p>
                    <div className="flex items-center gap-1 text-gray-500">
                      <TrendingUp className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                      <span className="text-xs">{item.upvotes} Upvotes</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <VerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onSuccess={() => {
            setShowVerificationModal(false);
            refreshProfile();
          }}
        />
      </section>

      {/* Render the modal outside of <section> */}
      {openOrderModal && (
        <OrderCompletedModal
          orderId={modalOrderId}
          onClose={() => setOpenOrderModal(false)}
        />
      )}
    </>
  );
}

export default HomePage;