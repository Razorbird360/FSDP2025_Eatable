import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input, Box } from '@chakra-ui/react';
import {
  ClipboardList,
  House,
  Info,
  Library,
  Menu,
  Salad,
  Search,
  ShoppingCart,
  Telescope,
  Utensils,
  X,
  Heart,
} from 'lucide-react';
import Tooltip from './Tooltip';
import { useCart } from '../features/orders/components/CartContext';
import { useAuth } from '../features/auth/useAuth';
import api from '../lib/api';

const logoFull = new URL('../assets/logo/logo_full.png', import.meta.url).href;
const profilePlaceholder = new URL(
  '../assets/HomePage/profile_placeholder.jpg',
  import.meta.url
).href;

const navIcons = [
  { label: 'Home', Icon: House, href: '/home' },
  { label: 'Hawkers', Icon: Utensils, href: '/hawker-centres' },
  { label: 'Community', Icon: Telescope, href: '/community' },
  { label: 'About', Icon: Info, href: '/about' },
];

const mobileNavItems = [
  ...navIcons,
  { label: 'Profile', iconSrc: profilePlaceholder, href: '/profile' },
  { label: 'Orders', Icon: ClipboardList, href: '/orders' },
  { label: 'My Collection', Icon: Library, href: '/my-collection' },
];

const mobileMenuBaseColor = '#FFFFFF';
const mobileMenuLayers = ['#F8FDF3', '#EFF8EE', '#FFFFFF'];
const mobileMenuLayerDelays = [0, 30, 55];
const emptySearchResults = { hawkerCentres: [], stalls: [], dishes: [] };

