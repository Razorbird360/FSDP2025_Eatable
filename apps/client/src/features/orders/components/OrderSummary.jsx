import { useNavigate } from "react-router-dom";

export default function OrderSummary() {
  const navigate = useNavigate();

  // === FAKE DATA FOR NOW ===
  const stallName = "John's Famous Steak - Tiong Bahru Market";

  const items = [
    {
      id: 1,
      name: "Eggs Benedict",
      price: 16.9,
      quantity: 1,
      instructions: "No special instructions",
      img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
    },
    {
      id: 2,
      name: "French Toast",
      price: 9.5,
      quantity: 1,
      instructions: "No special instructions",
      img: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe",
    },
    {
      id: 3,
      name: "Big Breakfast",
      price: 10.5,
      quantity: 1,
      instructions: "No special instructions",
      img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
    },
  ];

  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const serviceFee = 2.0;
  const voucherApplied = 10.0;
  const total = subtotal + serviceFee - voucherApplied;

  return (
    <div className="max-w-4xl mx-auto p-6 font-[Sansation]">
      {/* Back Button */}
      <button className="text-xl mb-3" onClick={() => navigate(-1)}>
        ←
      </button>

      {/* Page Title */}
      <h1 className="text-2xl font-bold mb-6">
        Order Summary ({stallName})
      </h1>

      {/* ITEMS LIST */}
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center bg-white border rounded-lg p-4 shadow-sm"
          >
            <img
              src={item.img}
              alt={item.name}
              className="w-20 h-20 rounded-lg object-cover mr-4"
            />

            <div className="flex-1">
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-gray-500">• {item.instructions}</p>

              {/* Quantity */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm bg-gray-200 px-2 py-1 rounded-full">
                  {item.quantity}
                </span>
              </div>
            </div>

            {/* Price */}
            <p className="text-lg font-semibold">
              ${item.price.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* SELECT VOUCHER BUTTON */}
      <div className="mt-6">
        <button
          className="w-full text-white py-2 rounded-lg transition-all"
          style={{ backgroundColor: "#21421B" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#1A3515")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#21421B")
          }
        >
          Select Vouchers Available
        </button>
      </div>

      {/* SUMMARY BOX */}
      <div className="bg-white mt-6 p-6 rounded-lg shadow">
        <div className="flex justify-between text-gray-700 mb-2">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-gray-700 mb-2">
          <span>Service Fees</span>
          <span>${serviceFee.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-gray-700 mb-4">
          <span>Applied Voucher</span>
          <span>- ${voucherApplied.toFixed(2)}</span>
        </div>

        <hr className="my-4" />

        <div className="flex justify-between text-xl font-bold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* PROCEED BUTTON */}
      <div className="mt-6 flex justify-end">
        <button
          className="text-white px-5 py-2 rounded-lg transition-all"
          style={{ backgroundColor: "#21421B" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#1A3515")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#21421B")
          }
        >
          Proceed to Payment
        </button>
      </div>
    </div>
  );
}
