import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Input, Box } from '@chakra-ui/react';
import { useCart } from '../features/orders/components/CartContext';
import { useAuth } from '../features/auth/useAuth';

const homeIcon = new URL('../assets/navbar/home.svg', import.meta.url).href;
const foodIcon = new URL('../assets/navbar/food.svg', import.meta.url).href;
const communityIcon = new URL('../assets/navbar/community-photos.svg', import.meta.url).href;
const infoIcon = new URL('../assets/navbar/about-us.svg', import.meta.url).href;
const searchIcon = new URL('../assets/navbar/search.svg', import.meta.url).href;
const favouriteIcon = new URL('../assets/navbar/favourite.svg', import.meta.url).href;
const cartIcon = new URL('../assets/navbar/cart.svg', import.meta.url).href;
const closeIcon = new URL('../assets/navbar/close.svg', import.meta.url).href;
const menuIcon = new URL('../assets/navbar/menu.svg', import.meta.url).href;
const logoFull = new URL('../assets/logo/logo_full.png', import.meta.url).href;
const profilePlaceholder = new URL('../assets/navbar/profile_placeholder.jpg', import.meta.url).href;

const navIcons = [
  { label: 'Home', icon: homeIcon, href: '/home' },
  { label: 'Hawkers', icon: foodIcon, href: '/stalls' },
  { label: 'Community', icon: communityIcon, href: '/community' },
  { label: 'About', icon: infoIcon, href: '/about' },
];

const mobileNavItems = [
  ...navIcons,
  { label: 'Favourites', icon: favouriteIcon, href: '/favourites' },
];

const mobileMenuBaseColor = '#FFFFFF';
const mobileMenuLayers = ['#F8FDF3', '#EFF8EE', '#FFFFFF'];
const mobileMenuLayerDelays = [0, 30, 55];

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