function IconPill({ Icon, label, href, isActive }) {
  return (
    <Tooltip label={label}>
      <Link to={href} aria-label={label}>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
            isActive
              ? 'border-[#21421B] bg-[#21421B]'
              : 'border-[#E7EEE7] bg-white hover:bg-[#F8FDF3]'
          }`}
        >
          <Icon
            className={`h-5 w-5 ${isActive ? 'text-white' : 'text-[#4A554B]'}`}
          />
        </span>
      </Link>
    </Tooltip>
  );
}

function IconAction({ Icon, label, secondaryLabel, badge, onClick, to }) {
  const content = (
    <>
      <Icon className="h-5 w-5 text-[#4A554B]" />
      {badge ? (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#21421B] px-1 text-xs font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </>
  );

  const className =
    'relative flex h-11 w-11 items-center justify-center rounded-xl text-[#4A554B] transition-colors hover:bg-[#F8FDF3]';

  if (to) {
    return (
      <Tooltip label={label} secondaryLabel={secondaryLabel}>
        <Link to={to} className={className} aria-label={label}>
          {content}
        </Link>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        className={className}
        aria-label={label}
      >
        {content}
      </button>
    </Tooltip>
  );
}

function SearchThumbnail({ imageUrl }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-8 w-8 rounded-lg object-cover"
        loading="lazy"
        aria-hidden="true"
      />
    );
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#21421B]">
      <Salad className="h-4 w-4 text-white" aria-hidden="true" />
    </span>
  );
}

function SearchSection({ title, items, showDivider, onSelect, onHighlight, activeIndex }) {
  if (!items.length) return null;

  return (
    <div className={`${showDivider ? 'border-t border-[#EEF2EC] pt-3' : ''}`}>
      <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6D7F68]">
        {title}
      </p>
      <div className="space-y-1 px-2 pb-2">
        {items.map((item) => (
          <button
            key={`${item.entityType}-${item.id}`}
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect?.(item);
            }}
            onMouseEnter={() => onHighlight?.(item)}
            className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
              activeIndex === item.flatIndex ? 'bg-[#F0F7ED]' : 'hover:bg-[#F8FDF3]'
            }`}
            aria-selected={activeIndex === item.flatIndex}
          >
            <SearchThumbnail imageUrl={item.imageUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#1C201D]">
                {item.name}
              </p>
              {item.subtitle ? (
                <p className="truncate text-xs text-[#6D7F68]">
                  {item.subtitle}
                </p>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchDropdown({
  isOpen,
  isLoading,
  error,
  query,
  sections,
  activeIndex,
  onSelect,
  onHighlight,
  className,
}) {
  const hasQuery = query.length > 0;
  const visibleSections = sections.filter((section) => section.items.length > 0);
  const hasResults = visibleSections.length > 0;

  return (
    <Box
      className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border border-[#E7EEE7] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-200 origin-top ${
        isOpen
          ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none -translate-y-1 scale-[0.98] opacity-0'
      } ${className ?? ''}`}
      data-loading={isLoading ? 'true' : undefined}
      data-error={error ? 'true' : undefined}
      data-query={query || undefined}
      data-has-results={hasResults ? 'true' : undefined}
    >
      <div
        className={`transition-opacity duration-150 ${
          isLoading ? 'opacity-60' : 'opacity-100'
        }`}
      >
        {error ? (
          <div className="px-4 py-3 text-sm text-[#8B3A3A]">
            Something went wrong
          </div>
        ) : null}
        {!error && hasQuery && !isLoading && !hasResults ? (
          <div className="px-4 py-3 text-sm text-[#6D7F68]">
            No results
          </div>
        ) : null}
        {!error && hasQuery && hasResults
          ? visibleSections.map((section, index) => (
              <SearchSection
                key={section.title}
                title={section.title}
                items={section.items}
                showDivider={index > 0}
                activeIndex={activeIndex}
                onSelect={onSelect}
                onHighlight={onHighlight}
              />
            ))
          : null}
      </div>
    </Box>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(emptySearchResults);
  const [searchError, setSearchError] = useState(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const profileMenuRef = useRef(null);
  const searchAbortRef = useRef(null);
  const searchInputRef = useRef(null);

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

  const mobileMenuNavItems =
    status === 'authenticated' ? mobileNavItems : navIcons;

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
      setIsSearchLoading(false);
      setDebouncedQuery('');
      setSearchResults(emptySearchResults);
      setSearchError(null);
      setActiveResultIndex(-1);
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
      searchAbortRef.current = null;
    }

    setIsSearchLoading(true);
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) {
      setSearchResults(emptySearchResults);
      setSearchError(null);
      setIsSearchLoading(false);
      setActiveResultIndex(-1);
      return;
    }

    const controller = new AbortController();
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    searchAbortRef.current = controller;

    const fetchResults = async () => {
      try {
        setIsSearchLoading(true);
        const response = await api.get('/search', {
          params: { q: debouncedQuery },
          signal: controller.signal,
        });
        setSearchResults(response?.data ?? emptySearchResults);
        setSearchError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Search failed:', error);
        setSearchError('Something went wrong');
        setSearchResults(emptySearchResults);
        setActiveResultIndex(-1);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  const searchSections = useMemo(() => {
    const sections = [
      { title: 'Hawker Centres', items: searchResults.hawkerCentres },
      { title: 'Stalls', items: searchResults.stalls },
      { title: 'Dishes', items: searchResults.dishes },
    ];

    let index = 0;
    const flatItems = [];
    const enrichedSections = sections.map((section) => {
      const enrichedItems = section.items.map((item) => {
        const entry = { ...item, flatIndex: index };
        flatItems.push(entry);
        index += 1;
        return entry;
      });
      return { ...section, items: enrichedItems };
    });

    return { sections: enrichedSections, flatItems };
  }, [searchResults]);


  useEffect(() => {
    if (!debouncedQuery || searchSections.flatItems.length === 0) {
      setActiveResultIndex(-1);
      return;
    }

    setActiveResultIndex((prev) => {
      if (prev >= 0 && prev < searchSections.flatItems.length) {
        return prev;
      }
      return 0;
    });
  }, [debouncedQuery, searchSections.flatItems.length]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') {
        return;
      }
      event.preventDefault();
      setIsSearchOpen(true);
      searchInputRef.current?.focus();
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const handleSearchSelect = (item) => {
    if (!item) return;

    if (item.entityType === 'hawkerCentre') {
      navigate(`/hawker-centres/${item.id}`);
    } else if (item.entityType === 'stall') {
      navigate(`/stalls/${item.id}`);
    } else if (item.entityType === 'dish') {
      if (item.stallId) {
        navigate(`/stalls/${item.stallId}`);
      } else {
        setSearchQuery(item.name);
      }
    }

    setIsSearchOpen(false);
    if (isMobileMenuOpen) {
      closeMobileMenu();
    }
  };

  const handleSearchFocus = () => {
    setIsSearchOpen(true);
  };

  const handleSearchBlur = () => {
    setIsSearchOpen(false);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setSearchError(null);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsSearchOpen(false);
      event.currentTarget.blur();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsSearchOpen(true);
      if (searchSections.flatItems.length === 0) return;
      setActiveResultIndex((prev) => {
        if (prev < 0) return 0;
        return (prev + 1) % searchSections.flatItems.length;
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsSearchOpen(true);
      if (searchSections.flatItems.length === 0) return;
      setActiveResultIndex((prev) => {
        if (prev < 0) return searchSections.flatItems.length - 1;
        return (prev - 1 + searchSections.flatItems.length) % searchSections.flatItems.length;
      });
      return;
    }

    if (event.key === 'Enter') {
      if (activeResultIndex < 0) return;
      const item = searchSections.flatItems[activeResultIndex];
      if (!item) return;
      event.preventDefault();
      handleSearchSelect(item);
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#E7EEE7] bg-white shadow-sm">
      {/* desktop */}
      <div className="hidden w-full md:flex">
        <div className="flex w-full items-center gap-6 px-[4vw] py-3">
          <nav
            className="flex shrink-0 items-center gap-2.5"
            aria-label="Primary navigation"
          >
            {navIcons.map((icon) => (
              <IconPill
                key={icon.label}
                {...icon}
                isActive={isActive(icon.href)}
              />
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
                <Search className="h-4 w-4 text-[#4A554B]" />
              </Box>
              <Input
                placeholder="Search dishes, stalls, categories..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onKeyDown={handleSearchKeyDown}
                aria-busy={isSearchLoading}
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
                ref={searchInputRef}
              />
              <Box className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <kbd className="inline-flex h-5 items-center justify-center rounded border border-[#E7EEE7] bg-[#F8FDF3] px-2 text-xs text-[#4A554B] leading-none">
                  Ctrl + K
                </kbd>
              </Box>
              <SearchDropdown
                isOpen={isSearchOpen}
                isLoading={isSearchLoading}
                error={searchError}
                query={debouncedQuery}
                sections={searchSections.sections}
                activeIndex={activeResultIndex}
                onSelect={handleSearchSelect}
                onHighlight={(item) => setActiveResultIndex(item.flatIndex)}
              />
            </Box>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {status === 'authenticated' && (
              <div className="flex items-center gap-0">
                <IconAction Icon={Heart} label="Favourites" to="/favourites" />
                <IconAction
                  Icon={ShoppingCart}
                  label="Cart"
                  badge={count}
                  onClick={openCart}
                />
              </div>
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
                  <div className="absolute right-0 mt-2 min-w-full whitespace-nowrap rounded-2xl border border-[#E7EEE7] bg-white py-1 shadow-[0_10px_25px_rgba(0,0,0,0.08)]">
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block w-full px-4 py-2 text-left text-sm text-[#1C201D] hover:bg-[#F8FDF3] rounded-2xl"
                    >
                      Profile
                    </Link>
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
        <div className="flex items-center">
          {status === 'authenticated' && (
            <div className="flex items-center">
              <div className="flex items-center gap-0">
                <div className="-mr-2">
                  <IconAction Icon={Heart} label="Favourites" to="/favourites" />
                </div>
                <IconAction Icon={ShoppingCart} label="Cart" badge={count} onClick={openCart} />
              </div>
              <div className="w-0" />
            </div>
          )}

          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center text-[#21421B]"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* mobile slide menu */}
      <div
        aria-hidden={!isMobileMenuOpen}
        inert={!isMobileMenuOpen ? '' : undefined}
        className={`fixed inset-0 z-50 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
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
                transform: isMobileMenuOpen
                  ? 'translateX(0)'
                  : 'translateX(100%)',
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
                isMobileSearchOpen
                  ? 'pointer-events-none scale-95 opacity-0'
                  : 'opacity-100'
              }`}
            >
              <Search className="h-5 w-5 text-[#21421B]" />
            </button>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="ml-auto flex items-center gap-2 text-[#21421B]"
            >
              <span className="text-base">Close</span>
              <X className="h-4 w-4" aria-hidden="true" />
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
                <Search className="h-4 w-4 text-[#4A554B]" />
              </Box>
              <Input
                placeholder="Search dishes, stalls, categories..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onKeyDown={handleSearchKeyDown}
                aria-busy={isSearchLoading}
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
            {mobileMenuNavItems.map(({ label, Icon, iconSrc, href }) => (
              <Link
                key={label}
                to={href}
                onClick={closeMobileMenu}
                className={`flex items-center gap-4 rounded-2xl border px-4 py-3 text-[#1C201D] ${
                  isActive(href)
                    ? 'border-[#21421B] bg-[#F8FDF3]'
                    : 'border-[#F1F1F1]'
                }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8FDF3]">
                  {Icon ? (
                    <Icon className="h-5 w-5 text-[#4A554B]" />
                  ) : (
                    <img src={iconSrc} alt="" className="h-5 w-5" />
                  )}
                </span>
                <span className="text-base font-medium">{label}</span>
              </Link>
            ))}

            {status === 'authenticated' ? (
              <div className="flex gap-4 w-full">
                <Link
                  to="/profile"
                  onClick={closeMobileMenu}
                  className="flex flex-1 items-center gap-3 rounded-2xl border border-[#21421B] px-4 py-3 text-left"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#21421B] text-base font-semibold text-white">
                    {profileInitial}
                  </span>
                  <p className="text-lg font-semibold text-[#1C201D]">
                    {profileIdentifier}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await handleLogout();
                    closeMobileMenu();
                  }}
                  disabled={authLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#21421B] bg-[#21421B] px-4 py-3 text-white font-medium"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  {authLoading ? 'Signing out...' : 'Log out'}
                </button>
              </div>
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
                  <p className="text-xs text-[#6d7f68]">
                    Access saved stalls & orders
                  </p>
                </div>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
