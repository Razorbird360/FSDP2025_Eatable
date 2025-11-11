import React from 'react'

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

  return (
    <div className="bg-white w-[7.5rem] h-[7.5rem] mb-2 flex justify-center items-center text-brand rounded-2xl border border-black/30 shadow-md">
      <div className='flex flex-col'>
        <img src={iconSrc} alt={`${type} cuisine icon`} />
        <p className='text-brand capitalize'>{type}</p>
      
      </div>
    </div>
  )
}

export default CuisineBox
