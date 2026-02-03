/**
 * Ledger types - Immutable financial source of truth
 */

import { BaseDocument } from './common';

/**
 * Ledger entry type
 */
export enum LedgerEntryType {
  ORDER_SALE = 'order_sale',
  BOOKING_PAYMENT = 'booking_payment',
  REFUND = 'refund',
  FEE = 'fee',
  ADJUSTMENT = 'adjustment',
}

/**
 * Ledger entry status
 */
export enum LedgerEntryStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REVERSED = 'reversed',
}

/**
 * Ledger entry (immutable - never modified or deleted)
 */
export interface LedgerEntry extends BaseDocument {
  entryType: LedgerEntryType;
  status: LedgerEntryStatus;
  amount: number; // Positive for income, negative for expenses
  currency: string;
  orderId?: string; // Reference to order
  bookingId?: string; // Reference to booking
  paymentId?: string; // Paychangu transaction ID
  description: string;
  metadata?: Record<string, unknown>;
  reversedAt?: Date | string; // If this entry was reversed
  reversedBy?: string; // Admin UID who reversed it
  reversalReason?: string;
}

/**
 * Create ledger entry input (server-side only)
 */
export interface CreateLedgerEntryInput {
  entryType: LedgerEntryType;
  amount: number;
  currency: string;
  orderId?: string;
  bookingId?: string;
  paymentId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

