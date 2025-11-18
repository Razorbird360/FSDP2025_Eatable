import { useNavigate } from "react-router-dom";
import { useState } from "react";

import logo_full from "../../assets/logo/logo_full.png";
import EggsBenedictImg from "../../assets/logo/EggsBenedict.png";
import FrenchToastImg from "../../assets/logo/french-toast-with-kaya.jpg";
import BigBreakfastImg from "../../assets/logo/BigBreakfast.png";
import qrImg from "../../assets/logo/QrPlaceholder.png";
import locationImg from "../../assets/logo/LocationIcon.png";
import clockImg from "../../assets/logo/Clock.png";

export default function MakePayment() {
  const navigate = useNavigate();

  // NEW: Controls exit animation
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);

    // Wait for animation to finish
    setTimeout(() => {
      navigate(-1);
    }, 300); // 300ms matches animation
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FDF3] flex items-center justify-center">

      {/* DARK BACKDROP — fades out on exit */}
      <div
        className={`
          fixed inset-0 bg-black bg-opacity-10 
          transition-opacity duration-300
          ${isClosing ? "opacity-0" : "opacity-100"}
        `}
      ></div>

      {/* POPUP CARD */}
      <div
        className={`
          relative z-10 bg-white shadow-xl rounded-2xl 
          w-[78%] max-w-[1200px] p-10 border 
          transition-all duration-300 
          ${isClosing ? "opacity-0 translate-y-6" : "opacity-100 translate-y-0"}
        `}
      >

        {/* HEADER */}
        <div className="flex items-center mb-6 relative">
          <button onClick={handleClose} className="text-2xl mr-3">
            <span>&#8592;</span>
          </button>

          <h1 className="text-2xl font-semibold">Order Confirmation</h1>

          <div className="absolute right-0 top-0 h-10">
            <img src={logo_full} className="h-full object-contain" />
          </div>
        </div>

        <p className="text-center text-xl font-medium mb-6">
          Your food order has been placed!
        </p>

        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* LEFT SIDE */}
          <div className="pl-6">
            <div className="text-sm space-y-1 mb-8">
              <p><strong>Order Number:</strong> Fcn8sjcxiz7-84932</p>
              <p><strong>Order Time:</strong> 2025-11-07 20:17:06</p>
            </div>

            {/* LOCATION */}
            <div className="flex items-start gap-4 mb-6">
              <img src={locationImg} className="w-10 h-10" />
              <div>
                <p className="font-medium">Tiong Bahru Market</p>
                <p className="text-gray-500 text-sm">
                  30 Seng Poh Rd, Singapore 168898
                </p>
              </div>
            </div>

            {/* PICKUP TIME */}
            <div className="flex items-start gap-4 mb-8">
              <img src={clockImg} className="w-10 h-10" />
              <div>
                <p className="font-medium">Estimated Pick-Up Time</p>
                <p className="text-gray-500 text-sm">
                  10:00 - 10:10 (30 - 40mins)
                </p>
              </div>
            </div>

            {/* QR */}
            <div className="text-center mb-4">
              <p className="underline font-medium mb-2 cursor-pointer">
                Pick Up QR
              </p>
              <img src={qrImg} className="w-40 h-40 mx-auto object-contain" />
            </div>

            {/* RETURN BUTTON */}
            <div className="flex justify-center mt-6">
              <button
                className="bg-green-800 text-white px-6 py-2 rounded-lg 
                           hover:bg-green-900 w-56"
                onClick={() => navigate("/home")}
              >
                Return to Homepage
              </button>
            </div>
          </div>

          {/* RIGHT SIDE ORDER SUMMARY */}
          <div className="border rounded-xl bg-white shadow-sm">

            <div className="border-b p-4">
              <h2 className="text-xl font-semibold">Order Details</h2>
              <p className="text-sm text-gray-600">
                John’s Famous Steak – Tiong Bahru Market
              </p>
            </div>

            {/* ITEMS */}
            <div className="divide-y">

              <div className="flex justify-between items-center p-4">
                <div className="flex gap-3 items-center">
                  <img src={EggsBenedictImg} className="w-14 h-14 rounded-md" />
                  <div>
                    <p className="font-medium text-sm">Eggs Benedict</p>
                    <p className="text-xs text-gray-500">x1</p>
                  </div>
                </div>
                <p>$16.90</p>
              </div>

              <div className="flex justify-between items-center p-4">
                <div className="flex gap-3 items-center">
                  <img src={FrenchToastImg} className="w-14 h-14 rounded-md" />
                  <div>
                    <p className="font-medium text-sm">French Toast</p>
                    <p className="text-xs text-gray-500">x1</p>
                  </div>
                </div>
                <p>$9.50</p>
              </div>

              <div className="flex justify-between items-center p-4">
                <div className="flex gap-3 items-center">
                  <img src={BigBreakfastImg} className="w-14 h-14 rounded-md" />
                  <div>
                    <p className="font-medium text-sm">Big Breakfast</p>
                    <p className="text-xs text-gray-500">x1</p>
                  </div>
                </div>
                <p>$10.50</p>
              </div>

            </div>

            {/* TOTALS */}
            <div className="border-t p-4 text-sm space-y-2">
              <div className="flex justify-between"><p>Subtotal</p><p>$ 36.90</p></div>
              <div className="flex justify-between"><p>Service Fees</p><p>$ 2.00</p></div>
              <div className="flex justify-between"><p>Applied Voucher</p><p>- $ 10.00</p></div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <p>Total</p><p>$ 28.90</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
