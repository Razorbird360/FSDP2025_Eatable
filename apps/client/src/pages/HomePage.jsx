import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import arrowRight from "../assets/icons/arrow right.svg";
import cameraIcon from "../assets/icons/camera.svg";
import verifyIcon from "../assets/HomePage/verify.svg";
import point from "../assets/icons/point.svg";
import trendUp from "../assets/icons/trend-up.svg";
import locationBrand from "../assets/icons/location-brand.svg";
import CuisineBox from "../ui/CuisineBox";
import HeroAdvertisement from "../ui/HeroAdvertisement";
import { Button } from "@chakra-ui/react";
import logo_full from "../assets/logo/logo_full.png";
import profilePlaceholder from "../assets/navbar/profile_placeholder.jpg";
import api from "../lib/api";
import { toaster } from "../components/ui/toaster";
import { useAuth } from "../features/auth/useAuth";
import VerificationModal from "../features/verification/components/VerificationModal";

const CUISINE_TYPES = ["malay", "indian", "western", "chinese", "desserts", "local"];

const NEARBY_ITEMS = [
  {
    name: "Char Kway Teow",
    price: "5.00",
    vendor: "Fried Kway Teow Master",
    upvotes: 245,
  },
  {
    name: "Prawn Mee",
    price: "5.50",
    vendor: "Kian Seng Lor Mee Prawn Mee Laksa",
    upvotes: 191,
  },
  {
    name: "Nasi Lemak",
    price: "4.80",
    vendor: "Hani Food Stall",
    upvotes: 176,
  },
];

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, refreshProfile, status } = useAuth();
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const isProfileLoading = status === 'loading';

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
          icon: verifyIcon,
          iconSize: '32px',
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
        // On desktop, prevent body scroll but allow section to scroll if needed
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
    <section className="box-border flex w-full flex-col items-center gap-6 px-4 pt-0 pb-6 max-[430px]:gap-5 max-[430px]:px-3.5 sm:px-8 md:px-0 md:pt-0 md:pb-0 md:flex-row md:gap-0 md:h-[calc(100vh-4rem)] md:items-center md:justify-center md:overflow-y-auto bg-[#FBF7F0]">

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
                    <img
                      src={arrowRight}
                      alt=""
                      className="h-6 w-6 translate-y-[1px]"
                      aria-hidden="true"
                    />
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
                    {buttonConfig.icon && (
                      <img
                        src={buttonConfig.icon}
                        alt=""
                        style={{ width: buttonConfig.iconSize ?? '24px', height: buttonConfig.iconSize ?? '24px' }}
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
              <img
                src={cameraIcon}
                alt=""
                className="h-6 w-6"
                aria-hidden="true"
              />
              Upload a dish photo
            </Button>
          </div>
        </div>

        <div className="bg-gray-300 h-[2px] w-full mt-6 mb-4 opacity-40 hidden md:block"></div>

        <div className="flex-col gap-4 hidden md:flex">
          <div className="flex items-center gap-3">
            <img src={point} alt="" className="h-5 w-5" aria-hidden="true" />
            <p className="text-base">Community-verified photos</p>
          </div>
          <div className="flex items-center gap-3">
            <img src={point} alt="" className="h-5 w-5" aria-hidden="true" />
            <p className="text-base">Secure NETS QR Payment</p>
          </div>
          <div className="flex items-center gap-3">
            <img src={point} alt="" className="h-5 w-5" aria-hidden="true" />
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
          <HeroAdvertisement />
          <div className="grid w-[90vw] max-w-[24rem] grid-cols-3 gap-x-3 mt-6 gap-y-3 max-[430px]:w-[88vw] max-[430px]:max-w-[22rem] max-[430px]:gap-x-2 max-[430px]:gap-y-2">
            {CUISINE_TYPES.map((cuisine) => (
              <CuisineBox key={cuisine} type={cuisine} />
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
                    <img src={arrowRight} alt="" className="h-6 w-6 hover:filter hover:invert hover:brightness-200 transition duration-150 ease-in-out" aria-hidden="true" />
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
                    {buttonConfig.icon && (
                      <img
                        src={buttonConfig.icon}
                        alt=""
                        style={{ width: buttonConfig.iconSize ?? '24px', height: buttonConfig.iconSize ?? '24px' }}
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
              <img
                src={cameraIcon}
                alt=""
                className="h-6 w-6 hover:filter hover:invert hover:brightness-200 transition duration-150 ease-in-out"
                aria-hidden="true"
              />
              Upload a dish photo
            </Button>
          </div>
        </div>

        <div className="relative hidden md:flex md:items-center md:justify-center">
          <div
            className="relative flex flex-col items-center pt-10 pb-10 xl:pt-12 xl:pb-12 2xl:pt-16 2xl:pb-16"
            style={{ transform: "translateY(-1rem)" }}
          >
            <div className="flex justify-between w-full mb-3" style={{ transform: "translateY(-2vh)" }}>
              <div className="w-14 xl:w-16" style={{ transform: "translateX(-3vw)" }}>
                <CuisineBox type="malay" shape="circle" />
              </div>
              <div className="w-14 xl:w-16" style={{ transform: "translateY(-4vh)" }}>
                <CuisineBox type="indian" shape="circle" />
              </div>
              <div className="w-14 xl:w-16" style={{ transform: "translateX(3vw)" }}>
                <CuisineBox type="western" shape="circle" />
              </div>
            </div>

            <HeroAdvertisement />

            <div className="flex justify-between w-full mt-3" style={{ transform: "translateY(2vh)" }}>
              <div className="w-14 xl:w-16" style={{ transform: "translateX(-3vw)" }}>
                <CuisineBox type="chinese" shape="circle" />
              </div>
              <div className="w-14 xl:w-16" style={{ transform: "translateY(4vh)" }}>
                <CuisineBox type="desserts" shape="circle" />
              </div>
              <div className="w-14 xl:w-16" style={{ transform: "translateX(3vw)" }}>
                <CuisineBox type="local" shape="circle" />
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
            <button className="flex items-center gap-1 text-brand hover:underline">
              <img src={locationBrand} alt="" aria-hidden="true" className="h-4 w-4" />
              <span className="text-sm font-medium">Map</span>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {NEARBY_ITEMS.map((item) => (
              <div
                key={item.name}
                className="bg-white rounded-lg p-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow cursor-pointer"
              >
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

      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={() => {
          setShowVerificationModal(false);
          refreshProfile();
        }}
      />
    </section>
  );
}

export default HomePage;
