import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";

import NetsLogo from "../../assets/payment/netsQRLogo.png";
import NetsQrPopup from "./NetsQrPopup";

export default function MakePayment() {
  const orderId = useParams().orderid;
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState("card"); // "card" | "netsqr"
  const [showNetsModal, setShowNetsModal] = useState(false);

  const isCard = paymentMethod === "card";
  const isNets = paymentMethod === "netsqr";

  const handleSelectCard = () => {
    setPaymentMethod("card");
    setShowNetsModal(false);
  };

  const handleSelectNets = () => {
    setPaymentMethod("netsqr");
  };

  const handleNext = () => {
    if (paymentMethod === "card") {
      navigate("/make-payment");
    } else if (paymentMethod === "netsqr") {
      setShowNetsModal(true);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FDF3]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)}>
            <span className="text-3xl">&#x2039;</span>
          </button>
          <h1 className="text-2xl font-semibold">Payment Details</h1>
        </div>

        <hr className="border-gray-300 mb-8" />

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* LEFT SIDE — PAYMENT METHODS */}
          <div className="order-2 lg:order-1">
            <h2 className="text-xl font-semibold mb-6">
              Choose your payment method
            </h2>

            <div className="space-y-4 max-w-md">
              {/* CARD OPTION ROW */}
              <button
                type="button"
                onClick={handleSelectCard}
                className="flex items-center gap-3 w-full text-left hover:bg-gray-50 rounded-lg px-2 py-2 transition"
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isCard ? "border-blue-500" : "border-gray-300"
                  }`}
                >
                  {isCard && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>

                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg"
                  className="h-8"
                />
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                  className="h-8"
                />
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg"
                  className="h-8"
                />
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQslI5EhEGQeZ15bfFh7Esho6L9BqRev8s9EQ&s"
                  className="h-8"
                />
              </button>

              {/* Card inputs */}
              <input
                placeholder="Name"
                className="w-full border rounded-md px-4 py-2"
              />
              <input
                placeholder="Postal code"
                className="w-full border rounded-md px-4 py-2"
              />
              <input
                placeholder="Card number"
                className="w-full border rounded-md px-4 py-2"
              />

              <div className="flex gap-4">
                <input
                  placeholder="Exp"
                  className="w-full border rounded-md px-4 py-2"
                />
                <input
                  placeholder="CVV"
                  className="w-full border rounded-md px-4 py-2"
                />
              </div>

              {/* NETS QR OPTION */}
              <button
                type="button"
                onClick={handleSelectNets}
                className="pt-6 flex items-center gap-3 w-full text-left hover:bg-gray-50 rounded-lg px-2 py-2 transition"
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isNets ? "border-blue-500" : "border-gray-300"
                  }`}
                >
                  {isNets && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>

                <img src={NetsLogo} className="h-20" />
              </button>
            </div>
          </div>

          {/* RIGHT SIDE — ORDER SUMMARY */}
          <div className="order-1 lg:order-2">
            <div className="border rounded-xl p-6 shadow-sm">
              {/* keep your existing order summary here */}
            </div>

            {/* Desktop / large screens: button under summary */}
            <div className="mt-6 flex justify-end hidden lg:flex">
              <button
                className="bg-green-800 text-white px-8 py-2 rounded-lg hover:bg-green-900"
                onClick={handleNext}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Mobile / small screens: button at bottom of page */}
        <div className="mt-6 flex justify-end lg:hidden">
          <button
            className="bg-green-800 text-white px-8 py-2 rounded-lg w-full sm:w-auto hover:bg-green-900"
            onClick={handleNext}
          >
            Next
          </button>
        </div>
      </div>

      {/* NETS QR POPUP MODAL */}
      <NetsQrPopup
        isOpen={showNetsModal}
        amount="3"
        orderId={orderId}
        onClose={() => setShowNetsModal(false)}
        onSuccess={(data) => {
          console.log("NETS success:", data);
          // navigate(`/order-success/${orderId}`);
        }}
        onFail={(data) => {
          console.log("NETS failed:", data);
        }}
      />
    </div>
  );
}
