import { Link, useLocation } from 'react-router-dom';
import { Input, Box } from '@chakra-ui/react';

const homeIcon = new URL('../assets/navbar/home.svg', import.meta.url).href;
const foodIcon = new URL('../assets/navbar/food.svg', import.meta.url).href;
const communityIcon = new URL('../assets/navbar/community-photos.svg', import.meta.url).href;
const infoIcon = new URL('../assets/navbar/about-us.svg', import.meta.url).href;
const searchIcon = new URL('../assets/navbar/search.svg', import.meta.url).href;
const favouriteIcon = new URL('../assets/navbar/favourite.svg', import.meta.url).href;
const cartIcon = new URL('../assets/navbar/cart.svg', import.meta.url).href;
const profilePlaceholder = new URL('../assets/navbar/profile_placeholder.jpg', import.meta.url).href;

const navIcons = [
  { label: 'Home', icon: homeIcon, href: '/' },
  { label: 'Hawkers', icon: foodIcon, href: '/stalls' },
  { label: 'Community', icon: communityIcon, href: '/community' },
  { label: 'About', icon: infoIcon, href: '/about' },
];

function IconPill({ icon, label, href, isActive }) {
  return (
    <Link to={href} aria-label={label}>
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
          isActive
            ? 'border-[#21421B] bg-[#21421B]'
            : 'border-[#E7EEE7] bg-white hover:bg-[#F8FDF3]'
        }`}
      >
        <img src={icon} alt="" className={`h-5 w-5 ${isActive ? 'brightness-0 invert' : ''}`} />
      </span>
    </Link>
  );
}

function IconAction({ icon, label, badge }) {
  return (
    <button
      type="button"
      className="relative flex h-11 w-11 items-center justify-center rounded-xl text-[#4A554B] transition-colors hover:bg-[#F8FDF3]"
      aria-label={label}
    >
      <img src={icon} alt="" className="h-5 w-5" />
      {badge ? (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#21421B] px-1 text-xs font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();
  const isActive = (href) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#E7EEE7] bg-white shadow-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center px-6 py-3">
        <div className="flex items-center gap-3 -ml-[10vw]">
          {navIcons.map((icon) => (
            <IconPill key={icon.label} {...icon} isActive={isActive(icon.href)} />
          ))}
        </div>

        <Box
          className="hidden relative flex-1 md:flex mx-48 max-w-[calc(100%-15vw)]"
          position="relative"
        >
          <Box
            position="absolute"
            left="3"
            top="50%"
            transform="translateY(-50%)"
            pointerEvents="none"
            zIndex="1"
          >
            <img src={searchIcon} alt="" className="h-4 w-4" />
          </Box>
          <Input
            placeholder="Search dishes, stalls, categories..."
            borderRadius="xl"
            border="1px solid"
            borderColor="#E7EEE7"
            bg="white"
            color="#4A554B"
            fontSize="sm"
            _placeholder={{ color: '#6d7f68' }}
            _hover={{ bg: '#F8FDF3' }}
            _focus={{ borderColor: '#21421B', boxShadow: 'none' }}
            paddingLeft="2.5rem"
            paddingRight="4.5rem"
            width="100%"
          />
          <Box className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <kbd className="inline-flex h-5 items-center justify-center rounded border border-[#E7EEE7] bg-[#F8FDF3] px-2 text-xs text-[#4A554B] leading-none">
              Ctrl + K
            </kbd>
          </Box>
        </Box>

        <div className="ml-auto flex items-center gap-4 -mr-[10vw]">
          <IconAction icon={favouriteIcon} label="Favourites" />
          <IconAction icon={cartIcon} label="Cart" badge={2} />
          <div className="flex items-center rounded-full border border-[#E7EEE7] bg-white p-0.5 ml-2">
            <img src={profilePlaceholder} alt="Profile" className="h-10 w-10 rounded-full object-cover" />
          </div>
        </div>
      </div>

      <Box className="px-4 pb-3 md:hidden" position="relative">
        <Box
          position="absolute"
          left="7"
          top="50%"
          transform="translateY(-50%)"
          pointerEvents="none"
          zIndex="1"
        >
          <img src={searchIcon} alt="" className="h-4 w-4" />
        </Box>
        <Input
          id="global-search-mobile"
          type="search"
          placeholder="Search dishes, stalls, categories..."
          borderRadius="xl"
          border="1px solid"
          borderColor="#E7EEE7"
          bg="white"
          color="#4A554B"
          fontSize="sm"
          _placeholder={{ color: '#6d7f68' }}
          _focus={{ borderColor: '#21421B', boxShadow: 'none' }}
          paddingLeft="2.5rem"
          width="100%"
        />
      </Box>
    </header>
  );
}
