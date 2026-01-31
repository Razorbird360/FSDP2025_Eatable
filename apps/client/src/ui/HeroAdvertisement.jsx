import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MapPin, TrendingUp } from 'lucide-react';
import advertiseHero from '../assets/HomePage/Advertise.png';


/**
 * @component HeroAdvertisement
 * @description Featured dish advertisement card with dynamic content
 * @param {string} imageUrl - Background image URL
 * @param {string} dishName - Name of the featured dish
 * @param {string} stallName - Name of the stall
 * @param {string} stallId - ID of the stall for navigation
 * @param {function} onFavoriteToggle - Optional callback for favorite button
 * @param {boolean} isFavorited - Whether the stall is currently favorited
 * @param {boolean} isFavoriteBusy - Whether a favorite request is in flight
 */
function HeroAdvertisement({ 
  imageUrl = advertiseHero, 
  dishName = "Grilled Beef Fried Rice", 
  stallName = "John's famous steaks",
  stallId,
  onFavoriteToggle,
  isFavorited = false,
  isFavoriteBusy = false,
  onFavoriteClick
}) {
  const navigate = useNavigate();

  const handleOrderNow = () => {
    if (stallId) {
      navigate(`/stalls/${stallId}`);
    }
  };

  const handleFavoriteClick = () => {
    if (isFavoriteBusy || !stallId) return;
    if (onFavoriteToggle) onFavoriteToggle();
    if (onFavoriteClick) onFavoriteClick();
  };

  const favoriteButtonClasses = [
    'group relative flex h-10 w-10 items-center justify-center rounded-full p-1 transition-colors duration-150 ease-in-out',
    isFavorited ? 'bg-brand' : 'bg-white hover:bg-brand',
    isFavoriteBusy || !stallId ? 'cursor-not-allowed opacity-70' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden w-full max-w-[24rem] min-h-[22rem] rounded-xl bg-gray-200 bg-cover bg-center max-[540px]:w-full max-[540px]:max-w-[24rem] max-[540px]:min-h-[22.5rem] sm:min-h-[23rem] md:w-[20rem] md:max-w-none md:min-h-[21rem] lg:w-[21.75rem] lg:min-h-[22.5rem] xl:w-[22.25rem] xl:min-h-[23rem] min-[2200px]:w-[24rem] min-[2200px]:min-h-[24.75rem] min-[2500px]:w-[24.75rem] min-[2500px]:min-h-[26rem]"
      aria-label="Featured dish advertisement"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={imageUrl || stallName}
          initial={{ opacity: 0, scale: 1.1, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: -20 }}
          transition={{ 
            opacity: { duration: 0.4 },
            scale: { duration: 0.6, ease: "easeOut" },
            x: { duration: 0.5, ease: "easeInOut" }
          }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl || advertiseHero})` }}
        />
      </AnimatePresence>

      <span className='absolute inset-0 h-full w-full rounded-xl bg-gradient-to-b from-transparent via-black/30 to-black/70 z-10'></span>
      
      <div className="relative z-20 flex w-full items-center justify-between px-5 py-4 max-[430px]:px-4">
        <div className='flex h-9 w-32 items-center justify-evenly rounded-full bg-brand p-0 text-white max-[430px]:h-8 max-[430px]:w-[7.25rem]'>
          <TrendingUp className="h-5 w-5 max-[430px]:h-[1.125rem] max-[430px]:w-[1.125rem]" />
          <p className="-translate-x-1 text-base max-[430px]:text-sm">Top-Rated</p>
        </div>
        <motion.button 
          onClick={handleFavoriteClick}
          className={favoriteButtonClasses}
          aria-label={isFavorited ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={isFavorited}
          disabled={!stallId || isFavoriteBusy}
          initial={false}
          animate={isFavorited ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Heart
            className={`h-6 w-6 transition-colors duration-200 ease-in-out max-[430px]:h-5 max-[430px]:w-5 ${
              isFavorited ? 'text-white' : 'text-brand group-hover:text-white'
            }`}
            fill={isFavorited ? 'currentColor' : 'none'}
          />
        </motion.button>

      </div>

      <div className='absolute bottom-0 mb-1 z-20 flex w-full flex-col px-5 py-4 text-white max-[430px]:px-4'>
        <AnimatePresence mode="wait">
          <motion.div
            key={dishName}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <p className="text-2xl max-[430px]:text-xl font-bold drop-shadow-md">{dishName}</p>
            <p className="-translate-y-1 text-base max-[430px]:text-sm opacity-90 drop-shadow-sm">{stallName}</p>
          </motion.div>
        </AnimatePresence>
        <div className='flex w-full items-center justify-between gap-4 mt-2'>
          <button 
            onClick={handleOrderNow}
            disabled={!stallId}
            className={`flex h-12 w-full max-w-[18rem] items-center justify-center rounded-full bg-brand px-6 max-[430px]:h-11 max-[430px]:w-full max-[430px]:max-w-[14rem] xl:max-w-[17rem] 2xl:max-w-none 2xl:w-[20rem] transition-colors ${
              stallId ? 'hover:bg-brand/90 cursor-pointer shadow-lg' : 'opacity-80 cursor-default'
            }`}
          >
            <p className='text-base font-bold max-[430px]:text-sm'>Order now</p>
          </button>
          {/* Location button - disabled/decorative only */}
          <div 
            className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm max-[430px]:h-11 max-[430px]:w-11 cursor-default'
            aria-label="Location (decorative)"
          >
            <MapPin className="h-7 w-7 max-[430px]:h-6 max-[430px]:w-6 text-white/90" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default HeroAdvertisement;
