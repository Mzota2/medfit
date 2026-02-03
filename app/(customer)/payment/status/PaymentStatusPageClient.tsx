/**
 * Client implementation of the payment status page.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatting';

interface PaymentVerificationData {
  txRef: string;
  status: 'successful' | 'failed' | 'pending';
  amount?: number;
  currency?: string;
  payment_method?: string;
  orderId?: string;
  bookingId?: string;
  meta?: {
    orderId?: string;
    bookingId?: string;
  };
  metadata?: {
    orderId?: string;
    bookingId?: string;
    [key: string]: unknown;
  };
  transaction_id?: string;
  customer_email?: string;
}

export default function PaymentStatusPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const txRef = searchParams.get('txRef');
  
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<PaymentVerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!txRef) {
        setError('No transaction reference provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/payments/verify?txRef=${encodeURIComponent(txRef)}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to verify payment');
        }

        setPaymentData(result.data);
        
        // If payment is successful, redirect to appropriate confirmation page
        if (result.data?.status === 'successful') {
          // Check both top-level and metadata for bookingId/orderId
          const bookingId = result.data?.bookingId || result.data?.metadata?.bookingId;
          const orderId = result.data?.orderId || result.data?.metadata?.orderId;
          
          if (bookingId) {
            // Small delay to show success message, then redirect to booking confirmation
            setTimeout(() => {
              router.push(`/book-confirmed?bookingId=${bookingId}`);
            }, 2000);
          } else if (orderId) {
            // Small delay to show success message, then redirect to order confirmation
            setTimeout(() => {
              router.push(`/order-confirmed?orderId=${orderId}`);
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Error verifying payment:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to verify payment status';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [txRef, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-text-secondary">Verifying payment status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-secondary py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card rounded-lg shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-4">Verification Error</h1>
            <p className="text-lg text-text-secondary mb-8">{error}</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
              <Link href="/">
                <Button>Return to Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-background-secondary py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card rounded-lg shadow-xl p-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">No Payment Data</h1>
            <p className="text-lg text-text-secondary mb-8">
              Unable to retrieve payment information.
            </p>
            <Link href="/">
              <Button>Return to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isSuccessful = paymentData.status === 'successful';
  const isFailed = paymentData.status === 'failed';
  const isPending = paymentData.status === 'pending';

  return (
    <div className="min-h-screen bg-background-secondary py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card rounded-lg shadow-xl p-8 text-center">
          {/* Success State */}
          {isSuccessful && (
            <>
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-foreground mb-4">Payment Successful!</h1>
              <p className="text-lg text-text-secondary mb-8">
                Your payment has been processed successfully.
              </p>

              {paymentData.amount && paymentData.currency && (
                <div className="bg-background-secondary rounded-lg p-6 mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-text-secondary">Amount Paid</span>
                    <span className="text-2xl font-bold text-foreground">
                      {formatCurrency(paymentData.amount, paymentData.currency)}
                    </span>
                  </div>
                  {paymentData.transaction_id && (
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span className="text-text-secondary">Transaction ID</span>
                      <span className="font-mono text-foreground">{paymentData.transaction_id}</span>
                    </div>
                  )}
                </div>
              )}

              {(paymentData.meta?.bookingId || paymentData.bookingId) && (
                <div className="mb-8">
                  <p className="text-text-secondary mb-4">Redirecting to booking confirmation...</p>
                  <Link href={`/book-confirmed?bookingId=${paymentData.meta?.bookingId || paymentData.bookingId}`}>
                    <Button size="lg">View Booking Details</Button>
                  </Link>
                </div>
              )}
              
              {(paymentData.meta?.orderId || paymentData.orderId) && (
                <div className="mb-8">
                  <p className="text-text-secondary mb-4">Redirecting to order confirmation...</p>
                  <Link href={`/order-confirmed?orderId=${paymentData.meta?.orderId || paymentData.orderId}`}>
                    <Button size="lg">View Order Details</Button>
                  </Link>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/products">
                  <Button variant="outline" size="lg">Continue Shopping</Button>
                </Link>
              </div>
            </>
          )}

          {/* Failed State */}
          {isFailed && (
            <>
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-foreground mb-4">Payment Failed</h1>
              <p className="text-lg text-text-secondary mb-8">
                We were unable to process your payment. Please try again.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/checkout">
                  <Button size="lg">Try Again</Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" size="lg">Return to Home</Button>
                </Link>
              </div>
            </>
          )}

          {/* Pending State */}
          {isPending && (
            <>
              <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-warning animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-foreground mb-4">Payment Pending</h1>
              <p className="text-lg text-text-secondary mb-8">
                Your payment is being processed. Please wait for confirmation.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Check Status
                </Button>
                <Link href="/">
                  <Button variant="ghost">Return to Home</Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