function IconAction({ icon, label, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const { count, openCart } = useCart();
  const { status, profile, logout, loading: authLoading } = useAuth();

  const profileIdentifier =
    profile?.displayName ?? profile?.username ?? profile?.email ?? 'Guest';
  const profileInitial = profileIdentifier.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (logoutError) {
      console.error('Logout failed:', logoutError);
    }
  };

  const isActive = (href) => pathname.startsWith(href);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
  };

  const mobileMenuNavItems = status === 'authenticated' ? mobileNavItems : navIcons;

  // close profile dropdown when clicking outside
  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#E7EEE7] bg-white shadow-sm">
      {/* desktop */}
      <div className="hidden w-full md:flex">
        <div className="flex w-full items-center gap-6 px-[4vw] py-3">
          <nav className="flex shrink-0 items-center gap-2.5" aria-label="Primary navigation">
            {navIcons.map((icon) => (
              <IconPill key={icon.label} {...icon} isActive={isActive(icon.href)} />
            ))}
          </nav>

          <div className="flex flex-1 justify-center min-w-0">
            <Box
              className="relative w-full min-w-0 max-w-[520px] xl:w-[42vw] xl:max-w-[660px]"
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
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {status === 'authenticated' && (
              <>
                <IconAction icon={favouriteIcon} label="Favourites" />
                <IconAction icon={cartIcon} label="Cart" badge={count} onClick={openCart} />
              </>
            )}

            {status === 'authenticated' ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  disabled={authLoading}
                  className="flex items-center gap-2 rounded-2xl border border-[#E7EEE7] bg-white px-3 py-1.5 text-left transition-colors hover:border-[#21421B]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#21421B] text-sm font-semibold text-white">
                    {profileInitial}
                  </span>
                  <span className="text-sm font-semibold text-[#1C201D]">
                    {profileIdentifier}
                  </span>
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-[#E7EEE7] bg-white py-1 shadow-[0_10px_25px_rgba(0,0,0,0.08)]">
                    <button
                      type="button"
                      onClick={async () => {
                        await handleLogout();
                        setIsProfileMenuOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-[#1C201D] hover:bg-[#F8FDF3] rounded-2xl"
                    >
                      {authLoading ? 'Signing out...' : 'Log out'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-xl border border-[#21421B] px-4 py-2 text-sm font-semibold text-[#21421B] transition-colors hover:bg-[#21421B] hover:text-white"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* mobile top bar */}
      <div className="flex items-center justify-between pl-4 pr-6 py-4 md:hidden">
        <img src={logoFull} alt="Eatable" className="h-10 w-auto pl-2" />
        <div className="flex items-center gap-3">
          {status === 'authenticated' && (
            <IconAction icon={cartIcon} label="Cart" badge={count} onClick={openCart} />
          )}
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center text-[#21421B]"
          >
            <img src={menuIcon} alt="" className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* mobile slide menu */}
      <div
        aria-hidden={!isMobileMenuOpen}
        inert={!isMobileMenuOpen ? '' : undefined}
        className={`fixed inset-0 z-50 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <span
            className="absolute inset-y-0 right-0 w-[115%] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              background: mobileMenuBaseColor,
              transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
              transitionDelay: isMobileMenuOpen ? '0ms' : '0ms',
            }}
          />
          {mobileMenuLayers.map((layer, index) => (
            <span
              key={`${layer}-${index}`}
              className="absolute inset-y-0 right-0 w-full rounded-l-[48px] shadow-[0_25px_80px_rgba(33,66,27,0.12)] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                background: layer,
                width:
                  index === mobileMenuLayers.length - 1
                    ? '105%'
                    : `${92 - index * 6}%`,
                transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
                transitionDelay: isMobileMenuOpen
                  ? `${mobileMenuLayerDelays[index] ?? 0}ms`
                  : '0ms',
              }}
            />
          ))}
        </div>
        <div
          className={`relative z-10 flex h-full flex-col bg-white px-6 py-6 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isMobileMenuOpen
              ? 'translate-x-0 shadow-[0_25px_80px_rgba(33,66,27,0.18)]'
              : 'translate-x-full shadow-none'
          }`}
        >
          <div className="mb-4 flex items-center justify-between px-4">
            <button
              type="button"
              aria-label="Open search"
              aria-expanded={isMobileSearchOpen}
              onClick={() => setIsMobileSearchOpen(true)}
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F8FDF3] transition-all duration-200 ${
                isMobileSearchOpen ? 'pointer-events-none scale-95 opacity-0' : 'opacity-100'
              }`}
            >
              <img src={searchIcon} alt="" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="ml-auto flex items-center gap-2 text-[#21421B]"
            >
              <span className="text-base">Close</span>
              <img src={closeIcon} alt="Close menu" className="h-4 w-4" />
            </button>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ${
              isMobileSearchOpen
                ? 'max-h-32 translate-y-0 opacity-100'
                : '-translate-y-2 max-h-0 pointer-events-none opacity-0'
            }`}
          >
            <Box className="relative w-full" position="relative">
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
                borderRadius="2xl"
                border="1px solid"
                borderColor="#E7EEE7"
                bg="white"
                color="#4A554B"
                fontSize="sm"
                _placeholder={{ color: '#6d7f68' }}
                _focus={{ borderColor: '#21421B', boxShadow: 'none' }}
                paddingLeft="2.5rem"
                width="100%"
                className="w-full"
              />
            </Box>
          </div>

          <nav className="mt-6 flex-1 space-y-4 overflow-y-auto">
            {mobileMenuNavItems.map(({ label, icon, href }) => (
              <Link
                key={label}
                to={href}
                onClick={closeMobileMenu}
                className={`flex items-center gap-4 rounded-2xl border px-4 py-3 text-[#1C201D] ${
                  isActive(href) ? 'border-[#21421B] bg-[#F8FDF3]' : 'border-[#F1F1F1]'
                }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8FDF3]">
                  <img src={icon} alt="" className="h-5 w-5" />
                </span>
                <span className="text-base font-medium">{label}</span>
              </Link>
            ))}

            {status === 'authenticated' ? (
              <button
                type="button"
                onClick={async () => {
                  await handleLogout();
                  closeMobileMenu();
                }}
                disabled={authLoading}
                className="flex items-center gap-3 rounded-2xl border border-[#21421B] px-4 py-3 text-left"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#21421B] text-base font-semibold text-white">
                  {profileInitial}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1C201D]">{profileIdentifier}</p>
                  <p className="text-xs text-[#6d7f68]">
                    {authLoading ? 'Signing out...' : 'Tap to sign out'}
                  </p>
                </div>
              </button>
            ) : (
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 rounded-2xl border border-[#21421B] px-4 py-3 text-left text-[#21421B]"
              >
                <img
                  src={profilePlaceholder}
                  alt="Profile"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold">Log in or Sign up</p>
                  <p className="text-xs text-[#6d7f68]">Access saved stalls & orders</p>
                </div>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
