import { NextRequest, NextResponse } from 'next/server';
import { paychanguConfig, isPaychanguConfigured, getAuthHeader } from '@/lib/paychangu/config';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, getDoc, serverTimestamp, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/collections';
import { OrderStatus } from '@/types/order';
import { BookingStatus } from '@/types/booking';
import { LedgerEntryType } from '@/types/ledger';
import { PaymentSessionStatus, PaymentMethod } from '@/types/payment';
import { createHmac, timingSafeEqual } from 'crypto';
import { createLedgerEntry } from '@/lib/ledger/create';
import { adjustInventoryForPaidOrder } from '@/lib/orders/inventory';
import { shouldCreatePaymentDocument } from '@/lib/payments/utils';

/**
 * Webhook payment data structure
 */
interface WebhookPaymentData {
  transaction_id?: string;
  tx_ref?: string;
  session_id?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  failure_reason?: string;
  metadata?: {
    orderId?: string;
    bookingId?: string;
    customerEmail?: string;
    customerName?: string;
    [key: string]: unknown;
  };
  customer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

/**
 * Verify webhook signature using HMAC-SHA256 and constant-time comparison
 */
export const verifyWebhookSignature = (
  payload: string,
  signature: string
): boolean => {
  if (!paychanguConfig.webhookSecret || !signature) {
    return false;
  }

  try {
    const expectedSignature = createHmac('sha256', paychanguConfig.webhookSecret)
      .update(payload)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');

    // timingSafeEqual requires buffers of the same length
    if (sigBuf.length !== expectedBuf.length) {
      return false;
    }

    return timingSafeEqual(sigBuf, expectedBuf);
  } catch (err) {
    // Treat any error while verifying as an invalid signature
    return false;
  }
};

/**
 * Call verification endpoint as fallback if webhook processing fails
 */
async function callVerificationFallback(txRef: string): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/payments/verify?txRef=${encodeURIComponent(txRef)}`;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Calling verification endpoint as fallback for txRef:', txRef);
    }
    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      if (process.env.NODE_ENV !== 'production') {
        console.log('Verification fallback successful for txRef:', txRef, result.success ? '✓' : '✗');
      }
    } else {
      console.error('Verification fallback failed for txRef:', txRef, response.status);
    }
  } catch (error) {
    console.error('Error calling verification fallback for txRef:', txRef, error);
  }
}

/**
 * Handle user redirect from Paychangu after payment
 * Paychangu redirects users to callback_url (GET request) after payment completion
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txRef = searchParams.get('tx_ref') || searchParams.get('txRef');
    
    if (!txRef) {
      // No tx_ref provided, redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Look up payment session to get orderId or bookingId
    const { db } = await import('@/lib/firebase/config');
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { COLLECTIONS } = await import('@/types/collections');
    
    const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
    const paymentQuery = query(paymentsRef, where('txRef', '==', txRef));
    const paymentDocs = await getDocs(paymentQuery);
    
    if (paymentDocs.empty) {
      // Payment session not found, redirect to payment status page
      return NextResponse.redirect(new URL(`/payment/status?txRef=${encodeURIComponent(txRef)}`, request.url));
    }
    
    const paymentData = paymentDocs.docs[0].data();
    const orderId = paymentData.orderId;
    const bookingId = paymentData.bookingId;
    
    // Redirect to appropriate confirmation page
    // Note: Route groups (bookings) and (orders) don't affect the URL path
    if (bookingId) {
      return NextResponse.redirect(new URL(`/book-confirmed?bookingId=${encodeURIComponent(bookingId)}&txRef=${encodeURIComponent(txRef)}`, request.url));
    } else if (orderId) {
      return NextResponse.redirect(new URL(`/order-confirmed?orderId=${encodeURIComponent(orderId)}&txRef=${encodeURIComponent(txRef)}`, request.url));
    } else {
      // No orderId or bookingId, redirect to payment status page
      return NextResponse.redirect(new URL(`/payment/status?txRef=${encodeURIComponent(txRef)}`, request.url));
    }
  } catch (error) {
    console.error('Error handling payment redirect:', error);
    // On error, redirect to home page
    return NextResponse.redirect(new URL('/', request.url));
  }
}

/**
 * Process payment webhook (POST request from Paychangu server)
 */
export async function POST(request: NextRequest) {
  let webhookBody = '';
  let txRef: string | undefined;
  
  try {
    // Check if Paychangu is properly configured
    if (!isPaychanguConfigured()) {
      return NextResponse.json(
        { error: 'Paychangu is not properly configured' },
        { status: 500 }
      );
    }

    // Get webhook signature
    const signature = request.headers.get('x-paychangu-signature');
    webhookBody = await request.text();

    // Verify webhook signature strictly in production; allow warnings in non-production for testing
    const isSignaturePresent = !!signature;
    const isSecretPresent = !!paychanguConfig.webhookSecret;

    if (!isSecretPresent) {
      const msg = 'Paychangu webhook secret is not configured.';
      if (process.env.NODE_ENV === 'production') {
        console.error(msg);
        return NextResponse.json({ error: msg }, { status: 401 });
      } else {
        console.warn(msg + ' Continuing in non-production environment.');
      }
    } else if (!isSignaturePresent) {
      const msg = 'Missing Paychangu webhook signature header.';
      if (process.env.NODE_ENV === 'production') {
        console.error(msg);
        return NextResponse.json({ error: msg }, { status: 401 });
      } else {
        console.warn(msg + ' Continuing in non-production environment.');
      }
    } else {
      const isValidSignature = verifyWebhookSignature(webhookBody, signature as string);
      if (!isValidSignature) {
        const msg = 'Invalid Paychangu webhook signature.';
        if (process.env.NODE_ENV === 'production') {
          console.error(msg);
          return NextResponse.json({ error: msg }, { status: 401 });
        } else {
          console.warn(msg + ' Continuing in non-production environment for testing.');
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Webhook signature verified successfully');
        }
      }
    }

    const payload = JSON.parse(webhookBody) as { event: string; data: Record<string, unknown> };
    const { event, data } = payload;

    // Handle different webhook events
    const webhookData = data as WebhookPaymentData;
    txRef = webhookData.tx_ref;
    const source = 'webhook'; // Webhook from Paychangu

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${source.toUpperCase()}] Received webhook event:`, event, 'txRef:', txRef);
    }

    try {
      switch (event) {
        case 'payment.success':
          await handlePaymentSuccess(webhookData, source);
          break;
        case 'payment.failed':
          await handlePaymentFailed(webhookData, source);
          break;
        default:
          console.log(`[${source.toUpperCase()}] Unhandled webhook event:`, event);
      }
    } catch (error) {
      console.error('Error handling webhook event:', event, error);
      
      // If we have a txRef, call verification endpoint as automatic fallback
      if (txRef) {
        console.log('Webhook processing failed, calling verification fallback for txRef:', txRef);
        await callVerificationFallback(txRef);
      }
    }

    // Return success even if there was an error - verification fallback will handle it
    // This prevents Paychangu from retrying the webhook unnecessarily
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Webhook processing failed';
    
    // Try to extract txRef from payload for fallback
    if (!txRef && webhookBody) {
      try {
        const payload = JSON.parse(webhookBody) as { event: string; data: Record<string, unknown> };
        txRef = payload.data?.tx_ref as string | undefined;
      } catch (parseError) {
        console.error('Error parsing webhook body for fallback:', parseError);
      }
    }
    
    if (txRef) {
      console.log('Webhook error, calling verification fallback for txRef:', txRef);
      await callVerificationFallback(txRef);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Update or create payment document for transaction (success or failure)
 * Payment document should already exist from session creation, so we UPDATE it
 * 
 * IMPORTANT: 
 * - transactionId is the primary identifier (created manually during payment session creation)
 * - txRef is obtained from Paychangu response (used for verification with Paychangu)
 */
async function updatePaymentDocument(data: WebhookPaymentData, status: 'success' | 'failed'): Promise<void> {
  const { transaction_id, tx_ref, session_id, amount, currency, metadata, payment_method, failure_reason } = data;
  
  // transactionId is the primary identifier - it's created manually during session creation
  // We need to find the payment document by transactionId
  // However, webhook may only have tx_ref, so we need to handle both cases
  
  if (!tx_ref) {
    console.error('No tx_ref in webhook data - this is required to identify the payment');
    return;
  }
  
  // Find existing payment document by txRef (from Paychangu)
  // Note: We use txRef to find the document since it's what Paychangu sends in webhook
  const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
  const existingPaymentQuery = query(
    paymentsRef,
    where('txRef', '==', tx_ref)
  );
  const existingPayments = await getDocs(existingPaymentQuery);
  
  const updateData: Record<string, unknown> = {
    status: status === 'success' ? PaymentSessionStatus.COMPLETED : PaymentSessionStatus.FAILED,
    paymentMethod: payment_method ? mapPaymentMethod(payment_method) : undefined,
    updatedAt: serverTimestamp(),
  };
  
  // transactionId is already set during session creation (created manually)
  // We don't update it from webhook - it remains the same
  
  if (status === 'success') {
    updateData.completedAt = serverTimestamp();
  } else {
    updateData.failureReason = failure_reason;
  }
  
  // Update customer info if available
  if (data.customer?.email || metadata?.customerEmail) {
    updateData.customerEmail = data.customer?.email || metadata?.customerEmail;
  }
  if (data.customer?.first_name && data.customer?.last_name) {
    updateData.customerName = `${data.customer.first_name} ${data.customer.last_name}`;
  } else if (metadata?.customerName) {
    updateData.customerName = metadata.customerName;
  }
  
  if (!existingPayments.empty) {
    // Update existing payment document
    const paymentDoc = existingPayments.docs[0];
    await updateDoc(doc(db, COLLECTIONS.PAYMENTS, paymentDoc.id), updateData);
    console.log('Payment document updated by txRef:', tx_ref, status, transaction_id ? `transactionId: ${transaction_id}` : '');
  } else {
    // Payment document doesn't exist (webhook called before session creation or session creation failed)
    // Check if payment document creation is enabled before creating fallback
    const shouldCreate = await shouldCreatePaymentDocument();
    if (!shouldCreate) {
      console.log('Payment document creation is disabled in settings. Skipping fallback creation for txRef:', tx_ref);
      return; // Don't create payment document if disabled
    }
    
    // Create it now as fallback
    // Note: We can't create transactionId here since it should be created during session creation
    // This is a fallback scenario - we'll use a generated ID
    const fallbackTransactionId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const paymentData = {
      txRef: tx_ref, // From Paychangu response
      transactionId: fallbackTransactionId, // Fallback ID (should not happen in normal flow)
      sessionId: session_id,
      orderId: metadata?.orderId,
      bookingId: metadata?.bookingId,
      amount: amount || 0,
      currency: currency || 'MWK',
      status: status === 'success' ? PaymentSessionStatus.COMPLETED : PaymentSessionStatus.FAILED,
      paymentMethod: payment_method ? mapPaymentMethod(payment_method) : undefined,
      customerEmail: data.customer?.email || metadata?.customerEmail,
      customerName: data.customer?.first_name && data.customer?.last_name
        ? `${data.customer.first_name} ${data.customer.last_name}`
        : metadata?.customerName,
      metadata: metadata || {},
      failureReason: failure_reason,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      completedAt: status === 'success' ? serverTimestamp() : undefined,
    };
    
    await addDoc(paymentsRef, paymentData);
    console.log('Payment document created (fallback) by txRef:', tx_ref, 'transactionId:', fallbackTransactionId, status);
  }
}

/**
 * Map payment method string to PaymentMethod enum
 */
function mapPaymentMethod(method: string): PaymentMethod {
  const methodLower = method.toLowerCase();
  if (methodLower.includes('card')) {
    return PaymentMethod.CARD;
  } else if (methodLower.includes('mobile') || methodLower.includes('momo')) {
    return PaymentMethod.MOBILE_MONEY;
  } else if (methodLower.includes('bank') || methodLower.includes('transfer')) {
    return PaymentMethod.BANK_TRANSFER;
  }
  return PaymentMethod.CARD; // Default
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(data: WebhookPaymentData, source: string = 'webhook'): Promise<void> {
  const { transaction_id, amount, currency, metadata, tx_ref } = data;

  if (!tx_ref) {
    console.error('No tx_ref in webhook data - cannot process payment');
    return;
  }

  try {
    // Update payment document (should already exist from session creation)
    await updatePaymentDocument(data, 'success');

    // Get transactionId from payment document (created manually during session creation)
    const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
    const paymentQuery = query(
      paymentsRef,
      where('txRef', '==', tx_ref)
    );
    const paymentDocs = await getDocs(paymentQuery);
    
    if (paymentDocs.empty) {
      console.error('Payment document not found for txRef:', tx_ref);
      await callVerificationFallback(tx_ref);
      return;
    }
    
    const paymentDoc = paymentDocs.docs[0];
    const paymentData = paymentDoc.data();
    const transactionId = paymentData.transactionId; // Created manually during session creation
    
    if (!transactionId) {
      console.error('Payment document missing transactionId for txRef:', tx_ref);
      await callVerificationFallback(tx_ref);
      return;
    }
    
    // Get orderId/bookingId from payment document if not in metadata
    const finalOrderId = metadata?.orderId || paymentData.orderId;
    const finalBookingId = metadata?.bookingId || paymentData.bookingId;
    
    if (!finalOrderId && !finalBookingId) {
      console.error('No orderId or bookingId found in metadata or payment document for txRef:', tx_ref);
      await callVerificationFallback(tx_ref);
      return;
    }
    
    // Check if we've already processed this transaction (idempotency)
    // Use transactionId as primary identifier for ledger entry (created manually)
    const ledgerId = finalOrderId 
      ? `payment_${transactionId}` 
      : `payment_${transactionId}_booking`;
    const ledgerRef = doc(db, COLLECTIONS.LEDGER, ledgerId);
    const existingEntry = await getDoc(ledgerRef);

    if (existingEntry.exists()) {
      console.log(`[${source.toUpperCase()}] Transaction already processed (ledger exists). Skipping to prevent duplicate processing. Ledger ID:`, ledgerId);
      return; // Idempotent - already processed
    }
    
    console.log(`[${source.toUpperCase()}] Processing payment (ledger does not exist yet):`, {
      txRef: tx_ref,
      orderId: finalOrderId,
      bookingId: finalBookingId,
      transactionId
    });
    
    // Verify transaction using txRef (from Paychangu, used for verification)
    const isTransactionVerified = await verifyTransaction(tx_ref);
    if (!isTransactionVerified) {
      console.error('Transaction verification failed for txRef:', tx_ref);
      // Call verification endpoint as fallback
      await callVerificationFallback(tx_ref);
      return;
    }

  // Update order or booking status
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
            paymentId: transactionId || transaction_id || tx_ref,
            paymentMethod: data.payment_method || 'Paychangu',
            paidAt: serverTimestamp(),
            amount,
            currency,
          },
          updatedAt: serverTimestamp(),
        });
        console.log(`[${source.toUpperCase()}] Order status updated to PAID:`, finalOrderId);

        // Adjust inventory when order is successfully paid (idempotent)
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

    // Create ledger entry for successful payment
    // Use createLedgerEntry to respect settings (auto-creation may be disabled)
    // Use custom ID for idempotency (matches the idempotency check above)
    try {
      const ledgerEntryId = await createLedgerEntry({
        entryType: LedgerEntryType.ORDER_SALE,
        amount: amount || 0,
        currency: currency || 'MWK',
        orderId: finalOrderId,
        paymentId: transactionId,
        description: `Order payment: ${finalOrderId}`,
        metadata: {
          transactionId, // Primary identifier (created manually)
          txRef: tx_ref, // From Paychangu (used for verification)
        },
      }, false, ledgerId); // Pass custom ID for idempotency
      if (ledgerEntryId) {
        console.log(`[${source.toUpperCase()}] Ledger entry created for order:`, finalOrderId, 'transactionId:', transactionId, 'txRef:', tx_ref, 'ledgerId:', ledgerEntryId);
      } else {
        console.log(`[${source.toUpperCase()}] Ledger entry creation skipped (auto-creation disabled in settings) for order:`, finalOrderId);
      }
    } catch (ledgerError) {
      console.error(`[${source.toUpperCase()}] Error creating ledger entry for order:`, finalOrderId, ledgerError);
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
            paymentId: transactionId || transaction_id || tx_ref,
            paymentMethod: data.payment_method || 'Paychangu',
            paidAt: serverTimestamp(),
            amount,
            currency,
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

    // Create ledger entry for successful payment
    // Use createLedgerEntry to respect settings (auto-creation may be disabled)
    // Use custom ID for idempotency (matches the idempotency check above)
    try {
      const ledgerEntryId = await createLedgerEntry({
        entryType: LedgerEntryType.BOOKING_PAYMENT,
        amount :amount || 0,
        currency: currency || 'MWK',
        bookingId: finalBookingId,
        paymentId: transactionId,
        description: `Booking payment: ${finalBookingId}`,
        metadata: {
          transactionId, // Primary identifier (created manually)
          txRef: tx_ref, // From Paychangu (used for verification)
        },
      }, false, ledgerId); // Pass custom ID for idempotency
      if (ledgerEntryId) {
        console.log(`[${source.toUpperCase()}] Ledger entry created for booking:`, finalBookingId, 'transactionId:', transactionId, 'txRef:', tx_ref, 'ledgerId:', ledgerEntryId);
      } else {
        console.log(`[${source.toUpperCase()}] Ledger entry creation skipped (auto-creation disabled in settings) for booking:`, finalBookingId);
      }
    } catch (ledgerError) {
      console.error(`[${source.toUpperCase()}] Error creating ledger entry for booking:`, finalBookingId, ledgerError);
    }
  }
  
  // Get order/booking details for email and notifications (declare outside try blocks so they're accessible)
  let orderNumber: string | undefined;
  let bookingNumber: string | undefined;
  let customerId: string | undefined;
  
  if (finalOrderId) {
    const orderRef = doc(db, COLLECTIONS.ORDERS, finalOrderId);
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      const orderData = orderSnap.data();
      orderNumber = orderData.orderNumber;
      customerId = orderData.customerId;
    }
  }
  
  if (finalBookingId) {
    const bookingRef = doc(db, COLLECTIONS.BOOKINGS, finalBookingId);
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
      customerName: data.customer?.first_name && data.customer?.last_name
        ? `${data.customer.first_name} ${data.customer.last_name}`
        : metadata?.customerName as string | undefined,
      customerEmail: data.customer?.email || metadata?.customerEmail as string || '',
      amount: amount || 0,
      currency: currency || 'MWK',
      txRef: tx_ref,
      transactionId: transactionId,
      orderId: finalOrderId,
      orderNumber,
      bookingId: finalBookingId,
      bookingNumber,
      paymentMethod: data.payment_method,
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
      customerEmail: data.customer?.email || metadata?.customerEmail as string || '',
      customerId,
      amount: amount || 0,
      currency: currency || 'MWK',
      orderId: finalOrderId,
      bookingId: finalBookingId,
      paymentId: transactionId,
      orderNumber,
      bookingNumber,
    });
    console.log(`[${source.toUpperCase()}] Payment success notification created for txRef:`, tx_ref);
  } catch (notifError) {
    console.error(`[${source.toUpperCase()}] Error creating payment success notification:`, notifError);
    // Log full error details for debugging
    if (notifError instanceof Error) {
      console.error('Notification error details:', {
        message: notifError.message,
        stack: notifError.stack,
        customerEmail: data.customer?.email || metadata?.customerEmail,
        customerId,
        orderId: finalOrderId,
        bookingId: finalBookingId,
      });
    }
  }
  } catch (error) {
    console.error('Error processing successful payment for txRef:', tx_ref, error);
    // Call verification endpoint as fallback to ensure payment/ledger are created
    await callVerificationFallback(tx_ref);
    throw error; // Re-throw to let webhook handler know it failed
  }
}

