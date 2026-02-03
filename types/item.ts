
import { BaseDocument } from './common';

export type ItemType = 'product' | 'service';


export enum ItemStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
  OUT_OF_STOCK = 'out_of_stock', // Products only
  DISCONTINUED = 'discontinued',
}

/**
 * Item image structure
 */
export interface ItemImage {
  url: string; // Cloudinary URL
  alt?: string;
  order: number; // Display order
}

/**
 * Unified pricing structure
 */
export interface ItemPricing {
  basePrice: number;
  compareAtPrice?: number; // Original price for discounts (products)
  currency: string;
  taxIncluded?: boolean;
  includeTransactionFee?: boolean; // Whether to include transaction fee in the selling price
  transactionFeeRate?: number; // Transaction fee rate (default 0.03 for 3%)
}

/**
 * Inventory tracking (products only)
 */
export interface ItemInventory {
  quantity: number; // Current stock
  reserved: number; // Reserved in pending orders
  available: number; // quantity - reserved
  lowStockThreshold?: number; // Alert when below this
  trackInventory: boolean; // If false, unlimited stock
}

/**
 * Product variant (products only)
 */
export interface ItemVariant {
  id: string;
  name: string; // e.g., "Small", "Red", "500ml"
  sku?: string;
  price?: number; // Override base price
  inventory?: ItemInventory;
  image?: string;
}

/**
 * Service schedule (services only)
 */
export interface ItemSchedule {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // ISO time string
  endTime: string; // ISO time string
  isAvailable: boolean;
  breaks?: Array<{
    startTime: string;
    endTime: string;
  }>;
}

/**
 * Time slot (services only)
 */
export interface ItemTimeSlot {
  startTime: string; // ISO time string (HH:mm)
  endTime: string; // ISO time string (HH:mm)
  duration: number; // Duration in minutes
  isAvailable: boolean;
  isBooked?: boolean;
}

/**
 * Unified Item document - works for both products and services
 */
export interface Item extends BaseDocument {
  // Type discriminator
  type: ItemType;  
  // Basic information (common to both)
  name: string;
  description?: string;
  slug: string; // URL-friendly identifier
  status: ItemStatus;
  categoryIds: string[]; // Multiple categories
  images: ItemImage[];
  pricing: ItemPricing;
  tags?: string[]; // Tags displayed in "What's Included" section
  specifications?: Record<string, string>; // Key-value pairs for specifications (services)
  
  // SEO
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  
  // Product-specific fields (only populated when type === 'product')
  sku?: string;
  inventory?: ItemInventory;
  variants?: ItemVariant[];
  weight?: number; // For shipping calculations
  isReturnable?: boolean; // Whether the product can be returned
 
  // Service-specific fields (only populated when type === 'service')
  duration?: number; // Duration in minutes
  bufferTime?: number; // Buffer time between bookings (minutes)
  maxConcurrentBookings?: number; // How many can be booked at same time
  schedule?: ItemSchedule[]; // Weekly schedule
  requiresStaff?: boolean;
  staffIds?: string[]; // Available staff for this service
  cancellationPolicyId?: string; // Reference to policy
  bookingFee?: number; // Partial payment amount when booking (admin configurable)
  totalFee?: number; // Total service fee (if different from basePrice)
  allowPartialPayment?: boolean; // Whether customer can pay booking fee only initially
  
  // Promotional fields (optional for both)
  promoId?: string;
  isFeatured?: boolean;
  featuredUntil?: Date | string;
}

/**
 * Type guards
 */
export const isProduct = (item: Item): boolean => {
  return item.type === 'product';
};

export const isService = (item: Item): boolean => {
  return item.type === 'service';
};

export interface ItemSnapshot {
  itemId: string;
  type: ItemType;
  name: string;
  slug: string;
  image?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  sku?: string; // Products only
  variantId?: string; // Products only
  variantName?: string; // Products only
  quantity: number; // For products
  duration?: number; // For services (in minutes)
}

/**
 * Helper to create item snapshot from full Item
 */
export const createItemSnapshot = (
  item: Item,
  options?: {
    variantId?: string;
    variantName?: string;
    quantity?: number;
  }
): ItemSnapshot => {
  const snapshot: ItemSnapshot = {
    itemId: item.id!,
    type: item.type,
    name: item.name,
    slug: item.slug,
    image: item.images[0]?.url,
    price: item.pricing.basePrice,
    compareAtPrice: item.pricing.compareAtPrice,
    currency: item.pricing.currency,
    sku: item.sku,
    quantity: options?.quantity || 1,
  };

  if (item.type === 'product') {
    snapshot.quantity = options?.quantity || 1;
    if (options?.variantId) {
      snapshot.variantId = options.variantId;
      const variant = item.variants?.find(v => v.id === options.variantId);
      if (variant) {
        snapshot.variantName = variant.name;
        snapshot.price = variant.price || item.pricing.basePrice;
        snapshot.sku = variant.sku || item.sku;
      }
    }
  } else if (item.type === 'service') {
    snapshot.duration = item.duration;
  }

  return snapshot;
};

/**
 * Helper to check if item is available
 */
export const isItemAvailable = (item: Item): boolean => {
  if (item.status !== ItemStatus.ACTIVE) {
    return false;
  }

  if (item.type === 'product') {
    if (!item.inventory?.trackInventory) {
      return true; // Unlimited stock
    }
    return (item.inventory.available || 0) > 0;
  }

  // For services, availability is determined by schedule
  return true; // Can be enhanced with schedule checking
};

/**
 * Helper to get display price
 * Returns the effective price (with transaction fee if enabled)
 */
export const getItemDisplayPrice = (item: Item): number => {
  if (item.pricing.includeTransactionFee) {
    const feeRate = item.pricing.transactionFeeRate ?? 0.03;
    // Formula: priceWithFee = basePrice / (1 - feeRate)
    return item.pricing.basePrice / (1 - feeRate);
  }
  return item.pricing.basePrice;
};

/**
 * Helper to get discount percentage
 */
export const getItemDiscountPercentage = (item: Item): number | null => {
  if (item.pricing.compareAtPrice && item.pricing.compareAtPrice > item.pricing.basePrice) {
    const discount = item.pricing.compareAtPrice - item.pricing.basePrice;
    return Math.round((discount / item.pricing.compareAtPrice) * 100);
  }
  return null;
};
