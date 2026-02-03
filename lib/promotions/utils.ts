/**
 * Utility functions for working with promotions
 */

import { Promotion, PromotionStatus } from '@/types/promotion';
import { Item } from '@/types';
import { getPromotions } from './index';

/**
 * Check if an item is part of an active promotion
 * @param item - The item to check
 * @param promotions - List of active promotions (optional, will fetch if not provided)
 * @returns The promotion if found, null otherwise
 */
export const getItemPromotion = async (
  item: Item,
  promotions?: Promotion[]
): Promise<Promotion | null> => {
  // Fetch active promotions if not provided
  let activePromotions = promotions;
  if (!activePromotions) {
    activePromotions = await getPromotions({ status: PromotionStatus.ACTIVE });
  }

  // Filter promotions to only active ones that haven't expired
  const now = new Date();
  const validPromotions = activePromotions.filter((promotion) => {
    const startDate = promotion.startDate instanceof Date 
      ? promotion.startDate 
      : new Date(promotion.startDate);
    const endDate = promotion.endDate instanceof Date 
      ? promotion.endDate 
      : new Date(promotion.endDate);
    
    return promotion.status === PromotionStatus.ACTIVE &&
           startDate <= now &&
           endDate >= now;
  });

  // Check if item ID is in any promotion's productIds or serviceIds
  if (!item.id) {
    return null;
  }

  for (const promotion of validPromotions) {
    // Check productsIds (note: plural with 'sIds')
    if (promotion.productsIds && promotion.productsIds.includes(item.id)) {
      return promotion;
    }
    
    // Check servicesIds (note: plural with 'sIds')
    if (promotion.servicesIds && promotion.servicesIds.includes(item.id)) {
      return promotion;
    }
  }

  return null;
};

/**
 * Calculate discounted price for an item based on promotion
 * @param item - The item
 * @param promotion - The promotion to apply
 * @returns The discounted price
 */
export const calculatePromotionPrice = (
  basePrice: number,
  promotion: Promotion
): number => {
  if (promotion.discountType === 'percentage') {
    return basePrice * (1 - promotion.discount / 100);
  } else {
    // Fixed discount
    return Math.max(0, basePrice - promotion.discount);
  }
};

/**
 * Get discount percentage for display
 * @param promotion - The promotion
 * @returns Discount percentage (0-100)
 */
export const getPromotionDiscountPercentage = (promotion: Promotion): number => {
  if (promotion.discountType === 'percentage') {
    return promotion.discount;
  } else {
    // For fixed discounts, we can't calculate percentage without base price
    // Return 0 and let the UI show "On Sale" instead
    return 0;
  }
};

