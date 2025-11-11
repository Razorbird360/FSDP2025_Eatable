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
      className="cursor-pointer w-[7.5rem] h-[7.5rem] mb-2 flex justify-center items-center text-brand rounded-2xl border border-black/30 shadow-md bg-white transition-colors duration-200 hover:bg-brand hover:text-white"
    >
      <div className='flex flex-col'>
        <img src={iconSrc} alt={`${type} cuisine icon`} />
        <p className='capitalize'>{type}</p>
      </div>
    </motion.div>
  )
}

export default CuisineBox
