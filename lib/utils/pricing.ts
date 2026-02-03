/**
 * Pricing utility functions
 * Handles transaction fee calculations and price formatting
 */

/**
 * Default transaction fee rate (3%)
 */
export const DEFAULT_TRANSACTION_FEE_RATE = 0.03;

/**
 * Calculate price with transaction fee included
 * Formula: priceWithFee = originalPrice / (1 - feeRate)
 * This ensures the business receives the original price after the fee is deducted
 * 
 * @param originalPrice - The original price the business wants to receive
 * @param feeRate - The transaction fee rate (default 0.03 for 3%)
 * @returns The price with transaction fee included
 */
export function calculatePriceWithTransactionFee(
  originalPrice: number,
  feeRate: number = DEFAULT_TRANSACTION_FEE_RATE
): number {
  if (feeRate <= 0 || feeRate >= 1) {
    throw new Error('Fee rate must be between 0 and 1');
  }
  
  if (originalPrice <= 0) {
    return 0;
  }
  
  // Formula: priceWithFee = originalPrice / (1 - feeRate)
  // This ensures that after deducting feeRate from priceWithFee, we get originalPrice
  const priceWithFee = originalPrice / (1 - feeRate);
  
  // Round to 2 decimal places
  return Math.round(priceWithFee * 100) / 100;
}

/**
 * Get the effective selling price for an item
 * Returns the price with transaction fee if enabled, otherwise returns base price
 * 
 * @param basePrice - The base price of the item
 * @param includeTransactionFee - Whether to include transaction fee
 * @param transactionFeeRate - The transaction fee rate (default 0.03 for 3%)
 * @returns The effective selling price
 */
export function getEffectivePrice(
  basePrice: number,
  includeTransactionFee?: boolean,
  transactionFeeRate?: number
): number {
  if (!includeTransactionFee) {
    return basePrice;
  }
  
  const feeRate = transactionFeeRate ?? DEFAULT_TRANSACTION_FEE_RATE;
  return calculatePriceWithTransactionFee(basePrice, feeRate);
}

/**
 * Get the final selling price for an item after applying promotion and transaction fee
 * Order: 1. Apply promotion discount, 2. Apply transaction fee to discounted price
 * 
 * @param basePrice - The base price of the item
 * @param promotionPrice - The price after promotion discount (null if no promotion)
 * @param includeTransactionFee - Whether to include transaction fee
 * @param transactionFeeRate - The transaction fee rate (default 0.03 for 3%)
 * @returns The final selling price
 */
export function getFinalPrice(
  basePrice: number,
  promotionPrice: number | null,
  includeTransactionFee?: boolean,
  transactionFeeRate?: number
): number {
  // Step 1: Use promotion price if available, otherwise use base price
  const priceAfterPromotion = promotionPrice !== null ? promotionPrice : basePrice;
  
  // Step 2: Apply transaction fee if enabled
  if (!includeTransactionFee) {
    return priceAfterPromotion;
  }
  
  const feeRate = transactionFeeRate ?? DEFAULT_TRANSACTION_FEE_RATE;
  return calculatePriceWithTransactionFee(priceAfterPromotion, feeRate);
}

/**
 * Calculate the transaction fee amount from a price
 * 
 * @param priceWithFee - The price that includes the transaction fee
 * @param feeRate - The transaction fee rate (default 0.03 for 3%)
 * @returns The transaction fee amount
 */
export function calculateTransactionFeeAmount(
  priceWithFee: number,
  feeRate: number = DEFAULT_TRANSACTION_FEE_RATE
): number {
  if (feeRate <= 0 || feeRate >= 1) {
    throw new Error('Fee rate must be between 0 and 1');
  }
  
  if (priceWithFee <= 0) {
    return 0;
  }
  
  // Fee amount = priceWithFee * feeRate
  const feeAmount = priceWithFee * feeRate;
  
  // Round to 2 decimal places
  return Math.round(feeAmount * 100) / 100;
}

/**
 * Calculate the net amount the business receives after transaction fee
 * 
 * @param priceWithFee - The price that includes the transaction fee
 * @param feeRate - The transaction fee rate (default 0.03 for 3%)
 * @returns The net amount the business receives
 */
export function calculateNetAmount(
  priceWithFee: number,
  feeRate: number = DEFAULT_TRANSACTION_FEE_RATE
): number {
  if (feeRate <= 0 || feeRate >= 1) {
    throw new Error('Fee rate must be between 0 and 1');
  }
  
  if (priceWithFee <= 0) {
    return 0;
  }
  
  // Net amount = priceWithFee * (1 - feeRate)
  const netAmount = priceWithFee * (1 - feeRate);
  
  // Round to 2 decimal places
  return Math.round(netAmount * 100) / 100;
}

/**
 * Calculate transaction fee cost from selling price
 * This is used for analytics to show transaction fees as costs
 * 
 * @param sellingPrice - The selling price (what customer paid)
 * @param feeRate - The transaction fee rate (default 0.03 for 3%)
 * @returns The transaction fee amount (cost)
 */
export function calculateTransactionFeeCost(
  sellingPrice: number,
  feeRate: number = DEFAULT_TRANSACTION_FEE_RATE
): number {
  if (feeRate <= 0 || feeRate >= 1) {
    throw new Error('Fee rate must be between 0 and 1');
  }
  
  if (sellingPrice <= 0) {
    return 0;
  }
  
  // Transaction fee = selling price × fee rate
  const feeAmount = sellingPrice * feeRate;
  
  // Round to 2 decimal places
  return Math.round(feeAmount * 100) / 100;
}

/**
 * Calculate analytics metrics for revenue, costs, and profit
 * 
 * @param grossRevenue - Total revenue (what customers paid)
 * @param transactionFeeRate - Transaction fee rate (default 0.03 for 3%)
 * @returns Object with grossRevenue, transactionFees (costs), and netRevenue
 */
export function calculateRevenueMetrics(
  grossRevenue: number,
  transactionFeeRate: number = DEFAULT_TRANSACTION_FEE_RATE
): {
  grossRevenue: number;
  transactionFees: number;
  netRevenue: number;
} {
  const transactionFees = calculateTransactionFeeCost(grossRevenue, transactionFeeRate);
  const netRevenue = grossRevenue - transactionFees;
  
  return {
    grossRevenue,
    transactionFees,
    netRevenue: Math.round(netRevenue * 100) / 100,
  };
}

