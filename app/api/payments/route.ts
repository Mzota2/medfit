/**
 * API route for creating payment sessions
 * SERVER-SIDE ONLY
 */

import { NextRequest } from 'next/server';
import { createPaymentSession } from '@/lib/paychangu/sessions';
import { CreatePaymentSessionInput } from '@/types/payment';
import { successResponse, errorResponse } from '@/lib/api/helpers';
import { ValidationError } from '@/lib/utils/errors';
import { isPaychanguConfigured } from '@/lib/paychangu/config';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: CreatePaymentSessionInput;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return errorResponse(
        new ValidationError('Invalid request body'),
        'Invalid request body'
      );
    }

    // Check Paychangu configuration
    if (!isPaychanguConfigured()) {
      console.error('Paychangu not configured. Missing environment variables:', {
        hasSecretKey: !!process.env.PAYCHANGU_SECRET_KEY,
        hasWebhookSecret: !!process.env.PAYCHANGU_WEBHOOK_SECRET,
      });
      return errorResponse(
        new ValidationError('Payment service is not configured. Please contact support.'),
        'Payment service configuration error'
      );
    }

    // Validate input
    if (!body.amount || !body.currency || !body.customerEmail) {
      console.error('Missing required fields:', {
        hasAmount: !!body.amount,
        hasCurrency: !!body.currency,
        hasEmail: !!body.customerEmail,
      });
      return errorResponse(
        new ValidationError('Missing required fields: amount, currency, and customerEmail'),
        'Missing required fields'
      );
    }

    // Validate amount
    if (typeof body.amount !== 'number' || body.amount <= 0) {
      console.error('Invalid amount:', body.amount);
      return errorResponse(
        new ValidationError('Amount must be a positive number'),
        'Invalid amount'
      );
    }

    // Get base URL from request to preserve port number (important for localhost development)
    // Parse the request URL to extract origin with port
    let baseUrl: string;
    try {
      const url = new URL(request.url);
      // Construct origin with port: protocol + hostname + port
      baseUrl = `${url.protocol}//${url.host}`;
    } catch {
      // If URL parsing fails, try nextUrl.origin
      if (request.nextUrl.origin) {
        baseUrl = request.nextUrl.origin;
      } else {
        const origin = request.headers.get('origin');
        if (origin) {
          baseUrl = origin;
        } else {
          // Fallback to default (should include port for development)
          const { getAppBaseUrl } = await import('@/lib/paychangu/config');
          baseUrl = getAppBaseUrl();
        }
      }
    }

    console.log('Creating payment session:', {
      amount: body.amount,
      currency: body.currency,
      customerEmail: body.customerEmail,
      hasOrderId: !!body.orderId,
      hasBookingId: !!body.bookingId,
      baseUrl,
    });

    // Create payment session via Paychangu API
    // Returns session data and checkout_url for client-side redirect
    const { session, checkoutUrl } = await createPaymentSession(body, baseUrl);

    // Save payment session to Firestore
    try {
      const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
      
      // Check if payment document already exists (idempotency)
      // Use transactionId as primary identifier (created manually)
      const existingPaymentQuery = query(
        paymentsRef,
        where('transactionId', '==', session.transactionId)
      );
      const existingPayments = await getDocs(existingPaymentQuery);
      
      if (existingPayments.empty) {
        // Convert Date objects and enum values to Firestore-compatible format
        // Only include fields that have values (not undefined) - Firestore doesn't allow undefined
        const paymentData: Record<string, unknown> = {
          txRef: session.txRef,
          transactionId: session.transactionId,
          amount: session.amount,
          currency: session.currency,
          status: session.status, // Enum value (string) - Firestore accepts this
          customerEmail: session.customerEmail,
          checkoutUrl,
          createdAt: serverTimestamp(), // Always use serverTimestamp for consistency
          updatedAt: serverTimestamp(),
        };
        
        // Only add orderId if it exists (for order payments)
        if (session.orderId) {
          paymentData.orderId = session.orderId;
        }
        
        // Only add bookingId if it exists (for booking payments)
        if (session.bookingId) {
          paymentData.bookingId = session.bookingId;
        }
        
        // Add optional fields only if they exist
        if (session.customerName) {
          paymentData.customerName = session.customerName;
        }
        if (session.sessionId) {
          paymentData.sessionId = session.sessionId;
        }
        if (session.paymentMethod) {
          paymentData.paymentMethod = session.paymentMethod;
        }
        if (session.metadata) {
          // Ensure metadata values are strings or primitives
          const cleanMetadata: Record<string, string> = {};
          for (const [key, value] of Object.entries(session.metadata)) {
            cleanMetadata[key] = String(value);
          }
          paymentData.metadata = cleanMetadata;
        }
        if (session.completedAt) {
          paymentData.completedAt = session.completedAt instanceof Date 
            ? session.completedAt.toISOString() 
            : session.completedAt;
        }
        
        await addDoc(paymentsRef, paymentData);
        console.log('Payment session saved to Firestore:', {
          txRef: session.txRef,
          transactionId: session.transactionId,
          orderId: session.orderId,
          bookingId: session.bookingId,
        });
      } else {
        console.log('Payment session already exists in Firestore:', session.txRef);
        // Update existing document with checkoutUrl if needed
        const existingDoc = existingPayments.docs[0];
        const existingData = existingDoc.data();
        if (!existingData.checkoutUrl && checkoutUrl) {
          await updateDoc(doc(db, COLLECTIONS.PAYMENTS, existingDoc.id), {
            checkoutUrl,
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (saveError) {
      console.error('Error saving payment session to Firestore:', saveError);
      // Log detailed error for debugging
      if (saveError instanceof Error) {
        console.error('Save error details:', {
          message: saveError.message,
          stack: saveError.stack,
          name: saveError.name,
          code: (saveError as { code?: string }).code,
          sessionData: {
            txRef: session.txRef,
            transactionId: session.transactionId,
            orderId: session.orderId,
            bookingId: session.bookingId,
            status: session.status,
            amount: session.amount,
            currency: session.currency,
          },
        });
      } else {
        console.error('Unknown error type:', saveError);
      }
      // Still return success - webhook/verification will create the document if needed
      // But log the error for debugging
    }

    console.log('Payment session created successfully:', {
      txRef: session.txRef,
      hasCheckoutUrl: !!checkoutUrl,
    });

    // Return session and checkout_url for client-side redirect
    return successResponse({ session, checkoutUrl }, 'Payment session created successfully');
  } catch (error: unknown) {
    console.error('Error in payment API route:', error);
    
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create payment session';
    return errorResponse(
      error instanceof Error ? error : new Error(errorMessage),
      errorMessage
    );
  }
}
