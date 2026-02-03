/**
 * Hook to check if an item is on promotion
 */

import { useMemo } from 'react';
import { Item } from '@/types';
import { Promotion, PromotionStatus } from '@/types/promotion';
import { usePromotions } from './usePromotions';
import { Timestamp } from 'firebase/firestore';

/**
 * Hook to get promotion for a specific item
 */
export const useItemPromotion = (item: Item | null | undefined) => {
  // Fetch all active promotions
  const { data: promotions = [], isLoading } = usePromotions({
    status: PromotionStatus.ACTIVE,
    enabled: !!item?.id,
  });

  // Check if item is in any active promotion
  const promotion = useMemo(() => {
    if (!item?.id || !promotions.length) {
      return null;
    }

    const now = new Date();
    
    // Helper to convert Firestore Timestamp or Date to Date
    const toDate = (date: Date | Timestamp | string | unknown): Date => {
      if (date instanceof Date) {
        return date;
      }
      if (date && typeof date === 'object' && 'toDate' in date && typeof (date as Timestamp).toDate === 'function') {
        // Firestore Timestamp
        return (date as Timestamp).toDate();
      }
      if (typeof date === 'string') {
        return new Date(date);
      }
      // Fallback: try to create a Date from the value
      return new Date(String(date));
    };
    
    // Filter to valid, active promotions
    const validPromotions = promotions.filter((promo: Promotion) => {
      try {
        const startDate = toDate(promo.startDate);
        const endDate = toDate(promo.endDate);
        
        const isActive = promo.status === PromotionStatus.ACTIVE;
        const isStarted = startDate <= now;
        const isNotExpired = endDate >= now;
        
        return isActive && isStarted && isNotExpired;
      } catch (error) {
        console.error('Error parsing promotion dates:', error, promo);
        return false;
      }
    });

    // Check if item ID is in any promotion's productsIds or servicesIds
    for (const promo of validPromotions) {
      // Check productsIds (note: plural with 'sIds')
      if (promo.productsIds && Array.isArray(promo.productsIds)) {
        const itemIdString = String(item.id); // Convert to string for comparison
        if (promo.productsIds.some(id => String(id) === itemIdString)) {
          return promo;
        }
      }
      
      // Check servicesIds (note: plural with 'sIds')
      if (promo.servicesIds && Array.isArray(promo.servicesIds)) {
        const itemIdString = String(item.id); // Convert to string for comparison
        if (promo.servicesIds.some(id => String(id) === itemIdString)) {
          return promo;
        }
      }
    }

    return null;
  }, [item, promotions]);

  // Calculate discount percentage for display
  const discountPercentage = useMemo(() => {
    if (!promotion) return 0;
    if (promotion.discountType === 'percentage') {
      return promotion.discount;
    }
    // For fixed discounts, return 0 (UI will show "On Sale" instead)
    return 0;
  }, [promotion]);

  return {
    promotion,
    isOnPromotion: !!promotion,
    discountPercentage,
    isLoading,
  };
};

