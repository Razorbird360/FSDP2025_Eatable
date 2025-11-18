import { useNavigate } from "react-router-dom";

export default function PhotoUpload() {
  const navigate = useNavigate();

  return (
    <main className="flex flex-col bg-[#F6FBF2] pt-6 pb-10 min-h-[calc(100vh-4rem)]">
      {/* match onboarding width and spacing */}
      <div className="w-full px-[4vw]">
        {/* header same structure as onboarding */}
        <div className="relative flex items-center justify-center mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute left-2 top-4 md:top-2 text-brand md:left-0 md:ml-[2px] md:mt-[0px]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M15 18L9 12L15 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex flex-col items-center pt-1 md:pt-0 md:-translate-y-[6px]">
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold tracking-[0.14em] uppercase text-gray-600">
                Share Your Dish
              </p>
              <span className="inline-flex items-center rounded-full bg-[#F9F1E5] px-3 py-1 text-xs font-medium text-gray-700">
                Step 2 of 2
              </span>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              Capture or upload a photo to get started
            </p>
          </div>
        </div>

        {/* full width divider under header */}
        <div className="-mx-[4vw]">
          <div className="absolute left-0 right-0 h-px bg-[#E7EEE7] -translate-y-4" />
        </div>

        {/* content area centred */}
        <div className="relative mx-auto mt-6 max-w-6xl">
          {/* left side – camera box */}
          <section className="mx-auto flex w-full flex-col items-center lg:max-w-[720px]">
            <div className="mb-10 flex w-full items-center justify-center rounded-3xl border border-[#E5E7EB] bg-[#F4F4F4] aspect-[4/2.6]">
              <div className="flex flex-col items-center gap-3 text-center text-gray-600">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E7EEE7]">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
                    <rect
                      x="4"
                      y="7"
                      width="16"
                      height="12"
                      rx="2"
                      stroke="#21421B"
                      strokeWidth="1.6"
                      fill="none"
                    />
                    <path
                      d="M9 7.5L10.2 5.5H13.8L15 7.5"
                      stroke="#21421B"
                      strokeWidth="1.6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="13"
                      r="3"
                      stroke="#21421B"
                      strokeWidth="1.6"
                      fill="none"
                    />
                  </svg>
                </div>

                <div className="text-sm font-medium text-[#111827]">
                  Ready to capture?
                </div>
                <p className="text-xs text-gray-500">
                  Take a photo or upload an existing one
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 md:flex-row">
              <button
                type="button"
                className="flex-1 inline-flex flex-col justify-center rounded-xl bg-[#21421B] px-6 py-4 text-left text-white shadow-[0_8px_18px_rgba(0,0,0,0.25)] hover:bg-[#1A3517] transition"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <rect
                      x="4"
                      y="7"
                      width="16"
                      height="12"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      fill="none"
                    />
                    <path
                      d="M9 7.5L10.2 5.5H13.8L15 7.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="13"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      fill="none"
                    />
                  </svg>
                  Take Photo
                </span>
                <span className="mt-1 text-xs text-[#D1FAE5]">
                  Use your camera
                </span>
              </button>

              <button
                type="button"
                className="flex-1 inline-flex flex-col justify-center rounded-xl border border-[#D1D5DB] bg-white px-6 py-4 text-left text-[#111827] shadow-sm hover:bg-[#F9FAFB] transition"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M12 15V5.5M12 5.5L8.5 9M12 5.5L15.5 9"
                      stroke="#21421B"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 15.5V18.5C5 19.328 5.672 20 6.5 20H17.5C18.328 20 19 19.328 19 18.5V15.5"
                      stroke="#374151"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  Upload Photo
                </span>
                <span className="mt-1 text-xs text-gray-500">
                  From your device
                </span>
              </button>
            </div>
          </section>

          {/* right side tips */}
          <aside
            className="
              mt-8
              lg:absolute
              lg:right-0
              lg:translate-x-[70px]
              lg:top-[13.5%] lg:-translate-y-1/2
              lg:w-[260px]
              flex-shrink-0
            "
          >
            <div className="rounded-2xl bg-white px-6 py-5 shadow-sm border border-[#E5E7EB]">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#E6F4EA]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#21421B]" aria-hidden="true">
                    <rect
                      x="4"
                      y="5"
                      width="16"
                      height="14"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M9 11L11.2 13.5L15 9.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[#111827]">
                  Photography Tips
                </span>
              </div>

              <ul className="space-y-2 text-xs text-gray-600">
                <li>Use natural lightning avoid direct sunlight</li>
                <li>Focus on one item per picture</li>
                <li>Make sure the dish fills 70% of the frame</li>
                <li>Dont block others while you take your photo</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
