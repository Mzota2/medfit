'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Item } from '@/types';
import { getEffectivePrice } from '@/lib/utils/pricing';

export interface CartItem {
  product: Item;
  quantity: number;
  selectedVariants?: Record<string, string>;
  selectedSize?: string; // Selected size for products with sizes
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  directPurchaseItem: CartItem | null;
  addItem: (product: Item, quantity?: number, variants?: Record<string, string>, selectedSize?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemSize: (productId: string, selectedSize: string) => void;
  replaceItem: (oldProductId: string, newProduct: Item, quantity?: number, variants?: Record<string, string>, selectedSize?: string) => void;
  clearCart: () => void;
  setDirectPurchaseItem: (item: { product: Item; quantity: number; variantId?: string; selectedSize?: string }) => void;
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

  const addItem = (product: Item, quantity: number = 1, variants?: Record<string, string>, selectedSize?: string) => {
    setItems((prevItems) => {
      // For products with sizes, check if same product with same size exists
      const existingItemIndex = prevItems.findIndex(
        (item) => {
          if (item.product.id !== product.id) return false;
          // If product has sizes, match by size; otherwise match by product only
          if (product.sizes && product.sizes.length > 0) {
            return item.selectedSize === selectedSize;
          }
          return true;
        }
      );

      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const newItems = [...prevItems];
        newItems[existingItemIndex].quantity += quantity;
        return newItems;
      } else {
        // Add new item
        return [...prevItems, { product, quantity, selectedVariants: variants, selectedSize }];
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

  const updateItemSize = (productId: string, selectedSize: string) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId) {
          // Check if there's already an item with this product and size
          const existingItem = prevItems.find(
            (i) => i.product.id === productId && i.selectedSize === selectedSize
          );
          
          if (existingItem && existingItem !== item) {
            // Merge quantities and remove the old item
            const newQuantity = existingItem.quantity + item.quantity;
            return {
              ...existingItem,
              quantity: newQuantity,
            };
          }
          
          // Update the current item with new size
          return { ...item, selectedSize };
        }
        return item;
      }).filter((item, index, self) => 
        // Remove duplicates - keep only the first occurrence of each product+size combination
        index === self.findIndex((i) => 
          i.product.id === item.product.id && 
          i.selectedSize === item.selectedSize
        )
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

  const replaceItem = (oldProductId: string, newProduct: Item, quantity: number = 1, variants?: Record<string, string>, selectedSize?: string) => {
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
      
      // Check if new item already exists in cart (considering size if applicable)
      const existingItemIndex = filteredItems.findIndex(
        item => {
          if (item.product.id !== newProduct.id) return false;
          if (newProduct.sizes && newProduct.sizes.length > 0) {
            return item.selectedSize === selectedSize;
          }
          return true;
        }
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
          selectedVariants: variants || newItems[existingItemIndex].selectedVariants,
          selectedSize: selectedSize || newItems[existingItemIndex].selectedSize
        };
        return newItems;
      } else {
        // Add new item with preserved quantity if same category, otherwise use specified quantity or default to 1
        const newQuantity = sameCategoryReplacement ? oldQuantity : (quantity || 1);
        return [...filteredItems, { 
          product: newProduct, 
          quantity: newQuantity, 
          selectedVariants: variants,
          selectedSize
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
        updateItemSize: directPurchaseItem ? () => {} : updateItemSize,
        clearCart,
        setDirectPurchaseItem: (item) => {
          setDirectPurchaseItem({
            product: item.product,
            quantity: item.quantity,
            selectedVariants: item.variantId 
              ? { 'variant': item.variantId }
              : undefined,
            selectedSize: item.variantId ? undefined : item?.selectedSize
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

