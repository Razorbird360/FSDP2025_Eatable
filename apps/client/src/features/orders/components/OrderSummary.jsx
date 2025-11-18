import { useNavigate } from "react-router-dom";
import LogoImage from "../../../assets/logo/logo_full.png";
import api from "../../../lib/api";
import { useCart } from "./CartContext";
import { useState, useEffect } from "react";

export default function OrderSummary() {
  const navigate = useNavigate();

    const [serviceFee, setServiceFee] = useState(0);
    const [loadingFee, setLoadingFee] = useState(true);

  const {
    items,
    total: cartTotal,   // from CartContext useMemo
    updateQty,
    removeItem,          // optional, if you want a remove button
    refreshCart,
    closeCart,
  } = useCart();

  // Stall name from first item in cart
  const stallName =
    items[0]?.stallName || "Your selected stall";

  // You can either recompute subtotal here or just use cartTotal
  const subtotal = cartTotal;     // placeholder – adjust if needed
  const voucherApplied = 0.0;    // placeholder – make dynamic later
  const total = subtotal + serviceFee - voucherApplied;

  useEffect(() => {
  async function fetchServiceFee() {
    try {
      const res = await api.get("/orders/serviceFees");
      console.log("Service Fees response:", res);
      // assuming backend returns { serviceFee: 2.0 }
      setServiceFee(res.data.serviceFeesCents/100 || 0);
    } catch (err) {
      console.error("Failed to fetch service fee:", err);
      setServiceFee(0); // fallback to 0 or default
    } finally {
      setLoadingFee(false);
    }
  }

  fetchServiceFee();
}, []);


  async function Checkout() {
    try {
      console.log("Proceeding to checkout...");
      const res = await api.post("/orders/newOrder");

      if (res.status === 200) {
        // if backend clears cart on newOrder, then sync front-end
        await refreshCart();
        closeCart();
        navigate(`/makepayment/${res.data.orderId}`);
      } else {
        console.error("Failed to create order:", res);
      }
    } catch (err) {
      console.error("Checkout error:", err);
    }
  }

  // If cart is empty, you can show a friendly message
  if (!items.length) {
    return (
      <div className="min-h-screen bg-[#F4FAF1] flex justify-center py-6">
        <div className="w-full max-w-5xl bg-white shadow-sm border border-[#E4E4E4] mx-4">
          <header className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E4]">
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
              onClick={() => navigate(-1)}
            >
              <span className="text-xl">&lt;</span>
            </button>

            <h1 className="text-xl font-semibold ml-4 flex-1">
              Order Summary
            </h1>

            <img
              src={LogoImage}
              alt="Eatable Logo"
              className="h-10 object-contain"
            />
          </header>

          <div className="px-6 py-10 text-center text-gray-600">
            Your cart is empty. Add some items first!
          </div>
        </div>
      </div>
    );
  }

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
            className="h-10 object-contain"
          />
        </header>

        {/* ITEMS */}
        <section className="px-6 pt-4 pb-6 space-y-4">
          {items.map((item) => (
            <div
              key={item.cartId}
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
                  * {item.notes || "No special instructions"}
                </p>

                {/* Quantity pill */}
                <div className="mt-2">
                  <div className="inline-flex items-center bg-[#6C7F63] rounded-full px-1 py-0.5 gap-2">
                    {/* Minus circle */}
                    <button
                      className="w-5 h-5 flex items-center justify-center bg-white text-black rounded-full text-sm leading-none"
                      onClick={() => updateQty(item.cartId, item.qty - 1)}
                    >
                      –
                    </button>

                    {/* Quantity number */}
                    <span className="text-white font-medium text-sm px-1">
                      {item.qty}
                    </span>

                    {/* Plus circle */}
                    <button
                      className="w-5 h-5 flex items-center justify-center bg-white text-black rounded-full text-sm leading-none"
                      onClick={() => updateQty(item.cartId, item.qty + 1)}
                    >
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
              <span>
                {loadingFee ? "Loading..." : `$ ${serviceFee.toFixed(2)}`}
              </span>
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
            onClick={Checkout}
            disabled={!items.length}
            className="px-8 py-2 rounded-md text-white text-sm font-medium shadow-[0_4px_12px_rgba(33,66,27,0.25)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#21421B" }}
          >
            Proceed to Payment
          </button>
        </section>
      </div>
    </div>
  );
}

