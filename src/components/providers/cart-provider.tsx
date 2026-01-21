'use client';

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Dictionary } from '@/lib/dictionaries';

// Define the shape of a product in the cart
export type Product = {
  id: string;
  nameKey: keyof Dictionary['shop']['products'];
  descriptionKey: keyof Dictionary['shop']['products'];
  price: number;
  currency: string;
  imageId: string;
};

export type CartItem = Product & {
  quantity: number;
};

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  // We can add more functions later: removeFromCart, clearCart, etc.
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  const addToCart = (product: Product) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
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
