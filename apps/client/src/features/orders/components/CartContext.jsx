import { createContext, useContext, useState, useMemo, useCallback } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen(v => !v);

    const addToCart = useCallback((item, qty = 1, notes = "") => {
    setItems(prev => {
        const index = prev.findIndex(
        i => i.id === item.id && i.notes === notes
        );

        if (index !== -1) {
        const copy = [...prev];
        copy[index] = {
            ...copy[index],
            qty: copy[index].qty + qty,
        };
        return copy;
        }

        return [
        ...prev,
        {
            id: item.id,
            name: item.name,
            price: item.price,
            img: item.img,
            stallName: item.stallName,
            stallMarket: item.stallMarket,
            notes,
            qty,
        },
        ];
    });
    }, []);


  const updateQty = (id, notes, qty) => {
    setItems(prev =>
      prev
        .map(i => (i.id === id && i.notes === notes ? { ...i, qty } : i))
        .filter(i => i.qty > 0)
    );
  };

  const removeItem = (id, notes) => {
    setItems(prev =>
      prev.filter(i => !(i.id === id && i.notes === notes))
    );
  };

  const clearCart = () => setItems([]);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.qty, 0),
    [items]
  );

  const value = {
    items,
    addToCart,
    updateQty,
    removeItem,
    clearCart,
    total,
    count,
    isOpen,
    openCart,
    closeCart,
    toggleCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
