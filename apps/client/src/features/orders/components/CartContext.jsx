/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import api from "@lib/api"; // adjust path if needed

const CartContext = createContext(null);

// Helper: map API row -> frontend item shape
function mapCartRow(row) {
  const mi = row.menu_items || row.menuItem || {};
  const stall = mi.stall || {};
  const topUpload = Array.isArray(mi.mediaUploads) ? mi.mediaUploads[0] : null;

  return {
    cartId: row.id || row.cartId, // user_cart.id
    id: mi.id,                    // menu_items.id
    name: mi.name,
    price:
      typeof mi.priceCents === "number"
        ? mi.priceCents / 100
        : mi.price ?? 0,

    // 🔹 image from the top-voted media upload
    img: topUpload?.imageUrl || topUpload?.image_url || null,

    // 🔹 special instructions from DB (user_cart.request)
    notes: row.request || "",

    // 🔹 stall details
    stallId: stall.id || stall.stallId || stall.stall_id || null,
    stallName: stall.name || null,
    stallDescription: stall.description || null,
    stallLocation: stall.location || null,
    stallCuisine: stall.cuisineType || stall.cuisine_type || null,

    qty: Number(row.qty ?? 1),
  };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((v) => !v);

  // --- Load cart from backend on mount ---
  useEffect(() => {
    let ignore = false;

    async function loadCart() {
      try {
        const res = await api.get("/cart/get");
        const rows = Array.isArray(res.data) ? res.data : res.data.items ?? [];
        if (!ignore) {
          setItems(rows.map(mapCartRow));
        }
      } catch (err) {
        console.error("Failed to load cart:", err);
      }
    }

    loadCart();
    return () => {
      ignore = true;
    };
  }, []);

  const addToCart = useCallback(
    async (menuItem, qty = 1, notes = "") => {
      try {
        console.log(menuItem);
        // --- figure out stall of incoming item ---
        const incomingStallId =
          menuItem.stallId ||
          menuItem.stall_id ||
          menuItem.stall?.id ||
          null;

        const incomingStallName =
          menuItem.stallName ||
          menuItem.stall_name ||
          menuItem.stall?.name ||
          null;

        const existingFirst = items[0];

        console.log(existingFirst);
        if (existingFirst) {
          const existingStallId =
            existingFirst.stallId ||
            existingFirst.stall_id ||
            null;

          const existingStallName =
            existingFirst.stallName ||
            existingFirst.stall_name ||
            null;

          const sameStall =
            (incomingStallId &&
              existingStallId &&
              incomingStallId === existingStallId) ||
            (!incomingStallId &&
              !existingStallId &&
              incomingStallName &&
              existingStallName &&
              incomingStallName === existingStallName);

          // 🔹 If different stall, ask for confirmation & clear cart if proceed
          if (!sameStall) {
            const ok = window.confirm(
              "Your cart currently has items from another stall.\n" +
                "If you add this item, your cart will be cleared.\n\n" +
                "Proceed?"
            );

            if (!ok) {
              // user cancelled – do nothing
              return { success: false, cancelled: true };
            }

            // clear on backend and frontend
            try {
              await api.delete("/cart/clear");
              setItems([]);
            } catch (err) {
              console.error(
                "Failed to clear cart before adding new stall item:",
                err
              );
              return { success: false, error: err };
            }
          }
        }

        // --- normal add flow ---
        const payload = {
          itemId: menuItem.id,
          qty,
          request: notes,
        };

        console.log("[addToCart] payload:", payload);
        const res = await api.post("/cart/add", payload);
        console.log("Add to cart response:", res.data);

        // ✅ After successful add, re-fetch full cart from backend
        const getRes = await api.get("/cart/get");
        const rows = Array.isArray(getRes.data)
          ? getRes.data
          : getRes.data.items ?? [];

        setItems(rows.map(mapCartRow));

        return { success: true };
      } catch (err) {
        const serverData = err.response?.data;
        const msg =
          serverData?.message ||
          serverData?.error ||
          err.message ||
          "Unknown error";

        console.error("Failed to add to cart:", msg, serverData, err);
        return { success: false, error: err };
      }
    },
    [items]
  );

  // --- Update qty (PUT /cart/update) ---
  const updateQty = useCallback(
    async (cartId, qty) => {
      try {
        if (qty <= 0) {
          // If qty <= 0, treat as remove
          await api.delete("/cart/remove", { data: { cartId } });
          setItems((prev) => prev.filter((i) => i.cartId !== cartId));
          return;
        }

        // find current item so we preserve notes
        const current = items.find((i) => i.cartId === cartId);
        const request = current?.notes ?? "";

        const res = await api.put("/cart/update", {
          cartId,
          qty,
          request,
        });

        const updatedRow = res.data?.data ?? res.data;

        setItems((prev) =>
          prev.map((i) =>
            i.cartId === cartId
              ? { ...i, qty: Number(updatedRow.qty ?? qty) }
              : i
          )
        );
      } catch (err) {
        console.error("Failed to update cart item:", err);
      }
    },
    [items]
  );

  // --- Remove item (DELETE /cart/remove) ---
  const removeItem = useCallback(async (cartId) => {
    try {
      await api.delete("/cart/remove", { data: { cartId } });
      setItems((prev) => prev.filter((i) => i.cartId !== cartId));
    } catch (err) {
      console.error("Failed to remove cart item:", err);
    }
  }, []);

  // --- Clear cart (DELETE /cart/clear) ---
  const clearCart = useCallback(async () => {
    try {
      await api.delete("/cart/clear");
      setItems([]);
    } catch (err) {
      console.error("Failed to clear cart:", err);
    }
  }, []);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.qty, 0),
    [items]
  );

  const refreshCart = useCallback(async () => {
    try {
      const res = await api.get("/cart/get");
      const rows = Array.isArray(res.data) ? res.data : res.data.items ?? [];
      setItems(rows.map(mapCartRow));
    } catch (err) {
      console.error("Failed to refresh cart:", err);
    }
  }, []);

  const value = {
    items, // each item has cartId + menu item id
    addToCart,
    updateQty,   // (cartId, newQty)
    removeItem,  // (cartId)
    clearCart,
    total,
    count,
    isOpen,
    openCart,
    closeCart,
    toggleCart,
    refreshCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
