import { BaseDocument } from "./common";

/**
 * Review type - either for an item (product/service) or for the business
 */
export type ReviewType = 'item' | 'business';

export interface Review extends BaseDocument {
  reviewType: ReviewType; // 'item' for product/service reviews, 'business' for business reviews
  rating: number; // 1-5
  comment: string;
  itemId?: string; // Required for item reviews
  businessId: string; // Always required
  userId?: string; // Optional - for authenticated users
  userName?: string; // Display name for review
  userEmail?: string; // For guest reviews
  orderId?: string; // Optional - link to order if review is from purchase
  bookingId?: string; // Optional - link to booking if review is from service booking
}