async function verifyTransaction(txRefOrTransactionId: string): Promise<boolean> {
  if (!isPaychanguConfigured()) {
    console.error('Paychangu is not properly configured');
    return false;
  }

  try {
    // Paychangu uses tx_ref for verification, not transaction_id
    const transactionVerification = await fetch(`${paychanguConfig.baseUrl}/verify-payment/${txRefOrTransactionId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': getAuthHeader(),
      },
    });

    if (!transactionVerification.ok) {
      console.error('Transaction verification request failed:', transactionVerification.status);
      return false;
    }

    const transactionVerificationData = await transactionVerification.json();
    
    // Check if verification was successful
    if (transactionVerificationData.status === 'success' && transactionVerificationData.data?.status === 'success') {
      return true;
    }
    
    console.error('Transaction verification failed:', transactionVerificationData);
    return false;
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return false;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(data: WebhookPaymentData, source: string = 'webhook'): Promise<void> {
  const { metadata, failure_reason, tx_ref } = data;

  if (!tx_ref) {
    console.error('No tx_ref in webhook data - cannot process failed payment');
    return;
  }

  try {
    // Update payment document (should already exist from session creation)
    await updatePaymentDocument(data, 'failed');

    // Verify transaction using txRef (primary identifier)
    const isTransactionVerified = await verifyTransaction(tx_ref);
    if (!isTransactionVerified) {
      console.error('Transaction verification failed for txRef:', tx_ref);
      // Call verification endpoint as fallback
      await callVerificationFallback(tx_ref);
      return;
    }

    // Update order or booking status
    if (metadata?.orderId) {
      const orderRef = doc(db, COLLECTIONS.ORDERS, metadata.orderId);
      await updateDoc(orderRef, {
        status: OrderStatus.CANCELED,
        canceledReason: failure_reason || 'Payment failed',
        canceledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (metadata?.bookingId) {
      const bookingRef = doc(db, COLLECTIONS.BOOKINGS, metadata.bookingId);
      await updateDoc(bookingRef, {
        status: BookingStatus.CANCELED,
        canceledReason: failure_reason || 'Payment failed',
        canceledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    
    // Get payment document to get transactionId and customer info
    const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
    const paymentQuery = query(
      paymentsRef,
      where('txRef', '==', tx_ref)
    );
    const paymentDocs = await getDocs(paymentQuery);
    const paymentData = paymentDocs.empty ? null : paymentDocs.docs[0].data();
    const transactionId = paymentData?.transactionId;
    
    // Get order/booking details
    let orderNumber: string | undefined;
    let bookingNumber: string | undefined;
    let customerId: string | undefined;
    
    if (metadata?.orderId) {
      const orderRef = doc(db, COLLECTIONS.ORDERS, metadata.orderId as string);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        orderNumber = orderData.orderNumber;
        customerId = orderData.customerId;
      }
    }
    
    if (metadata?.bookingId) {
      const bookingRef = doc(db, COLLECTIONS.BOOKINGS, metadata.bookingId as string);
      const bookingSnap = await getDoc(bookingRef);
      if (bookingSnap.exists()) {
        const bookingData = bookingSnap.data();
        bookingNumber = bookingData.bookingNumber;
        customerId = bookingData.customerId;
      }
    }
    
    // Send failure email to customer
    try {
      const { sendPaymentEmail } = await import('@/lib/email/payment');
      
      await sendPaymentEmail({
        customerName: metadata?.customerName as string | undefined,
        customerEmail: metadata?.customerEmail as string || '',
        amount: data.amount || 0,
        currency: data.currency || 'MWK',
        txRef: tx_ref,
        transactionId: data.transaction_id,
        orderId: metadata?.orderId as string | undefined,
        bookingId: metadata?.bookingId as string | undefined,
        paymentMethod: data.payment_method,
        failureReason: failure_reason,
        status: 'failed',
      }, source);
    } catch (emailError) {
      console.error(`[${source.toUpperCase()}] Error sending payment failure email:`, emailError);
      // Don't fail payment processing if email fails
    }
    
    // Create payment failure notification
    try {
      const { notifyPaymentFailed } = await import('@/lib/notifications');
      await notifyPaymentFailed({
        customerEmail: metadata?.customerEmail as string || '',
        customerId,
        amount: data.amount || 0,
        currency: data.currency || 'MWK',
        reason: failure_reason,
        orderId: metadata?.orderId as string | undefined,
        bookingId: metadata?.bookingId as string | undefined,
        paymentId: transactionId,
        orderNumber,
        bookingNumber,
      });
    } catch (notifError) {
      console.error(`[${source.toUpperCase()}] Error creating payment failure notification:`, notifError);
    }
  } catch (error) {
    console.error('Error processing failed payment for txRef:', tx_ref, error);
    // Call verification endpoint as fallback to ensure payment is updated
    await callVerificationFallback(tx_ref);
    throw error; // Re-throw to let webhook handler know it failed
  }
}

