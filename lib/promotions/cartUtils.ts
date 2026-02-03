/**
 * Cart utilities for applying promotions
 */

import { Item } from '@/types';
import { Promotion, PromotionStatus } from '@/types/promotion';
import { calculatePromotionPrice } from './utils';
import { getFinalPrice } from '@/lib/utils/pricing';

/**
 * Get the effective price for an item (promotion price if on promotion, otherwise base price)
 */
export const getItemEffectivePrice = (
  item: Item,
  promotion: Promotion | null | undefined
): number => {
  const promotionPrice = promotion
    ? calculatePromotionPrice(item.pricing.basePrice, promotion)
    : null;

  return getFinalPrice(
    item.pricing.basePrice,
    promotionPrice,
    item.pricing.includeTransactionFee,
    item.pricing.transactionFeeRate
  );
};

/**
 * Find promotion for an item from a list of promotions
 */
export const findItemPromotion = (
  item: Item,
  promotions: Promotion[]
): Promotion | null => {
  if (!item.id || !promotions.length) {
    return null;
  }

  const now = new Date();
  
  // Helper to convert Firestore Timestamp or Date to Date
  const toDate = (date: Date | unknown): Date => {
    if (date instanceof Date) {
      return date;
    }
    if (date && typeof date === 'object' && 'toDate' in date && typeof (date as { toDate?: () => Date }).toDate === 'function') {
      return (date as { toDate: () => Date }).toDate();
    }
    if (typeof date === 'string') {
      return new Date(date);
    }
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
    } catch {
      return false;
    }
  });

  // Check if item ID is in any promotion's productsIds or servicesIds
  for (const promo of validPromotions) {
    if (promo.productsIds && Array.isArray(promo.productsIds)) {
      const itemIdString = String(item.id);
      if (promo.productsIds.some(id => String(id) === itemIdString)) {
        return promo;
      }
    }
    
    if (promo.servicesIds && Array.isArray(promo.servicesIds)) {
      const itemIdString = String(item.id);
      if (promo.servicesIds.some(id => String(id) === itemIdString)) {
        return promo;
      }
    }
  }

  return null;
};

