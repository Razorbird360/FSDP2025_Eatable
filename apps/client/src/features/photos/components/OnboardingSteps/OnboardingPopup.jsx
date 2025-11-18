import { useState } from "react";

export default function OnboardingPopup({ onClose }) {
  const [dontShow, setDontShow] = useState(false);

  const handleContinue = () => {
    onClose(dontShow);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">

      {/* CARD */}
      <div
        className="
          relative
          w-full
          max-w-[580px]
          rounded-[24px]
          bg-[#F6FBF2]
          pt-14 pb-10 px-6
          shadow-[0_20px_60px_rgba(0,0,0,0.25)]
          overflow-hidden
        "
      >

        {/* SMILE ICON */}
        <div className="relative mb-8 flex justify-center">
          <svg viewBox="0 0 48 48" className="h-16 w-16 text-[#21421B]" aria-hidden="true">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" />
            <circle cx="18" cy="20" r="2" fill="currentColor" />
            <circle cx="30" cy="20" r="2" fill="currentColor" />
            <path
              d="M16 29c2.5 3 5.5 4.5 8 4.5s5.5-1.5 8-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* TITLE */}
        <h2 className="relative mb-8 text-center text-[22px] font-semibold text-black leading-snug">
          Ready to go — start snapping!
        </h2>

        {/* CONTINUE BUTTON */}
        <div className="relative mb-6 flex justify-center">
          <button
            onClick={handleContinue}
            className="
              rounded-full
              bg-[#21421B]
              px-10 py-3
              text-sm font-medium text-white
              shadow-[0_8px_20px_rgba(33,66,27,0.35)]
              hover:bg-[#1A3517]
              transition
            "
          >
            Continue
          </button>
        </div>

        {/* DONT SHOW AGAIN */}
        <div className="relative flex justify-center">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="h-4 w-4 rounded border-gray-400"
            />
            <span>Dont show this again</span>
          </label>
        </div>

      </div>
    </div>
  );
}
