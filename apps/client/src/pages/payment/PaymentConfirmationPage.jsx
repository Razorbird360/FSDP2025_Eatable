import { useNavigate } from "react-router-dom";

// Correct image import path
import foodImg from "../../assets/logo/french-toast-with-kaya.jpg";

export default function PaymentConfirmationPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-white px-8 py-6">

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

        {/* LEFT SIDE */}
        <div>
          <h2 className="text-xl font-semibold mb-6">
            Choose your payment method
          </h2>

          <div className="space-y-4 max-w-md">

            {/* Radio + Logos */}
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-blue-400"></div>

              <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" className="h-8" />
              <img src="data:image/png;base64,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" className="h-8" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg" className="h-8" />
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQslI5EhEGQeZ15bfFh7Esho6L9BqRev8s9EQ&s" className="h-8" />
            </div>

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

            {/* NETS Radio */}
            <div className="pt-6 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-blue-400"></div>

              <img
                src="data:image/png;base64,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"
                className="h-20"
              />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE — ORDER SUMMARY */}
        <div>
          <div className="border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Order Details</h2>
            <p className="text-gray-600 mb-4">
              John’s Famous Steak - Tiong Bahru Market
            </p>

            <hr className="my-3" />

            {/* ORDER ITEMS */}
            <div className="space-y-8">

              {/* ITEM 1 */}
              <div className="flex justify-between">
                <div className="flex gap-4">
                  <img src={foodImg} className="w-16 h-16 rounded-md object-cover" />
                  <div>
                    <p className="font-medium">Eggs Benedict</p>
                    <p className="text-gray-500 text-sm">x1</p>
                  </div>
                </div>
                <p>$16.90</p>
              </div>

              {/* ITEM 2 */}
              <div className="flex justify-between">
                <div className="flex gap-4">
                  <img src={foodImg} className="w-16 h-16 rounded-md object-cover" />
                  <div>
                    <p className="font-medium">French Toast</p>
                    <p className="text-gray-500 text-sm">x1</p>
                  </div>
                </div>
                <p>$9.50</p>
              </div>

              {/* ITEM 3 */}
              <div className="flex justify-between">
                <div className="flex gap-4">
                  <img src={foodImg} className="w-16 h-16 rounded-md object-cover" />
                  <div>
                    <p className="font-medium">Big Breakfast</p>
                    <p className="text-gray-500 text-sm">x1</p>
                  </div>
                </div>
                <p>$10.50</p>
              </div>

            </div>

            <hr className="my-4" />

            {/* PRICE SUMMARY */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <p>Subtotal</p><p>$36.90</p>
              </div>
              <div className="flex justify-between">
                <p>Service Fees</p><p>$2.00</p>
              </div>
              <div className="flex justify-between">
                <p>Applied Voucher</p><p>- $10.00</p>
              </div>

              <hr className="my-2" />

              <div className="flex justify-between font-semibold text-base">
                <p>Total</p><p>$28.90</p>
              </div>
            </div>
          </div>

          {/* NEXT BUTTON */}
          <div className="mt-6 flex justify-end">
            <button
              className="bg-green-800 text-white px-8 py-2 rounded-lg hover:bg-green-900"
              onClick={() => navigate("/make-payment")}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
