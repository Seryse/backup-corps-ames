'use client';

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

// Define the shape of a formation in the cart
export type Formation = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageId: string;
  tokenProductId?: string; // Add this for token generation later
};

export type CartItem = Formation & {
  quantity: number;
};

interface CartContextType {
  items: CartItem[];
  addToCart: (formation: Formation) => void;
  // We can add more functions later: removeFromCart, clearCart, etc.
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (formation: Formation) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === formation.id);
      if (existingItem) {
        // For formations, we probably don't want to increase quantity, let's prevent re-adding.
        return prevItems;
      }
      return [...prevItems, { ...formation, quantity: 1 }];
    });
  };

  const itemCount = useMemo(() => {
      return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  const value = {
    items,
    addToCart,
    itemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
