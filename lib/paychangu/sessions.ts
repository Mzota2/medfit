
import { paychanguConfig, isPaychanguConfigured, getAppBaseUrl, getAuthHeader } from './config';
import { 
  CreatePaymentSessionInput, 
  PaymentSession, 
  PaymentSessionStatus,
  PaymentVerificationResult,
  PaychanguPaymentVerificationResponse,
  PaychanguPaymentInitiationData,
  PaymentMethod
} from '@/types/payment';
import { randomUUID } from 'crypto';

/**
 * Generate a unique transaction ID (created manually for each payment)
 */
const generateTransactionId = (): string => {
  return randomUUID();
};


export const createPaymentSession = async (
  input: CreatePaymentSessionInput,
  baseUrl?: string
): Promise<{ session: PaymentSession; checkoutUrl: string }> => {
  // Ensure this function only runs on the server
  if (typeof window !== 'undefined') {
    throw new Error('createPaymentSession can only be called on the server side');
  }

  if (!isPaychanguConfigured()) {
    throw new Error('Paychangu is not properly configured');
  }

  try {
    const appBaseUrl = baseUrl || getAppBaseUrl();
    // Generate transactionId manually (unique identifier for our system)
    // This transactionId is used as tx_ref in Paychangu payload
    const transactionId = generateTransactionId();
    
    // Determine callback URL (where user is redirected after payment) based on orderId or bookingId
    // Note: Webhook URL should be configured separately in Paychangu dashboard
    let callbackUrl: string;
    if (input.bookingId) {
      callbackUrl = `${appBaseUrl}/book-confirmed?bookingId=${encodeURIComponent(input.bookingId)}&txRef=${encodeURIComponent(transactionId)}`;
    } else if (input.orderId) {
      callbackUrl = `${appBaseUrl}/order-confirmed?orderId=${encodeURIComponent(input.orderId)}&txRef=${encodeURIComponent(transactionId)}`;
    } else {
      // Fallback to payment status page if neither is provided
      callbackUrl = `${appBaseUrl}/payment/status?txRef=${encodeURIComponent(transactionId)}`;
    }
    
    // Return URL for cancellations/failed attempts
    // Use the same as callback URL for simplicity
    const returnUrl = callbackUrl;
    
    // Extract first name and last name
    let firstName = input.firstName || '';
    let lastName = input.lastName || '';
    
    // Fall back to splitting customerName if firstName/lastName not provided
    if (!firstName && !lastName && input.customerName) {
      const parts = input.customerName.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
    
    // Prepare Paychangu API request payload
    // According to Paychangu API: tx_ref should be our transaction_id
    //make sure amount is to 2 decimal places
    const payload = {
      amount: input.amount?.toFixed(2),
      currency: input.currency || 'MWK',
      tx_ref: transactionId, // Use transactionId as tx_ref (as per Paychangu API)
      callback_url: callbackUrl,
      return_url: returnUrl,
      first_name: firstName,
      last_name: lastName,
      email: input.customerEmail,
    };

    // Call Paychangu API to initiate payment
    let response: Response;
    try {
      response = await fetch(`${paychanguConfig.baseUrl}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });
    } catch (fetchError) {
      console.error('Network error calling Paychangu API:', fetchError);
      throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to payment service'}`);
    }

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json() as Record<string, unknown>;
      } catch (parseError) {
        console.error('Error parsing Paychangu error response:', parseError);
      }
      const errorMessage = (errorData.message as string) || (errorData.error as string) || ((errorData.data as Record<string, unknown>)?.message as string) || `Paychangu API error: ${response.status} ${response.statusText}`;
      console.error('Paychangu API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        payload: { ...payload, tx_ref: '[REDACTED]' },
      });
      throw new Error(errorMessage);
    }

    let result: Record<string, unknown>;
    try {
      result = await response.json() as Record<string, unknown>;
    } catch (parseError) {
      console.error('Error parsing Paychangu response:', parseError);
      throw new Error('Invalid response from payment service');
    }

    // Extract checkout URL and txRef from Paychangu response
    // Response structure can be: { status, message, data: { checkout_url, data: { tx_ref, ... } } }
    // Or simpler: { checkout_url, tx_ref, ... }
    const responseData = result?.data as PaychanguPaymentInitiationData | Record<string, unknown> | undefined;
    
    // Try multiple paths for checkout_url
    let checkoutUrl: string | undefined;
    if (responseData && typeof responseData === 'object') {
      checkoutUrl = (responseData as PaychanguPaymentInitiationData).checkout_url as string | undefined;
      if (!checkoutUrl) {
        checkoutUrl = (result?.checkout_url as string) || ((result?.data as Record<string, unknown>)?.checkout_url as string);
      }
    } else {
      checkoutUrl = (result?.checkout_url as string);
    }
    
    if (!checkoutUrl || typeof checkoutUrl !== 'string') {
      console.error('Paychangu response missing checkout_url. Full response:', JSON.stringify(result, null, 2));
      throw new Error('No checkout URL received from Paychangu. Please check payment service configuration.');
    }

    // Extract txRef from nested data structure
    // Try: result.data.data.tx_ref (nested) or result.data.tx_ref or result.tx_ref
    let responseTxRef: string | undefined;
    if (responseData && typeof responseData === 'object') {
      const nestedData = (responseData as PaychanguPaymentInitiationData).data;
      if (nestedData && typeof nestedData === 'object') {
        responseTxRef = (nestedData as { tx_ref?: string }).tx_ref;
      }
      if (!responseTxRef) {
        responseTxRef = (responseData as Record<string, unknown>).tx_ref as string | undefined;
      }
    }
    if (!responseTxRef) {
      responseTxRef = (result?.tx_ref as string) || ((result?.data as Record<string, unknown>)?.tx_ref as string);
    }
    
    if (!responseTxRef || typeof responseTxRef !== 'string') {
      console.warn('Paychangu response missing tx_ref, using transactionId from request payload. Full response:', JSON.stringify(result, null, 2));
    }

    // Use transactionId as txRef (we sent transactionId as tx_ref in payload)
    // Paychangu should return the same tx_ref we sent
    const finalTxRef = transactionId; // Our transactionId is the tx_ref
    
    // Verify that the txRef from response matches what we sent (for security)
    if (responseTxRef && responseTxRef !== transactionId) {
      console.warn('txRef mismatch: sent', transactionId, 'received', responseTxRef, '- using sent value as authoritative');
    }

    // Create payment session data
    // Note: transactionId is used as tx_ref in Paychangu API
    const session: PaymentSession = {
      txRef: finalTxRef, // Transaction reference (same as transactionId, used in Paychangu API)
      transactionId, // Transaction ID created manually (unique identifier for our system, also used as tx_ref)
      orderId: input.orderId,
      bookingId: input.bookingId,
      amount: input.amount,
      currency: input.currency || 'MWK',
      status: PaymentSessionStatus.PENDING,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      metadata: input.metadata,
      createdAt: new Date(),
    };

    return { session, checkoutUrl };
  } catch (error) {
    console.error('Error creating payment session:', error);
    throw error;
  }
};

