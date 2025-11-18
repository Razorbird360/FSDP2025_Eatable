import { useNavigate } from "react-router-dom";
import logo_full from "../../assets/logo/logo_full.png";

const foodImg =
  "https://app.yakun.com/media/catalog/product/cache/f77d76b011e98ab379caeb79cadeeecd/f/r/french-toast-with-kaya.jpg";

// ⭐ ADD YOUR IMAGE URLS HERE ⭐
import qrImg from "../../assets/logo/QrPlaceholder.png";
import locationImg from "../../assets/logo/LocationIcon.png";
import clockImg from "../../assets/logo/Clock.png";

export default function OrderCompleted() {
  const navigate = useNavigate();

  return (
    <div className="p-8 bg-[#f8fdf3] min-h-screen">

      {/* BACK + TITLE + LOGO */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-2xl">
          <span>&#8592;</span>
        </button>

        <h1 className="text-2xl font-semibold">Order Confirmation</h1>

        <div className="ml-auto w-40 h-10 flex items-center justify-center">
          <img
            src={logo_full}
            alt="Eatable Logo"
            className="h-full object-contain"
          />
        </div>
      </div>

      <p className="text-center text-xl font-medium my-4">
        Your food order has been placed!
      </p>

      <hr className="my-4" />

      {/* MAIN LAYOUT */}
      <div className="flex gap-10">

        {/* LEFT SIDE */}
        <div className="flex flex-col w-[45%] pl-16 pr-4">

          {/* ORDER META INFO */}
          <div className="text-sm space-y-1 mb-8">
            <p><strong>Order Number:</strong> Fcn8sjcxiz7-84932</p>
            <p><strong>Order Time:</strong> 2025-11-07 20:17:06</p>
          </div>

          {/* LOCATION */}
          <div className="flex items-start gap-3 mb-6">

            {/* LOCATION ICON (replace placeholder) */}
                <img
                 src={locationImg}
                 alt="Location Icon"
                 className="w-10 h-10 object-contain"
            />

            <div>
              <p className="font-medium">Tiong Bahru Market</p>
              <p className="text-gray-500 text-sm">
                30 Seng Poh Rd, Singapore 168898
              </p>
            </div>
          </div>

          {/* PICKUP TIME */}
          <div className="flex items-start gap-3 mb-10">

            {/* CLOCK ICON (replace placeholder) */}
                        <img
            src={clockImg}
            alt="Clock Icon"
            className="w-10 h-10 object-contain"
            />

            <div>
              <p className="font-medium">Estimated Pick-Up Time</p>
              <p className="text-gray-500 text-sm">
                10:00 - 10:10 (30 - 40mins)
              </p>
            </div>
          </div>

          {/* QR CODE */}
          <div className="text-center mb-6">
            <p className="font-medium underline cursor-pointer mb-3">
              Pick Up QR
            </p>

            {/* QR IMAGE (replace placeholder) */}
                        <img
            src={qrImg}
            alt="QR Code"
            className="w-90 h-48 rounded mx-auto object-contain"
            />
          </div>

          {/* RETURN BUTTON */}
          <div className="flex justify-center mt-6">
            <button
              className="bg-green-800 text-white px-6 py-2 rounded-lg 
                       hover:bg-green-900 w-56 text-center"
              onClick={() => navigate("/home")}
            >
              Return to Homepage
            </button>
          </div>

        </div>

        {/* RIGHT SIDE ORDER CARD */}
        <div className="w-[45%] border rounded-xl shadow-sm bg-white">

          <div className="border-b p-4">
            <h2 className="text-xl font-semibold">Order Details</h2>
            <p className="text-sm text-gray-600">
              John’s Famous Steak – Tiong Bahru Market
            </p>
          </div>

          {/* ORDER ITEMS */}
          <div className="divide-y">

            {/* ITEM 1 */}
            <div className="flex justify-between items-center p-4">
              <div className="flex gap-3 items-center">
                <img
                  src={foodImg}
                  alt="Eggs Benedict"
                  className="w-14 h-14 rounded-md object-cover"
                />
                <div>
                  <p className="font-medium text-sm">Eggs Benedict</p>
                  <p className="text-xs text-gray-500">x1</p>
                </div>
              </div>
              <p>$16.90</p>
            </div>

            {/* ITEM 2 */}
            <div className="flex justify-between items-center p-4">
              <div className="flex gap-3 items-center">
                <img
                  src={foodImg}
                  alt="French Toast"
                  className="w-14 h-14 rounded-md object-cover"
                />
                <div>
                  <p className="font-medium text-sm">French Toast</p>
                  <p className="text-xs text-gray-500">x1</p>
                </div>
              </div>
              <p>$9.50</p>
            </div>

            {/* ITEM 3 */}
            <div className="flex justify-between items-center p-4">
              <div className="flex gap-3 items-center">
                <img
                  src={foodImg}
                  alt="Big Breakfast"
                  className="w-14 h-14 rounded-md object-cover"
                />
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
            <div className="flex justify-between">
              <p>Subtotal</p><p>$ 36.90</p>
            </div>
            <div className="flex justify-between">
              <p>Service Fees</p><p>$ 2.00</p>
            </div>
            <div className="flex justify-between">
              <p>Applied Voucher</p><p>- $ 10.00</p>
            </div>

            <div className="border-t pt-2 flex justify-between font-semibold">
              <p>Total</p><p>$ 28.90</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
