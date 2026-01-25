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
import { useAuth } from "../../auth/useAuth";

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

function resolveStallInfo(menuItem, fallback = {}) {
  return {
    id:
      menuItem?.stallId ||
      menuItem?.stall_id ||
      menuItem?.stall?.id ||
      fallback.stallId ||
      null,
    name:
      menuItem?.stallName ||
      menuItem?.stall_name ||
      menuItem?.stall?.name ||
      fallback.stallName ||
      null,
  };
}

function resolveExistingStall(item) {
  if (!item) {
    return { id: null, name: null };
  }

  return {
    id: item.stallId || item.stall_id || null,
    name: item.stallName || item.stall_name || null,
  };
}

function isSameStall(incoming, existing) {
  if (!existing) return true;

  const incomingId = incoming?.id;
  const existingId = existing?.id;
  if (incomingId && existingId) {
    return incomingId === existingId;
  }

  const incomingName = incoming?.name;
  const existingName = existing?.name;
  return Boolean(
    !incomingId &&
      !existingId &&
      incomingName &&
      existingName &&
      incomingName === existingName
  );
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { status } = useAuth();

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((v) => !v);

  // --- Load cart from backend on mount ---
  useEffect(() => {
    if (status !== "authenticated") {
      setItems([]);
      return;
    }

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
  }, [status]);

  const addToCart = useCallback(
    async (menuItem, qty = 1, notes = "") => {
      try {
        console.log(menuItem);
        // --- figure out stall of incoming item ---
        const incomingStall = resolveStallInfo(menuItem);

        const existingFirst = items[0];

        console.log(existingFirst);
        if (existingFirst) {
          const existingStall = resolveExistingStall(existingFirst);
          const sameStall = isSameStall(incomingStall, existingStall);

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

  const addItemsToCart = useCallback(
    async (entries = []) => {
      const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
      if (list.length === 0) {
        return { success: false, error: new Error("No items to add") };
      }

      if (items.length > 0) {
        const ok = window.confirm("Reordering will clear your cart");

        if (!ok) {
          return { success: false, cancelled: true };
        }

        try {
          await api.delete("/cart/clear");
          setItems([]);
        } catch (err) {
          console.error("Failed to clear cart before reordering:", err);
          return { success: false, error: err };
        }
      }

      try {
        for (const entry of list) {
          const menuItem = entry.menuItem || entry.item || entry;
          const menuItemId = menuItem?.id;
          if (!menuItemId) {
            console.warn("Skipping cart item without menu item id:", entry);
            continue;
          }

          const rawQty = Number(entry.qty ?? entry.quantity ?? 1);
          const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
          const notes = entry.notes ?? entry.request ?? "";

          const payload = {
            itemId: menuItemId,
            qty,
            request: notes,
          };

          await api.post("/cart/add", payload);
        }

        const getRes = await api.get("/cart/get");
        const rows = Array.isArray(getRes.data)
          ? getRes.data
          : getRes.data.items ?? [];

        setItems(rows.map(mapCartRow));

        return { success: true };
      } catch (err) {
        console.error("Failed to add items to cart:", err);
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
    addItemsToCart,
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