export const verifyPaymentSession = async (
  txRef: string
): Promise<PaymentVerificationResult | null> => {
  // Ensure this function only runs on the server
  if (typeof window !== 'undefined') {
    throw new Error('verifyPaymentSession can only be called on the server side');
  }

  if (!isPaychanguConfigured()) {
    throw new Error('Paychangu is not properly configured');
  }

  try {
    // Call Paychangu API to verify transaction
    const verification = await fetch(
      `${paychanguConfig.baseUrl}/verify-payment/${txRef}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': getAuthHeader(),
        },
      }
    );

    if (!verification.ok) {
      console.error('Payment verification failed:', verification.status, verification.statusText);
      return null;
    }

    const result = await verification.json() as PaychanguPaymentVerificationResponse;

    if (!result || !result.data) {
      return null;
    }

    const data = result.data;

    // Map Paychangu response to our PaymentVerificationResult
    const verificationResult: PaymentVerificationResult = {
      txRef: data.tx_ref,
      transactionId: data.reference, // Paychangu uses 'reference' as transaction ID
      status: data.status === 'success' ? 'success' : data.status === 'failed' ? 'failed' : 'pending',
      amount: data.amount,
      currency: data.currency,
      customerEmail: data.customer.email,
      customerName: data.customer.first_name && data.customer.last_name 
        ? `${data.customer.first_name} ${data.customer.last_name}` 
        : data.customer.first_name || data.customer.last_name || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    // Map payment method from authorization channel
    if (data.authorization?.channel) {
      const channel = data.authorization.channel.toLowerCase();
      if (channel.includes('card')) {
        verificationResult.paymentMethod = PaymentMethod.CARD;
      } else if (channel.includes('mobile') || channel.includes('momo')) {
        verificationResult.paymentMethod = PaymentMethod.MOBILE_MONEY;
      } else if (channel.includes('bank') || channel.includes('transfer')) {
        verificationResult.paymentMethod = PaymentMethod.BANK_TRANSFER;
      }
    }

    // Extract orderId and bookingId from meta
    if (data.meta) {
      if (typeof data.meta === 'object' && data.meta !== null) {
        const meta = data.meta as Record<string, unknown>;
        verificationResult.orderId = meta.orderId as string | undefined;
        verificationResult.bookingId = meta.bookingId as string | undefined;
        verificationResult.metadata = meta;
      }
    }

    // Add charges if available
    if (data.charges) {
      verificationResult.charges = data.charges;
    }

    // Add completedAt from authorization
    if (data.authorization?.completed_at) {
      verificationResult.completedAt = data.authorization.completed_at;
    }

    return verificationResult;
  } catch (error) {
    console.error('Error verifying payment session:', error);
    return null;
  }
};
