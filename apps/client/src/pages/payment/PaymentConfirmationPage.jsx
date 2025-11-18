    import { useNavigate } from "react-router-dom";
    import foodImg from "../../assets/logo/french-toast-with-kaya.jpg";
    import EggsImg from "../../assets/logo/EggsBenedict.png";
    import FrenchToastImg from "../../assets/logo/french-toast-with-kaya.jpg";
    import BigBreakfastImg from "../../assets/logo/BigBreakfast.png";

    export default function PaymentConfirmationPage() {
      const navigate = useNavigate();

      return (
        <div className="w-full min-h-screen bg-[#F8FDF3] px-10 py-8">

          {/* HEADER */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)}>
              <span className="text-3xl">&#x2039;</span>
            </button>
            <h1 className="text-2xl font-semibold">Payment Details</h1>
          </div>

          <hr className="border-gray-300 mb-10" />

          {/* 🔥 MAIN WHITE CONTAINER */}
          <div className="
            bg-white 
            rounded-2xl 
            shadow-md 
            w-[90%] 
            mx-auto 
            p-10 
            grid 
            grid-cols-1 
            lg:grid-cols-2 
            gap-12
          ">

            {/* LEFT SIDE — PAYMENT */}
            <div className="pr-6">
              <h2 className="text-xl font-semibold mb-6">
                Choose your payment method
              </h2>

              <div className="space-y-5 max-w-md">

                {/* Card Payment Option */}
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

                {/* NETS Option */}
                <div className="pt-6 flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-400"></div>

                  <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUtLNediBEmFF3qJkgRQbSoj4GZkOwpejZLA&s"
                    className="h-20"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT SIDE — ORDER SUMMARY */}
            <div className="pl-6">
              <div className="border rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Order Details</h2>
                <p className="text-gray-600 mb-4">
                  John’s Famous Steak - Tiong Bahru Market
                </p>

                <hr className="my-3" />

                {/* ORDER ITEMS */}
<div className="space-y-8">

  {/* ITEM 1 — Eggs Benedict */}
  <div className="flex justify-between">
    <div className="flex gap-4">
      <img src={EggsImg} className="w-16 h-16 rounded-md object-cover" />
      <div>
        <p className="font-medium">Eggs Benedict</p>
        <p className="text-gray-500 text-sm">x1</p>
      </div>
    </div>
    <p>$16.90</p>
  </div>

  {/* ITEM 2 — French Toast */}
  <div className="flex justify-between">
    <div className="flex gap-4">
      <img src={FrenchToastImg} className="w-16 h-16 rounded-md object-cover" />
      <div>
        <p className="font-medium">French Toast</p>
        <p className="text-gray-500 text-sm">x1</p>
      </div>
    </div>
    <p>$9.50</p>
  </div>

  {/* ITEM 3 — Big Breakfast */}
  <div className="flex justify-between">
    <div className="flex gap-4">
      <img src={BigBreakfastImg} className="w-16 h-16 rounded-md object-cover" />
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
