import { useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

const ICONS = {
  malay: new URL('../assets/HomePage/malay.svg', import.meta.url).href,
  indian: new URL('../assets/HomePage/indian.svg', import.meta.url).href,
  western: new URL('../assets/HomePage/western.svg', import.meta.url).href,
  chinese: new URL('../assets/HomePage/chinese.svg', import.meta.url).href,
  desserts: new URL('../assets/HomePage/dessert.svg', import.meta.url).href,
  local: new URL('../assets/HomePage/local.svg', import.meta.url).href,
};

/**
 * @component CuisineBox
 * @description A cuisine type selector with hover/active animation effects
 * @param {string} type - Cuisine type (malay, indian, western, chinese, desserts, local)
 * @param {'square'|'circle'} shape - Shape of the box
 * @param {boolean} isActive - Whether this cuisine is currently selected
 * @param {boolean} navigateOnClick - If true, clicking navigates to hawker centres with cuisine filter
 */
function CuisineBox({ type, shape = 'square', isActive = false, navigateOnClick = true }) {
  const navigate = useNavigate();
  const iconSrc = ICONS[type] ?? '';
  const ref = useRef(null);
  const mouseX = useMotionValue(Infinity);
  const distance = useTransform(mouseX, (clientX) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) {
      return Infinity;
    }
    return Math.abs(clientX - (rect.left + rect.width / 2));
  });
  
  // Scale based on hover distance OR active state
  const targetScale = useTransform(distance, [0, 80, 160], [1.15, 1.05, 1]);
  const hoverScale = useSpring(targetScale, { mass: 0.2, stiffness: 200, damping: 18 });
  
  // When active, use fixed scale
  const scale = isActive ? 1.15 : hoverScale;

  const isCircle = shape === 'circle';

  const handleClick = () => {
    if (navigateOnClick) {
      // Navigate to hawker centres page with cuisine filter pre-selected
      navigate('/hawker-centres', { state: { selectedCuisine: type } });
    }
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={(event) => mouseX.set(event.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      onClick={handleClick}
      style={{ scale }}
      className={`cursor-pointer flex aspect-square flex-col items-center justify-center text-center shadow-md transition-colors duration-200 ${
        isActive ? 'bg-brand text-white' : 'bg-white text-brand hover:bg-brand hover:text-white'
      } ${
        isCircle
          ? 'rounded-full gap-0.5 text-xs max-[430px]:text-sm shadow-lg px-1 w-[4.5rem] h-[4.5rem] max-[430px]:w-[4.1rem] max-[430px]:h-[4.1rem]'
          : 'w-full rounded-2xl border border-black/30 gap-1.5 text-sm px-2'
      }`}
    >
      <img
        src={iconSrc}
        alt={`${type} cuisine icon`}
        className={isCircle ? 'h-7 w-7 max-[430px]:h-10 max-[430px]:w-10' : 'h-14 w-14 max-[430px]:h-12 max-[430px]:w-12'}
      />
      <p className={`capitalize ${isCircle ? '-mt-0.5' : ''}`}>{type}</p>
    </motion.div>
  )
}

export default CuisineBox
