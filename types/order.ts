/**
 * Order types and status lifecycle
 * Orders represent physical product purchases
 */

import { BaseDocument, Address } from './common';
import { PolicyAcceptance } from './policy';

/**
 * Order status lifecycle
 * pending → paid → processing → shipped → completed | canceled | refunded
 */
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
}

/**
 * Order fulfillment method
 */
export enum FulfillmentMethod {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
}

/**
 * Order item (product in cart)
 */
export interface OrderItem {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number; // Price at time of order (snapshot)
  subtotal: number; // quantity * unitPrice
  sku?: string;
}

/**
 * Order pricing breakdown
 */
export interface OrderPricing {
  subtotal: number; // Sum of all items
  tax?: number;
  shipping?: number;
  discount?: number;
  total: number; // Final amount
  currency: string;
}

/**
 * Order delivery information
 */
export interface OrderDelivery {
  method: FulfillmentMethod;
  providerId?: string; // Selected delivery provider ID
  address?: Address;
  pickupLocationId?: string;
  estimatedDeliveryDate?: Date | string;
  trackingNumber?: string;
  carrier?: string;
}

/**
 * Order payment information
 */
export interface OrderPayment {
  paymentId: string; // Paychangu transaction ID
  paymentMethod: string;
  paidAt: Date | string;
  amount: number;
  currency: string;
}

/**
 * Order document
 */
export interface StatusUpdate {
  status: OrderStatus;
  updatedAt: Date | string;
  reason?: string;
  updatedBy: string; // User ID or system
}

export interface Order extends BaseDocument {
  orderNumber: string; // Human-readable order number
  customerId?: string; // null for guest checkout
  customerEmail: string;
  customerName?: string;
  status: OrderStatus;
  statusHistory?: StatusUpdate[]; // History of status changes
  items: OrderItem[];
  pricing: OrderPricing;
  delivery?: OrderDelivery;
  payment?: OrderPayment; // null until payment is confirmed
  acceptedPolicyVersions?: PolicyAcceptance[];
  notes?: string;
  canceledAt?: Date | string;
  canceledReason?: string;
  refundedAt?: Date | string;
  refundedAmount?: number;
  refundedReason?: string;
}

/**
 * Order creation input (for checkout)
 */
export interface CreateOrderInput {
  customerId?: string;
  customerEmail: string;
  customerName?: string;
  items: OrderItem[];
  delivery: OrderDelivery;
}

