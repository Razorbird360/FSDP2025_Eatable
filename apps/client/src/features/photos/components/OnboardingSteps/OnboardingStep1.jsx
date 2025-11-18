import sunlightImage from "../assets/Onboarding1.png";

export default function OnboardingStep1({ onNext, onBack }) {
  return (
    <main className="flex flex-col bg-[#F6FBF2] pt-6 pb-10 min-h-[calc(100vh-4rem)]">
      <div className="w-full px-[4vw]">
        <div className="relative flex items-center justify-center mb-6">
          <button
            type="button"
            onClick={onBack}
            className="absolute left-2 top-4 md:top-2 text-brand md:left-0 md:ml-[2px] md:mt-[0px]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              className="h-5 w-5"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Upload section centered */}
          <div className="flex flex-col items-center pt-1 md:pt-0 md:-translate-y-[6px]">
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold tracking-[0.14em] uppercase text-gray-600">
                Share Your Dish
              </p>
              <span className="inline-flex items-center rounded-full bg-[#F9F1E5] px-3 py-1 text-xs font-medium text-gray-700">
                Step 1 of 2
              </span>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              Capture or upload a photo to get started
            </p>
          </div>
        </div>

        <div className="absolute left-0 right-0 h-px bg-[#E7EEE7] -translate-y-4" />

        <div className="flex flex-col items-center">
          <div className="mb-8 w-[min(520px,100%)]">
            <div className="mb-6 grid grid-cols-2 text-xs font-medium">
              <div className="flex justify-center">
                <span className="mt-2 flex items-center gap-1 text-[#1B5E20]">
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#1B5E20] text-[10px] text-white">
                    ✓
                  </span>
                  Do
                </span>
              </div>

              <div className="flex justify-center">
                <span className="mt-2 flex items-center gap-1 text-[#C62828]">
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#C62828] text-[10px] text-white">
                    ✕
                  </span>
                  Dont
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <img
                src={sunlightImage}
                alt="Use natural sunlight avoid harsh shadows"
                className="block h-auto w-full"
              />
            </div>
          </div>

          <h1 className="mb-3 text-center text-xl font-semibold text-[#111827] md:text-2xl">
            Use natural sunlight avoid harsh shadows
          </h1>

          <p className="max-w-xl text-center text-sm text-gray-600 md:text-base">
            Soft daylight makes your food look clearer and brighter
            <br />
            Keep shadows from blocking the main part of your dish
          </p>

          <div className="mt-6 mb-8 flex gap-2">
            <span className="h-2 w-2 rounded-full bg-[#21421B]" />
            <span className="h-2 w-2 rounded-full bg-[#D4D4D4]" />
            <span className="h-2 w-2 rounded-full bg-[#D4D4D4]" />
            <span className="h-2 w-2 rounded-full bg-[#D4D4D4]" />
          </div>

          <div className="flex w-full justify-end">
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center justify-center rounded-lg bg-[#21421B] px-8 py-2.5 text-sm font-medium text-white shadow-[0_4px_12px_rgba(33,66,27,0.25)] hover:bg-[#1A3517] -mt-4"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
