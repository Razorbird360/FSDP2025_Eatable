import { useCart } from "./CartContext";
import { useNavigate } from "react-router-dom";


/* back arrow */
function BackIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M15 18l-6-6 6-6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* small clock */
export default function CartSidebar() {
  const navigate = useNavigate();
  const { items, total, isOpen, closeCart, updateQty, removeItem } = useCart();

  const hasItems = items.length > 0;
  const first = hasItems ? items[0] : null;

  const stallTitle = first?.stallName;
  const stallDescription = first?.stallDescription;
  const stallLocation = first?.stallLocation;
  const stallCuisine = first?.stallCuisine;
  const stallId = first?.stallId;


  async function orderSummary() {
    navigate(`/orderSummary`);
    closeCart();
  }

  return (
    <div
      className={`fixed inset-x-0 top-[84px] lg:top-[70px] bottom-0 z-50 transition-opacity duration-200 ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* dimmed background under navbar */}
      <div className="absolute inset-0 bg-transparent pointer-events-none" />

      {/* sliding panel */}
      <aside
        className={`
          absolute right-0 top-0 h-full w-full max-w-sm
          bg-white shadow-xl flex flex-col
          transform transition-transform duration-300
          border border-gray-300 border-r-0
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
        aria-label="Cart sidebar"
      >
        {/* HEADER */}
        <header className="border-b border-gray-200 px-4 py-3">
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={closeCart}
              className="absolute left-0 -ml-2 inline-flex items-center gap-0 text-gray-700 hover:text-black"
            >
              <BackIcon className="w-5 h-5 ml-0.5 mt-1" />
              <span className="text-sm font-medium mt-1">Back</span>
            </button>

            <span className="text-lg font-semibold text-gray-900">
              Items in cart
            </span>
          </div>

          {hasItems && (
            <div className="mt-5 space-y-1">
              <button
                onClick={() => navigate(`/stalls/${stallId}`)}
                className="text-left w-full"
              >
                <p className="text-sm font-semibold text-gray-900 hover:underline">
                  {stallTitle}
                </p>

                {stallDescription && (
                  <p className="text-xs text-gray-600">{stallDescription}</p>
                )}

                {(stallLocation || stallCuisine) && (
                  <p className="text-xs text-gray-500">
                    {stallLocation && <span>{stallLocation}</span>}
                    {stallLocation && stallCuisine && <span> · </span>}
                    {stallCuisine && <span>{stallCuisine}</span>}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                    (click to continue shopping at this stall)
                  </p>
              </button>
            </div>
          )}
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!hasItems ? (
            <p className="mt-2 text-sm text-gray-600">Your cart is empty</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.cartId}
                  className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
                >
                  {/* IMAGE from mediaUploads[0].imageUrl */}
                  {item.img && (
                    <img
                      src={item.img}
                      alt={item.name}
                      className="h-20 w-20 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                    />
                  )}

                  {/* CONTENT */}
                  <div className="flex flex-col justify-center flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[13.5px] font-semibold text-gray-900 leading-tight max-w-[70%]">
                        {item.name}
                      </p>
                      <p className="text-[13.5px] font-semibold text-gray-900 whitespace-nowrap">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>

                    {/* Special instructions from DB (row.request → item.notes) */}
                    <p className="mt-0.5 text-xs text-gray-400">
                      {item.notes && item.notes.trim().length > 0
                        ? item.notes
                        : "* No special instructions"}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      {/* QUANTITY CONTROL */}
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F5EE] px-2 py-1">
                        {/* minus */}
                        <button
                          type="button"
                          onClick={() => updateQty(item.cartId, item.qty - 1)}
                          className="flex h-4 w-4 items-center justify-center rounded-full border border-[#21421B]"
                        >
                          <span className="block h-[1px] w-2 bg-[#21421B]" />
                        </button>

                        <span className="w-4 text-center text-xs leading-none text-[#111827]">
                          {item.qty}
                        </span>

                        {/* plus */}
                        <button
                          type="button"
                          onClick={() => updateQty(item.cartId, item.qty + 1)}
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-[#21421B]"
                        >
                          <span className="relative block h-2 w-2">
                            <span className="absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2 bg-white" />
                            <span className="absolute inset-y-0 left-1/2 w-[1px] -translate-x-1/2 bg-white" />
                          </span>
                        </button>
                      </div>

                      {/* REMOVE BUTTON */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.cartId)}
                        className="text-xs text-gray-500 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* FOOTER */}
        <footer className="border-t border-gray-200 px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-800">Total</span>
            <span className="text-base font-semibold text-gray-900">
              ${total.toFixed(2)}
            </span>
          </div>
          <button
            type="button"
            className="w-full rounded-xl bg-[#21421B] py-3 text-sm font-semibold text-white hover:bg-[#21421B]/90"
            disabled={!hasItems}
            onClick={orderSummary}
          >
            Proceed to checkout
          </button>
        </footer>
      </aside>
    </div>
  );
}
