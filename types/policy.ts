/**
 * Policy types with versioning
 * Policies are business-specific and have dynamic fields based on type
 */

import { BaseDocument } from './common';

/**
 * Policy type
 */
export enum PolicyType {
  PRIVACY = 'privacy',
  TERMS = 'terms',
  DELIVERY = 'delivery',
  RETURNS_REFUND = 'returns_refund',
  CANCELLATION = 'cancellation',
}

/**
 * Policy section (for structured policies)
 */
export interface PolicySection {
  id: string;
  title: string;
  content: string; // HTML content
  order: number; // Display order
}

/**
 * Privacy Policy specific fields
 */
export interface PrivacyPolicyFields {
  // Information collection
  informationCollected?: string[];
  // Usage
  usagePurposes?: string[];
  // Data sharing
  dataSharingPartners?: string[];
  // Security measures
  securityMeasures?: string;
  // Retention period
  retentionPeriod?: string;
  // User rights
  userRights?: string[];
}

/**
 * Terms Policy specific fields
 */
export interface TermsPolicyFields {
  // Account responsibilities
  accountResponsibilities?: string[];
  // Order & booking rights
  orderRights?: string[];
  // Pricing currency
  currency?: string;
  // Payment provider
  paymentProvider?: string;
}

/**
 * Delivery Policy specific fields
 */
export interface DeliveryPolicyFields {
  // Fulfillment options
  fulfillmentOptions?: Array<{
    name: string;
    description: string;
  }>;
  // Delivery methods
  deliveryMethods?: Array<{
    name: string;
    description: string;
    timeframe?: string;
  }>;
  // Delivery charges
  deliveryCharges?: Array<{
    method: string;
    description: string;
  }>;
  // Delivery timeframes
  deliveryTimeframes?: Array<{
    method: string;
    timeframe: string;
  }>;
  // Pickup information
  pickupLocation?: string;
  pickupHours?: string;
  pickupHoldingPeriod?: string; // e.g., "7 days"
  // Tracking
  trackingAvailable?: boolean;
  trackingDescription?: string;
}

/**
 * Returns & Refund Policy specific fields
 */
export interface ReturnsRefundPolicyFields {
  // Return window
  returnWindow?: string; // e.g., "7 days", "14 days", "30 days"
  // Eligibility conditions
  eligibilityConditions?: string[];
  // Non-returnable items
  nonReturnableItems?: string[];
  // Refund processing time
  refundProcessingTime?: string; // e.g., "5-7 business days"
  // Service booking cancellation
  serviceCancellationHours?: number; // Hours before service
  lateCancellationRefund?: boolean;
  // Return shipping
  returnShippingCovered?: 'business' | 'customer' | 'conditional';
  returnShippingDescription?: string;
}

/**
 * Cancellation Policy specific fields
 */
export interface CancellationPolicyFields {
  canCancel: boolean;
  cancelBeforeHours: number;
  refundPercentage: number;
  policyText: string;
}

/**
 * Policy document with dynamic fields based on type
 */
export interface Policy extends BaseDocument {
  type: PolicyType;
  version: number;
  title: string;
  content: string; // HTML content (full policy text)
  isActive: boolean; // Only one active version per type per business
  requiresAcceptance: boolean; // Whether users must accept this
  effectiveDate: Date | string;
  lastUpdatedBy?: string; // Admin UID
  
  // Structured sections (optional, for better organization)
  sections?: PolicySection[];
  
  // Type-specific dynamic fields
  privacyFields?: PrivacyPolicyFields;
  termsFields?: TermsPolicyFields;
  deliveryFields?: DeliveryPolicyFields;
  returnsRefundFields?: ReturnsRefundPolicyFields;
  cancellationFields?: CancellationPolicyFields;
  
  // Business-specific information (references business document)
  // Business details are fetched from business collection, not stored here
}

/**
 * Policy acceptance record (stored with orders/bookings)
 */
export interface PolicyAcceptance {
  policyType: PolicyType;
  version: number;
  acceptedAt: Date | string;
}

