import { useNavigate } from "react-router-dom";
import LogoImage from "../../../assets/logo/logo_full.png";

export default function OrderSummary() {
  const navigate = useNavigate();

  const stallName = "John’s Famous Steak - Tiong Bahru Market";

  const items = [
    {
      id: 1,
      name: "Eggs Benedict",
      price: 16.9,
      quantity: 1,
      instructions: "No special instructions",
      img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400",
    },
    {
      id: 2,
      name: "French Toast",
      price: 9.5,
      quantity: 1,
      instructions: "No special instructions",
      img: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=400",
    },
    {
      id: 3,
      name: "Big Breakfast",
      price: 10.5,
      quantity: 1,
      instructions: "No special instructions",
      img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400",
    },
  ];

  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const serviceFee = 2.0;
  const voucherApplied = 10.0;
  const total = subtotal + serviceFee - voucherApplied;

  return (
    <div className="min-h-screen bg-[#F4FAF1] flex justify-center py-6">
      <div className="w-full max-w-5xl bg-white shadow-sm border border-[#E4E4E4] mx-4">
{/* HEADER */}
<header className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E4]">

  {/* Back button */}
  <button
    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
    onClick={() => navigate(-1)}
  >
    <span className="text-xl">&lt;</span>
  </button>

  {/* Left-aligned title */}
  <h1 className="text-xl font-semibold ml-4 flex-1">
    Order Summary ({stallName})
  </h1>

  {/* Bigger logo */}
  <img
    src={LogoImage}
    alt="Eatable Logo"
    className="h-10 object-contain"  // increased from h-6 → h-10
  />
</header>

        {/* ITEMS */}
        <section className="px-6 pt-4 pb-6 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center bg-white border border-[#E4E4E4] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] px-4 py-3"
            >
              <img
                src={item.img}
                alt={item.name}
                className="w-20 h-20 rounded-lg object-cover mr-4"
              />

              <div className="flex-1">
                <p className="font-semibold text-[15px]">{item.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  * {item.instructions}
                </p>

              {/* Quantity pill */}
              <div className="mt-2">
                <div className="inline-flex items-center bg-[#6C7F63] rounded-full px-1 py-0.5 gap-2">

                  {/* Minus circle */}
                  <button className="w-5 h-5 flex items-center justify-center bg-white text-black rounded-full text-sm leading-none">
                    –
                  </button>

                  {/* Quantity number */}
                  <span className="text-white font-medium text-sm px-1">
                    {item.quantity}
                  </span>

                  {/* Plus circle */}
                  <button className="w-5 h-5 flex items-center justify-center bg-white text-black rounded-full text-sm leading-none">
                    +
                  </button>

                </div>
              </div>

              </div>

              {/* PRICE */}
              <p className="text-lg font-semibold ml-4 whitespace-nowrap">
                $ {item.price.toFixed(2)}
              </p>
            </div>
          ))}
        </section>

        {/* VOUCHER BAR – LEFT ALIGNED */}
        <section className="border-y border-[#E4E4E4] bg-[#F8F8F8] py-4 px-6 flex">
          <button
            className="px-8 py-2 rounded-md text-white text-sm font-medium shadow-[0_4px_12px_rgba(33,66,27,0.25)] transition-all"
            style={{ backgroundColor: "#21421B" }}
          >
            Select Vouchers Available
          </button>
        </section>

        {/* SUMMARY */}
        <section className="px-6 py-6 border-b border-[#E4E4E4]">
          <div className="flex justify-between text-[15px] text-gray-800 mb-2">
            <span>Subtotal</span>
            <span>$ {subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-[15px] text-gray-900 font-semibold mb-2">
            <span>Service Fees</span>
            <span>$ {serviceFee.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-[15px] text-gray-800 mb-2">
            <span>Applied Voucher</span>
            <span>- $ {voucherApplied.toFixed(2)}</span>
          </div>
        </section>

        {/* TOTAL + BUTTON */}
        <section className="px-6 py-5 flex items-center justify-between">
          <div className="text-lg font-semibold">
            <span className="mr-2">Total</span>
            <span>$ {total.toFixed(2)}</span>
          </div>

          <button
            className="px-8 py-2 rounded-md text-white text-sm font-medium shadow-[0_4px_12px_rgba(33,66,27,0.25)] transition-all"
            style={{ backgroundColor: "#21421B" }}
          >
            Proceed to Payment
          </button>
        </section>
      </div>
    </div>
  );
}
