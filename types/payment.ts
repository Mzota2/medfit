/**
 * Payment types for Paychangu integration
 */

/**
 * Payment session status
 */
export enum PaymentSessionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELED = 'canceled',
}

/**
 * Payment method
 */
export enum PaymentMethod {
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
}

/**
 * Paychangu Payment Initiation Response (from API call to /payment endpoint)
 */
export interface PaychanguPaymentInitiationData {
  event: string;
  checkout_url: string;
  data: {
    tx_ref: string;
    currency: string;
    amount: number;
    mode: string;
    status: string;
  };
}

export interface PaychanguPaymentInitiationResponse {
  message: string;
  status: string;
  data: PaychanguPaymentInitiationData;
}

/**
 * Paychangu Payment Verification Response (from VerificationSDK.verifyTransaction)
 */
export interface PaychanguCustomization {
  title: string;
  description: string;
  logo: string | null;
}

export interface PaychanguAuthorization {
  channel: string;
  card_number: string;
  expiry: string;
  brand: string;
  provider: string | null;
  mobile_number: string | null;
  completed_at: string;
}

export interface PaychanguCustomer {
  email: string;
  first_name: string;
  last_name: string;
}

export interface PaychanguLogEntry {
  type: string;
  message: string;
  created_at: string;
}

export interface PaychanguPaymentVerificationData {
  event_type: string;
  tx_ref: string;
  mode: string;
  type: string;
  status: string;
  number_of_attempts: number;
  reference: string;
  currency: string;
  amount: number;
  charges: number;
  customization: PaychanguCustomization;
  meta: Record<string, unknown> | null;
  authorization: PaychanguAuthorization;
  customer: PaychanguCustomer;
  logs: PaychanguLogEntry[];
  created_at: string;
  updated_at: string;
}

export interface PaychanguPaymentVerificationResponse {
  status: string;
  message: string;
  data: PaychanguPaymentVerificationData;
}

/**
 * Payment session (created server-side)
 */
export interface PaymentSession {
  txRef: string; // Transaction reference: sent in initial payload and obtained from Paychangu response
  transactionId: string; // Transaction ID created manually (unique identifier for our system)
  sessionId?: string;
  orderId?: string; // For order payments
  bookingId?: string; // For booking payments
  amount: number;
  currency: string;
  status: PaymentSessionStatus;
  paymentMethod?: PaymentMethod;
  customerEmail: string;
  customerName?: string;
  metadata?: Record<string, string>;
  createdAt: Date | string;
  completedAt?: Date | string;
  checkoutUrl?: string; // Checkout URL for redirect (if available)
}

/**
 * Payment transaction (from Paychangu webhook)
 */
export interface PaymentTransaction {
  transactionId: string;
  sessionId?: string;
  txRef?: string; // Transaction reference
  orderId?: string;
  bookingId?: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: 'success' | 'failed' | 'pending';
  customerEmail: string;
  customerName?: string;
  metadata?: Record<string, string>;
  processedAt: Date | string;
  failureReason?: string;
}

/**
 * Payment verification result (simplified from Paychangu response)
 */
export interface PaymentVerificationResult {
  txRef: string;
  transactionId: string; // reference field from Paychangu
  status: 'success' | 'failed' | 'pending';
  amount: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  customerEmail: string;
  customerName?: string;
  orderId?: string;
  bookingId?: string;
  metadata?: Record<string, unknown>;
  charges?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create payment session input
 */
export interface CreatePaymentSessionInput {
  orderId?: string;
  bookingId?: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string; // For backward compatibility
  firstName?: string; // Preferred for Paychangu
  lastName?: string; // Preferred for Paychangu
  metadata?: Record<string, string>;
}

