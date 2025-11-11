import React, { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

const ICONS = {
  malay: new URL('../assets/HomePage/malay.svg', import.meta.url).href,
  indian: new URL('../assets/HomePage/indian.svg', import.meta.url).href,
  western: new URL('../assets/HomePage/western.svg', import.meta.url).href,
  chinese: new URL('../assets/HomePage/chinese.svg', import.meta.url).href,
  desserts: new URL('../assets/HomePage/dessert.svg', import.meta.url).href,
  local: new URL('../assets/HomePage/local.svg', import.meta.url).href,
};


function CuisineBox({ type }) {
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
  const targetScale = useTransform(distance, [0, 80, 160], [1.15, 1.05, 1]);
  const scale = useSpring(targetScale, { mass: 0.2, stiffness: 200, damping: 18 });

  return (
    <motion.div
      ref={ref}
      onMouseMove={(event) => mouseX.set(event.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      style={{ scale }}
      className="cursor-pointer flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-black/30 bg-white px-2 text-center text-base text-brand shadow-md transition-colors duration-200 hover:bg-brand hover:text-white max-[430px]:text-sm"
    >
      <img src={iconSrc} alt={`${type} cuisine icon`} className="h-14 w-14 max-[430px]:h-12 max-[430px]:w-12" />
      <p className='capitalize'>{type}</p>
    </motion.div>
  )
}

export default CuisineBox
