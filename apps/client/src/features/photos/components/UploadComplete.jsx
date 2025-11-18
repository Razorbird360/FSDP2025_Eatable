import { useState } from "react";
import { useNavigate } from "react-router-dom";

const mockOrders = [
  {
    id: "order-1",
    stallName: "Dian Lao Er - Claypot",
    hawkerName: "Woodlands Market",
    orderDate: "11 Sept 2025",
    itemCount: 3,
    items: [
      "Claypot Dried Chilli Chicken",
      "Claypot Sesame Chicken",
      "Claypot Beancurd"
    ],
    stallIcon:
      "https://images.pexels.com/photos/3184192/pexels-photo-3184192.jpeg?auto=compress&cs=tinysrgb&w=200",
    dishImage:
      "https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
  {
    id: "order-2",
    stallName: "Ah Huat Chicken Rice (AMK Hub)",
    hawkerName: "Ah Huat Chicken Rice",
    orderDate: "8 Sept 2025",
    itemCount: 1,
    items: ["Roasted Chicken Rice"],
    stallIcon:
      "https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg?auto=compress&cs=tinysrgb&w=800",
    dishImage:
      "https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg?auto=compress&cs=tinysrgb&w=800"
  }
];

export default function PhotoUpload() {
  const navigate = useNavigate();

  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [isFoodOpen, setIsFoodOpen] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedItemName, setSelectedItemName] = useState("");

  const [hawkerName, setHawkerName] = useState("");
  const [stallName, setStallName] = useState("");
  const [foodName, setFoodName] = useState("");
  const [foodError, setFoodError] = useState("");

  const selectedOrder = mockOrders.find(o => o.id === selectedOrderId);

  const handleOrderSelect = order => {
    setSelectedOrderId(order.id);
    setHawkerName(order.hawkerName);
    setStallName(order.stallName);

    if (order.items.length === 1) {
      setSelectedItemName(order.items[0]);
      setFoodName(order.items[0]);
    } else {
      setSelectedItemName("");
      setFoodName("");
    }

    setFoodError("");
    setIsOrderOpen(false);
    setIsFoodOpen(false);
  };

  const handleFoodChange = value => {
    setSelectedItemName(value);
    setFoodName(value);
    setFoodError("");
  };

  const handlePost = () => {
    if (
      selectedOrder &&
      selectedOrder.items.length > 1 &&
      !selectedItemName
    ) {
      setFoodError("Please select one food item");
      return;
    }

    console.log("Post photo", {
      hawkerName,
      stallName,
      foodName,
      selectedOrderId
    });
  };

  const previewImageSrc =
    selectedOrder?.dishImage ||
    "https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=800";

  return (
    <main className="flex flex-col bg-[#F6FBF2] pt-6 pb-10 min-h-[calc(100vh-4rem)]">
      <div className="w-full px-[4vw]">
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
              Add details before you post your photo
            </p>
          </div>
        </div>

        <div className="-mx-[4vw]">
          <div className="absolute left-0 right-0 h-px bg-[#E7EEE7] -translate-y-4" />
        </div>

        <div className="mt-10 flex justify-center">
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-20">
            <section className="w-full max-w-[800px]">
              <div className="rounded-3xl bg-[#F9FAFB] border border-[#E5E7EB] px-10 pt-5 pb-6 shadow-sm">
                <p className="mb-3 text-xm font-medium text-gray-800">
                  Preview
                </p>

                <div className="overflow-hidden rounded-2xl bg-white border border-[#E5E7EB]">
                  <div className="h-[450px] w-full bg-[#F3F4F6]">
                    <img
                      src={previewImageSrc}
                      alt="Dish preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#F3F4F6]"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#9CA3AF]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 12H20M12 4V20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  Apply Filter
                </button>
              </div>
            </section>

            <section className="w-full lg:max-w-[460px]">
              <div className="rounded-3xl bg-white border border-[#E5E7EB] px-6 py-5 shadow-sm">
                <h2 className="text-xm font-semibold text-gray-900 mb-4">
                  Photo Details
                </h2>

                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Select Order
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsOrderOpen(open => !open)}
                      className="flex w-full items-center justify-between rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3.5 py-3 text-left shadow-sm hover:bg-[#FFFFFF]"
                    >
                      {selectedOrder ? (
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-[#F3F4F6] overflow-hidden flex items-center justify-center">
                            <img
                              src={selectedOrder.stallIcon}
                              alt={`${selectedOrder.hawkerName} icon`}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900 line-clamp-1">
                              {selectedOrder.stallName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {selectedOrder.itemCount} items ·{" "}
                              {selectedOrder.orderDate}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Choose a past order
                        </span>
                      )}

                      <svg
                        viewBox="0 0 24 24"
                        className={`ml-2 h-4 w-4 text-gray-500 transition-transform ${
                          isOrderOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      >
                        <path
                          d="M6 9L12 15L18 9"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {isOrderOpen && (
                      <div className="absolute z-20 mt-1 w-full rounded-2xl border border-[#E5E7EB] bg-white shadow-lg">
                        <ul className="max-h-64 overflow-y-auto py-1">
                          {mockOrders.map(order => (
                            <li key={order.id}>
                              <button
                                type="button"
                                onClick={() => handleOrderSelect(order)}
                                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-[#F3F4F6]"
                              >
                                <div className="h-8 w-8 rounded-xl bg-[#F3F4F6] overflow-hidden flex items-center justify-center">
                                  <img
                                    src={order.stallIcon}
                                    alt={`${order.hawkerName} icon`}
                                    className="h-full w-full object-cover"
                                  />
                                </div>

                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-gray-900 line-clamp-1">
                                    {order.stallName}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {order.itemCount} items · {order.orderDate}
                                  </span>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Hawker Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={hawkerName}
                    onChange={e => setHawkerName(e.target.value)}
                    placeholder="e.g Ah Huat Chicken Rice"
                    className="w-full rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#21421B] focus:outline-none focus:ring-1 focus:ring-[#21421B]"
                  />
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Stall Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={stallName}
                    onChange={e => setStallName(e.target.value)}
                    placeholder="e.g Hainanese Chicken Rice"
                    className="w-full rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#21421B] focus:outline-none focus:ring-1 focus:ring-[#21421B]"
                  />
                </div>

                <div className="mb-5">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Food Ordered <span className="text-[#DC2626]">*</span>
                  </label>

                  {selectedOrder && selectedOrder.items.length > 1 ? (
                    <>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsFoodOpen(open => !open)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left shadow-sm bg-[#F9FAFB] hover:bg-white ${
                            foodError
                              ? "border-[#DC2626]"
                              : "border-[#D1D5DB]"
                          }`}
                        >
                          {selectedItemName ? (
                            <span className="text-sm text-gray-900">
                              {selectedItemName}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Choose the dish from this order
                            </span>
                          )}

                          <svg
                            viewBox="0 0 24 24"
                            className={`ml-2 h-4 w-4 text-gray-500 transition-transform ${
                              isFoodOpen ? "rotate-180" : ""
                            }`}
                            aria-hidden="true"
                          >
                            <path
                              d="M6 9L12 15L18 9"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        {isFoodOpen && (
                          <div className="absolute z-20 mt-1 w-full rounded-2xl border border-[#E5E7EB] bg-white shadow-lg">
                            <ul className="max-h-64 overflow-y-auto py-1 px-1">
                              {selectedOrder.items.map(item => (
                                <li key={item}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleFoodChange(item);
                                      setIsFoodOpen(false);
                                    }}
                                    className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-[#F3F4F6]"
                                  >
                                    {item}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      {foodError && (
                        <p className="mt-1 text-xs text-[#DC2626]">
                          {foodError}
                        </p>
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={foodName}
                      onChange={e => {
                        setFoodName(e.target.value);
                        setFoodError("");
                      }}
                      placeholder="e.g Claypot Dried Chilli Chicken"
                      className="w-full rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#21421B] focus:outline-none focus:ring-1 focus:ring-[#21421B]"
                    />
                  )}
                </div>

                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FBEF] px-4 py-3.5">
                  <p className="mb-1.5 text-xs font-semibold text-gray-800">
                    Community Guidelines
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-xs text-gray-700">
                    <li>Respect hawkers and their food</li>
                    <li>Use the right stall name</li>
                    <li>Search dish under the correct stall</li>
                  </ul>
                </div>
              </div>

              <div className="mt-7 flex justify-end">
                <button
                  type="button"
                  onClick={handlePost}
                  className="inline-flex items-center gap-2 rounded-full bg-[#21421B] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#183114]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12H19M12 5L19 12L12 19"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Post
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
