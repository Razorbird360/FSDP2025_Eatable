import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingPopup from "./OnboardingSteps/OnboardingPopup";
import OnboardingStep1 from "./OnboardingSteps/OnboardingStep1";
import OnboardingStep2 from "./OnboardingSteps/OnboardingStep2";
import OnboardingStep3 from "./OnboardingSteps/OnboardingStep3";
import OnboardingStep4 from "./OnboardingSteps/OnboardingStep4";
import api from "@lib/api";

export default function Onboarding() {
  const [showPopup, setShowPopup] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handlePopupClose = async (dontShow) => {
    if (dontShow) {
      try {
        await api.post("/media/skip-onboarding", { skip: true });
      } catch (err) {
        console.error("Failed to save skip flag", err);
      }
    }

    setShowPopup(false);
    navigate("/photo-upload");
  };

  const handleFinishSteps = () => {
    setShowPopup(true);
  };

  return (
    <main>
      {/* STEP 1 */}
      <div className={step === 1 ? "block" : "hidden"}>
        <OnboardingStep1
          onNext={() => {
            window.scrollTo(0, 0);
            setStep(2);
          }}
          onBack={() => navigate(-1)}
        />
      </div>

      {/* STEP 2 */}
      <div className={step === 2 ? "block" : "hidden"}>
        <OnboardingStep2
          onNext={() => {
            window.scrollTo(0, 0);
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      </div>

      {/* STEP 3 */}
      <div className={step === 3 ? "block" : "hidden"}>
        <OnboardingStep3
          onNext={() => {
            window.scrollTo(0, 0);
            setStep(4);
          }}
          onBack={() => setStep(2)}
        />
      </div>

      {/* STEP 4 */}
      <div className={step === 4 ? "block" : "hidden"}>
        <OnboardingStep4
          onNext={() => {
            window.scrollTo(0, 0);
            handleFinishSteps();
          }}
          onBack={() => setStep(3)}
        />
      </div>

      {/* POPUP RENDER HERE */}
      {showPopup && <OnboardingPopup onClose={handlePopupClose} />}
    </main>
  );
}
