import React, { useState, useRef } from 'react';

export default function Tooltip({ label, secondaryLabel, secondaryDelay = 1000, children, className = '' }) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentLabel, setCurrentLabel] = useState(label);
    const timerRef = useRef(null);

    const handleMouseEnter = () => {
        setIsVisible(true);
        setCurrentLabel(label);

        if (secondaryLabel) {
            timerRef.current = setTimeout(() => {
                setCurrentLabel(secondaryLabel);
            }, secondaryDelay);
        }
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setCurrentLabel(label);
    };

    return (
        <div
            className={`relative flex items-center justify-center ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {isVisible && (
                <div className="absolute top-full mt-2 z-50 whitespace-nowrap rounded bg-[#1C201D] px-2 py-1 text-xs font-medium text-white shadow-lg">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#1C201D]" />
                    {currentLabel}
                </div>
            )}
        </div>
    );
}
