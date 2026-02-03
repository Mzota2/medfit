import { NextRequest } from 'next/server';
import { isPaychanguConfigured } from '@/lib/paychangu/config';
import { verifyPaymentSession } from '@/lib/paychangu/sessions';
import { successResponse, errorResponse } from '@/lib/api/helpers';
import { db } from '@/lib/firebase/config';
import { 
  doc, 
  updateDoc, 
  getDoc, 
  serverTimestamp, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { COLLECTIONS } from '@/types/collections';
import { OrderStatus } from '@/types/order';
import { BookingStatus } from '@/types/booking';
import { LedgerEntryType } from '@/types/ledger';
import { PaymentSessionStatus, PaymentMethod } from '@/types/payment';
import { createLedgerEntry } from '@/lib/ledger/create';
import { adjustInventoryForPaidOrder } from '@/lib/orders/inventory';
import { shouldCreatePaymentDocument } from '@/lib/payments/utils';

/**
 * Update or create payment document from verification result
 * 
 * IMPORTANT: 
 * - transactionId is the primary identifier (created manually during payment session creation)
 * - txRef is obtained from Paychangu response (used for verification with Paychangu)
 */
async function ensurePaymentDocument(verificationResult: {
  txRef: string;
  transactionId?: string;
  status: 'success' | 'failed' | 'pending';
  amount?: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  customerEmail?: string;
  customerName?: string;
  orderId?: string;
  bookingId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { txRef, transactionId, status, amount, currency, paymentMethod, customerEmail, customerName, orderId, bookingId, metadata } = verificationResult;
  
  if (!txRef) {
    console.error('No txRef in verification result');
    return;
  }
  
  // Find existing payment document by txRef (from Paychangu)
  const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
  const existingPaymentQuery = query(
    paymentsRef,
    where('txRef', '==', txRef)
  );
  const existingPayments = await getDocs(existingPaymentQuery);
  
  const updateData: Record<string, unknown> = {
    status: status === 'success' ? PaymentSessionStatus.COMPLETED : status === 'failed' ? PaymentSessionStatus.FAILED : PaymentSessionStatus.PENDING,
    updatedAt: serverTimestamp(),
  };
  
  // transactionId is already set during session creation (created manually)
  // We don't update it from verification - it remains the same
  
  if (paymentMethod) {
    updateData.paymentMethod = paymentMethod;
  }
  if (customerEmail) {
    updateData.customerEmail = customerEmail;
  }
  if (customerName) {
    updateData.customerName = customerName;
  }
  if (status === 'success') {
    updateData.completedAt = serverTimestamp();
  }
  
  if (!existingPayments.empty) {
    // Update existing payment document
    const paymentDoc = existingPayments.docs[0];
    await updateDoc(doc(db, COLLECTIONS.PAYMENTS, paymentDoc.id), updateData);
    console.log('Payment document updated via verification by txRef:', txRef, status, transactionId ? `transactionId: ${transactionId}` : '');
  } else {
    // Payment document doesn't exist - check if creation is enabled before creating fallback
    const shouldCreate = await shouldCreatePaymentDocument();
    if (!shouldCreate) {
      console.log('Payment document creation is disabled in settings. Skipping fallback creation for txRef:', txRef);
      return; // Don't create payment document if disabled
    }
    
    // Payment document doesn't exist - create it (webhook may have failed)
    // Note: We can't create transactionId here since it should be created during session creation
    // This is a fallback scenario - we'll use a generated ID
    const fallbackTransactionId = transactionId || `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const paymentData = {
      txRef, // From Paychangu response
      transactionId: fallbackTransactionId, // Fallback ID (should not happen in normal flow)
      orderId: orderId || metadata?.orderId,
      bookingId: bookingId || metadata?.bookingId,
      amount: amount || 0,
      currency: currency || 'MWK',
      status: status === 'success' ? PaymentSessionStatus.COMPLETED : status === 'failed' ? PaymentSessionStatus.FAILED : PaymentSessionStatus.PENDING,
      paymentMethod: paymentMethod,
      customerEmail: customerEmail,
      customerName: customerName,
      metadata: metadata || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      completedAt: status === 'success' ? serverTimestamp() : undefined,
    };
    
    await addDoc(paymentsRef, paymentData);
    console.log('Payment document created via verification (fallback) by txRef:', txRef, 'transactionId:', fallbackTransactionId, status);
  }
}

/**
 * Create ledger entry for successful payment if it doesn't exist
 * 
 * IMPORTANT: Uses txRef as primary identifier for ledger entries
 */
async function ensureLedgerEntry(
  verificationResult: {
    txRef: string;
    transactionId?: string;
    status: 'success' | 'failed' | 'pending';
    amount?: number;
    currency?: string;
    orderId?: string;
    bookingId?: string;
    metadata?: Record<string, unknown>;
  },
  source: string = 'unknown'
): Promise<void> {
  const { txRef, transactionId, status, amount, currency, orderId, bookingId, metadata } = verificationResult;
  
  // Only create ledger for successful payments
  if (status !== 'success') {
    return;
  }
  
  const finalOrderId = orderId || metadata?.orderId as string | undefined;
  const finalBookingId = bookingId || metadata?.bookingId as string | undefined;
  
  if (!finalOrderId && !finalBookingId) {
    console.log('No orderId or bookingId for ledger entry, txRef:', txRef);
    return;
  }
  
  // Use transactionId as primary identifier for ledger entries (matches webhook)
  // Fallback to txRef if transactionId is not available
  const ledgerIdentifier = transactionId || txRef;
  const ledgerId = finalOrderId 
    ? `payment_${ledgerIdentifier}` 
    : `payment_${ledgerIdentifier}_booking`;
  const ledgerRef = doc(db, COLLECTIONS.LEDGER, ledgerId);
  const existingEntry = await getDoc(ledgerRef);
  
  if (existingEntry.exists()) {
    console.log(`[${source.toUpperCase()}] Ledger entry already exists, skipping creation:`, ledgerId);
    return; // Already created
  }
  
  console.log(`[${source.toUpperCase()}] Creating new ledger entry:`, ledgerId);
  
  // Create ledger entry using createLedgerEntry to respect settings (auto-creation may be disabled)
  // Use custom ID for idempotency (matches the idempotency check above)
  try {
    const ledgerEntryId = await createLedgerEntry({
      entryType: finalOrderId ? LedgerEntryType.ORDER_SALE : LedgerEntryType.BOOKING_PAYMENT,
      amount: amount || 0,
      currency: currency || 'MWK',
      orderId: finalOrderId,
      bookingId: finalBookingId,
      paymentId: transactionId || txRef,
      description: finalOrderId ? `Order payment: ${finalOrderId}` : `Booking payment: ${finalBookingId}`,
      metadata: {
        transactionId, // Primary identifier (created manually during session creation)
        txRef, // From Paychangu (used for verification)
      },
    }, false, ledgerId); // Pass custom ID for idempotency
    if (ledgerEntryId) {
      console.log(`[${source.toUpperCase()}] Ledger entry created successfully:`, ledgerEntryId, 'txRef:', txRef);
    } else {
      console.log(`[${source.toUpperCase()}] Ledger entry creation skipped (auto-creation disabled in settings) for txRef:`, txRef);
    }
  } catch (ledgerError) {
    console.error(`[${source.toUpperCase()}] Error creating ledger entry:`, ledgerError);
  }
}

/**
 * Update order or booking status for successful payment
 */
async function updateOrderOrBookingStatus(
  verificationResult: {
    txRef: string;
    status: 'success' | 'failed' | 'pending';
    transactionId?: string;
    amount?: number;
    currency?: string;
    paymentMethod?: PaymentMethod;
    orderId?: string;
    bookingId?: string;
    metadata?: Record<string, unknown>;
  },
  source: string = 'unknown'
): Promise<void> {
  const { txRef, status, transactionId, amount, currency, paymentMethod, orderId, bookingId, metadata } = verificationResult;
  
  if (status !== 'success') {
    return;
  }
  
  const finalOrderId = orderId || (metadata?.orderId as string | undefined);
  const finalBookingId = bookingId || (metadata?.bookingId as string | undefined);
  
  if (finalOrderId) {
    const orderRef = doc(db, COLLECTIONS.ORDERS, finalOrderId);
    const orderSnap = await getDoc(orderRef);
    
    if (orderSnap.exists()) {
      const orderData = orderSnap.data();
      const previousStatus = orderData.status;
      // Only update if not already paid
      if (orderData.status !== OrderStatus.PAID) {
        await updateDoc(orderRef, {
          status: OrderStatus.PAID,
          payment: {
            paymentId: transactionId || txRef, // Prefer transactionId, fallback to txRef
            paymentMethod: paymentMethod || 'Paychangu',
            paidAt: serverTimestamp(),
            amount: amount || 0,
            currency: currency || 'MWK',
          },
          updatedAt: serverTimestamp(),
        });
        console.log(`[${source.toUpperCase()}] Order status updated to PAID:`, finalOrderId);

        // Adjust inventory for the paid order (idempotent via inventoryUpdated flag)
        try {
          await adjustInventoryForPaidOrder(finalOrderId);
        } catch (inventoryError) {
          console.error(`[${source.toUpperCase()}] Error adjusting inventory for order:`, finalOrderId, inventoryError);
        }
        
        // Create notification for order status change
        try {
          const { notifyOrderStatusChange } = await import('@/lib/notifications');
          await notifyOrderStatusChange({
            customerEmail: orderData.customerEmail || '',
            customerId: orderData.customerId,
            orderId: finalOrderId,
            orderNumber: orderData.orderNumber,
            status: OrderStatus.PAID,
            previousStatus,
          });
        } catch (notifError) {
          console.error(`[${source.toUpperCase()}] Error creating order status notification:`, notifError);
        }
      } else {
        console.log(`[${source.toUpperCase()}] Order already paid, skipping update:`, finalOrderId);
      }
    }
  }
  
  if (finalBookingId) {
    const bookingRef = doc(db, COLLECTIONS.BOOKINGS, finalBookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (bookingSnap.exists()) {
      const bookingData = bookingSnap.data();
      const previousStatus = bookingData.status;
      // Only update if not already paid
      if (bookingData.status !== BookingStatus.PAID) {
        await updateDoc(bookingRef, {
          status: BookingStatus.PAID,
          payment: {
            paymentId: transactionId || txRef, // Prefer transactionId, fallback to txRef
            paymentMethod: paymentMethod || 'Paychangu',
            paidAt: serverTimestamp(),
            amount: amount || 0,
            currency: currency || 'MWK',
          },
          updatedAt: serverTimestamp(),
        });
        console.log(`[${source.toUpperCase()}] Booking status updated to PAID:`, finalBookingId);
        
        // Create notification for booking status change
        try {
          const { notifyBookingStatusChange } = await import('@/lib/notifications');
          await notifyBookingStatusChange({
            customerEmail: bookingData.customerEmail || '',
            customerId: bookingData.customerId,
            bookingId: finalBookingId,
            bookingNumber: bookingData.bookingNumber,
            status: BookingStatus.PAID,
            previousStatus,
          });
        } catch (notifError) {
          console.error(`[${source.toUpperCase()}] Error creating booking status notification:`, notifError);
        }
      } else {
        console.log(`[${source.toUpperCase()}] Booking already paid, skipping update:`, finalBookingId);
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isPaychanguConfigured()) {
      return errorResponse(
        new Error('Paychangu is not properly configured'),
        'Payment service not configured'
      );
    }

    const { searchParams } = new URL(request.url);
    const txRef = searchParams.get('txRef');
    const source = 'manual'; // Manual verification from order/book confirmed pages

    if (!txRef) {
      return errorResponse(
        new Error('Transaction reference is required'),
        'Missing transaction reference'
      );
    }

    console.log(`[${source.toUpperCase()}] Starting payment verification for txRef:`, txRef);

    // First, try to get orderId/bookingId from existing payment document
    let existingOrderId: string | undefined;
    let existingBookingId: string | undefined;
    let existingTransactionId: string | undefined;
    
    try {
      const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
      const existingPaymentQuery = query(
        paymentsRef,
        where('txRef', '==', txRef)
      );
      const existingPayments = await getDocs(existingPaymentQuery);
      
      if (!existingPayments.empty) {
        const paymentData = existingPayments.docs[0].data();
        existingOrderId = paymentData.orderId;
        existingBookingId = paymentData.bookingId;
        existingTransactionId = paymentData.transactionId;
        console.log('Found existing payment document:', { txRef, existingOrderId, existingBookingId, existingTransactionId });
      }
    } catch (lookupError) {
      console.error('Error looking up existing payment document:', lookupError);
      // Continue with verification even if lookup fails
    }

    // Verify transaction using our typed function
    const verificationResult = await verifyPaymentSession(txRef);

    if (!verificationResult) {
      return errorResponse(
        new Error('Transaction not found'),
        'Transaction verification failed'
      );
    }

    // Merge orderId/bookingId from existing payment document if not in verification result
    if (!verificationResult.orderId && existingOrderId) {
      verificationResult.orderId = existingOrderId;
    }
    if (!verificationResult.bookingId && existingBookingId) {
      verificationResult.bookingId = existingBookingId;
    }
    if (!verificationResult.transactionId && existingTransactionId) {
      verificationResult.transactionId = existingTransactionId;
    }

    // Ensure payment document exists/updated (in case webhook failed)
    await ensurePaymentDocument(verificationResult);
    
    // If payment is successful, ensure ledger entry exists and update order/booking status
    if (verificationResult.status === 'success') {
      console.log(`[${source.toUpperCase()}] Payment verified as successful, checking if processing needed:`, {
        txRef,
        orderId: verificationResult.orderId,
        bookingId: verificationResult.bookingId,
        transactionId: verificationResult.transactionId
      });
      
      // Check if already processed by checking ledger entry
      const ledgerIdentifier = verificationResult.transactionId || txRef;
      const ledgerId = verificationResult.orderId 
        ? `payment_${ledgerIdentifier}` 
        : `payment_${ledgerIdentifier}_booking`;
      const ledgerRef = doc(db, COLLECTIONS.LEDGER, ledgerId);
      const existingLedger = await getDoc(ledgerRef);
      
      if (existingLedger.exists()) {
        console.log(`[${source.toUpperCase()}] Payment already processed (ledger exists). Skipping to prevent duplicate processing. Ledger ID:`, ledgerId);
        return successResponse(verificationResult, 'Transaction verified successfully (already processed)');
      }
      
      console.log(`[${source.toUpperCase()}] Processing payment (ledger does not exist yet):`, {
        txRef,
        orderId: verificationResult.orderId,
        bookingId: verificationResult.bookingId,
        transactionId: verificationResult.transactionId
      });
      
      await ensureLedgerEntry(verificationResult, source);
      await updateOrderOrBookingStatus(verificationResult, source);
      
      console.log(`[${source.toUpperCase()}] Ledger entry and order/booking update completed for txRef:`, txRef);
      
      // Get order/booking details for email and notifications (declare outside try blocks so they're accessible)
      let orderNumber: string | undefined;
      let bookingNumber: string | undefined;
      let customerId: string | undefined;
      
      if (verificationResult.orderId) {
        const orderRef = doc(db, COLLECTIONS.ORDERS, verificationResult.orderId);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          const orderData = orderSnap.data();
          orderNumber = orderData.orderNumber;
          customerId = orderData.customerId;
        }
      }
      
      if (verificationResult.bookingId) {
        const bookingRef = doc(db, COLLECTIONS.BOOKINGS, verificationResult.bookingId);
        const bookingSnap = await getDoc(bookingRef);
        if (bookingSnap.exists()) {
          const bookingData = bookingSnap.data();
          bookingNumber = bookingData.bookingNumber;
          customerId = bookingData.customerId;
        }
      }
      
      // Send success email to customer
      try {
        const { sendPaymentEmail } = await import('@/lib/email/payment');
        
        await sendPaymentEmail({
          customerName: verificationResult.customerName,
          customerEmail: verificationResult.customerEmail,
          amount: verificationResult.amount || 0,
          currency: verificationResult.currency || 'MWK',
          txRef: verificationResult.txRef,
          transactionId: verificationResult.transactionId,
          orderId: verificationResult.orderId,
          orderNumber,
          bookingId: verificationResult.bookingId,
          bookingNumber,
          paymentMethod: verificationResult.paymentMethod,
          status: 'success',
        }, source);
      } catch (emailError) {
        console.error(`[${source.toUpperCase()}] Error sending payment success email:`, emailError);
        // Don't fail payment processing if email fails
      }
      
      // Create payment success notification
      try {
        const { notifyPaymentSuccess } = await import('@/lib/notifications');
        
        await notifyPaymentSuccess({
          customerEmail: verificationResult.customerEmail || '',
          customerId,
          amount: verificationResult.amount || 0,
          currency: verificationResult.currency || 'MWK',
          orderId: verificationResult.orderId,
          bookingId: verificationResult.bookingId,
          paymentId: verificationResult.transactionId,
          orderNumber,
          bookingNumber,
        });
        console.log(`[${source.toUpperCase()}] Payment success notification created for txRef:`, txRef);
      } catch (notifError) {
        console.error(`[${source.toUpperCase()}] Error creating payment success notification:`, notifError);
        // Log full error details for debugging
        if (notifError instanceof Error) {
          console.error('Notification error details:', {
            message: notifError.message,
            stack: notifError.stack,
            customerEmail: verificationResult.customerEmail,
            customerId,
            orderId: verificationResult.orderId,
            bookingId: verificationResult.bookingId,
          });
        }
      }
    } else if (verificationResult.status === 'failed') {
      // Send failure email to customer
      try {
        const { sendPaymentEmail } = await import('@/lib/email/payment');
        
        await sendPaymentEmail({
          customerName: verificationResult.customerName,
          customerEmail: verificationResult.customerEmail,
          amount: verificationResult.amount || 0,
          currency: verificationResult.currency || 'MWK',
          txRef: verificationResult.txRef,
          transactionId: verificationResult.transactionId,
          orderId: verificationResult.orderId,
          bookingId: verificationResult.bookingId,
          paymentMethod: verificationResult.paymentMethod,
          status: 'failed',
        }, source);
      } catch (emailError) {
        console.error(`[${source.toUpperCase()}] Error sending payment failure email:`, emailError);
        // Don't fail payment processing if email fails
      }
      
      // Create payment failure notification
      try {
        const { notifyPaymentFailed } = await import('@/lib/notifications');
        // Get customer ID and order/booking numbers from order/booking if available
        let customerId: string | undefined;
        let orderNumber: string | undefined;
        let bookingNumber: string | undefined;
        
        if (verificationResult.orderId) {
          const orderRef = doc(db, COLLECTIONS.ORDERS, verificationResult.orderId);
          const orderSnap = await getDoc(orderRef);
          if (orderSnap.exists()) {
            const orderData = orderSnap.data();
            customerId = orderData.customerId;
            orderNumber = orderData.orderNumber;
          }
        } else if (verificationResult.bookingId) {
          const bookingRef = doc(db, COLLECTIONS.BOOKINGS, verificationResult.bookingId);
          const bookingSnap = await getDoc(bookingRef);
          if (bookingSnap.exists()) {
            const bookingData = bookingSnap.data();
            customerId = bookingData.customerId;
            bookingNumber = bookingData.bookingNumber;
          }
        }
        
        await notifyPaymentFailed({
          customerEmail: verificationResult.customerEmail || '',
          customerId,
          amount: verificationResult.amount || 0,
          currency: verificationResult.currency || 'MWK',
          reason: verificationResult.metadata?.failure_reason as string | undefined,
          orderId: verificationResult.orderId,
          bookingId: verificationResult.bookingId,
          paymentId: verificationResult.transactionId,
          orderNumber,
          bookingNumber,
        });
      } catch (notifError) {
        console.error(`[${source.toUpperCase()}] Error creating payment failure notification:`, notifError);
      }
    } else {
      console.log(`[${source.toUpperCase()}] Payment status is not success or failed:`, verificationResult.status);
    }

    return successResponse(verificationResult, 'Transaction verified successfully');
  } catch (error: unknown) {
    console.error('Error verifying payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify payment';
    return errorResponse(error instanceof Error ? error : new Error(errorMessage), 'Failed to verify payment');
  }
}

