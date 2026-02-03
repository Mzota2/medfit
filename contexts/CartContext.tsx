'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Item } from '@/types';
import { getEffectivePrice } from '@/lib/utils/pricing';

export interface CartItem {
  product: Item;
  quantity: number;
  selectedVariants?: Record<string, string>;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  directPurchaseItem: CartItem | null;
  addItem: (product: Item, quantity?: number, variants?: Record<string, string>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  replaceItem: (oldProductId: string, newProduct: Item, quantity?: number, variants?: Record<string, string>) => void;
  clearCart: () => void;
  setDirectPurchaseItem: (item: { product: Item; quantity: number; variantId?: string }) => void;
  clearDirectPurchase: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [directPurchaseItem, setDirectPurchaseItem] = useState<CartItem | null>(null);
  // Load cart from localStorage on mount
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        return JSON.parse(savedCart);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        return [];
      }
    }
    return [];
  });

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: Item, quantity: number = 1, variants?: Record<string, string>) => {
    setItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex(
        (item) => item.product.id === product.id
      );

      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const newItems = [...prevItems];
        newItems[existingItemIndex].quantity += quantity;
        return newItems;
      } else {
        // Add new item
        return [...prevItems, { product, quantity, selectedVariants: variants }];
      }
    });
  };

  const removeItem = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setDirectPurchaseItem(null);
    localStorage.removeItem('cart');
  };

  const clearDirectPurchase = () => {
    setDirectPurchaseItem(null);
  };

  const replaceItem = (oldProductId: string, newProduct: Item, quantity: number = 1, variants?: Record<string, string>) => {
    setItems(prevItems => {
      // Find the old item to get its quantity and check categories
      const oldItem = prevItems.find(item => item.product.id === oldProductId);
      const oldQuantity = oldItem?.quantity || 1;
      
      // Check if we're replacing with a product in the same category
      const sameCategoryReplacement = prevItems.some(
        item => item.product.id === newProduct.id || 
               (oldItem?.product.categoryIds?.some(catId => 
                 newProduct.categoryIds?.includes(catId)
               ))
      );
      
      // Remove the old item
      const filteredItems = prevItems.filter(item => item.product.id !== oldProductId);
      
      // Check if new item already exists in cart
      const existingItemIndex = filteredItems.findIndex(
        item => item.product.id === newProduct.id
      );
      
      // If new item exists, update its quantity
      if (existingItemIndex >= 0) {
        const newItems = [...filteredItems];
        // If same category replacement, preserve the old quantity, otherwise add the specified quantity
        const updatedQuantity = sameCategoryReplacement 
          ? Math.max(newItems[existingItemIndex].quantity, oldQuantity)
          : newItems[existingItemIndex].quantity + (quantity || 1);
          
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: updatedQuantity,
          selectedVariants: variants || newItems[existingItemIndex].selectedVariants
        };
        return newItems;
      } else {
        // Add new item with preserved quantity if same category, otherwise use specified quantity or default to 1
        const newQuantity = sameCategoryReplacement ? oldQuantity : (quantity || 1);
        return [...filteredItems, { 
          product: newProduct, 
          quantity: newQuantity, 
          selectedVariants: variants 
        }];
      }
    });
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => {
      const effectivePrice = getEffectivePrice(
        item.product.pricing.basePrice,
        item.product.pricing.includeTransactionFee,
        item.product.pricing.transactionFeeRate
      );
      return sum + effectivePrice * item.quantity;
    },
    0
  );

  return (
    <CartContext.Provider
      value={{
        items: directPurchaseItem ? [directPurchaseItem] : items,
        itemCount: directPurchaseItem ? directPurchaseItem.quantity : itemCount,
        totalAmount: directPurchaseItem 
          ? getEffectivePrice(
              directPurchaseItem.product.pricing.basePrice,
              directPurchaseItem.product.pricing.includeTransactionFee,
              directPurchaseItem.product.pricing.transactionFeeRate
            ) * directPurchaseItem.quantity
          : totalAmount,
        directPurchaseItem,
        addItem: directPurchaseItem ? () => {} : addItem,
        removeItem: directPurchaseItem ? () => {} : removeItem,
        updateQuantity: directPurchaseItem ? () => {} : updateQuantity,
        clearCart,
        setDirectPurchaseItem: (item) => {
          setDirectPurchaseItem({
            product: item.product,
            quantity: item.quantity,
            selectedVariants: item.variantId 
              ? { 'variant': item.variantId }
              : undefined
          });
        },
        replaceItem: directPurchaseItem ? () => {} : replaceItem,
        clearDirectPurchase,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

