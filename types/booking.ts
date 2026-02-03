/**
 * Booking types and status lifecycle
 * Bookings represent time-based service reservations
 */

import { BaseDocument } from './common';
import type { CancellationPolicyFields } from './policy';

/**
 * Booking status lifecycle
 * pending → paid → confirmed → completed | canceled | no_show | refunded
 */
export enum BookingStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
  NO_SHOW = 'no_show',
  REFUNDED = 'refunded',
}

/**
 * Time slot for service booking
 */
export interface TimeSlot {
  startTime: Date | string;
  endTime: Date | string;
  duration: number; // Duration in minutes
}

/**
 * Booking payment information
 */
export interface BookingPayment {
  paymentId: string; // Paychangu transaction ID
  paymentMethod: string;
  paidAt: Date | string;
  amount: number;
  currency: string;
}

/**
 * Booking document
 */
export interface Booking extends BaseDocument {
  bookingNumber: string; // Human-readable booking number
  serviceId: string;
  serviceName: string;
  serviceImage?: string;
  customerId?: string; // null for guest booking
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  status: BookingStatus;
  timeSlot: TimeSlot;
  pricing: {
    basePrice: number; // Price at time of booking (snapshot)
    bookingFee?: number; // Partial payment amount (if allowPartialPayment is true)
    totalFee?: number; // Total service fee (if different from basePrice)
    tax?: number;
    discount?: number;
    total: number; // Final amount (bookingFee if partial, totalFee/basePrice if full)
    currency: string;
    isPartialPayment?: boolean; // Whether only booking fee was paid
  };
  payment?: BookingPayment; // null until payment is confirmed
  staffNotes?: string; // Internal notes
  canceledAt?: Date | string;
  canceledReason?: string;
  noShowAt?: Date | string;
  refundedAt?: Date | string;
  refundedAmount?: number;
  refundedReason?: string;
  cancellationPolicy?: CancellationPolicyFields & {
    version?: number;
  };
  notes?: string;
}

/**
 * Booking creation input
 */
export interface CreateBookingInput {
  serviceId: string;
  customerId?: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  timeSlot: TimeSlot;
  notes?: string;
}

