/**
 * Reusable payment confirmation component
 * Handles payment status display, loading states, and common layout
 */

'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { Button, Loading } from '@/components/ui';

export interface PaymentConfirmationProps {
  // Payment verification
  txRef: string | null;
  onVerifyPayment?: (txRef: string) => Promise<void>;
  
  // Status
  paymentStatus: 'success' | 'failed' | 'pending' | null;
  paymentError: string | null;
  setPaymentStatus: (status: 'success' | 'failed' | 'pending' | null) => void;
  setPaymentError: (error: string | null) => void;
  
  // Loading state
  loading: boolean;
  loadingMessage?: string;
  
  // Not found state
  notFound: boolean;
  notFoundTitle?: string;
  notFoundActionLabel?: string;
  notFoundActionHref?: string;
  
  // Success state
  successTitle: string;
  successMessage: string;
  defaultStatus?: 'paid' | 'pending' | 'failed'; // Default status if no txRef
  
  // Children for custom content
  children: ReactNode;
  
  // Action buttons
  primaryAction?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  tertiaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  txRef,
  onVerifyPayment,
  paymentStatus,
  paymentError,
  setPaymentStatus,
  setPaymentError,
  loading,
  loadingMessage = 'Loading details...',
  notFound,
  notFoundTitle = 'Not Found',
  notFoundActionLabel = 'Return to Home',
  notFoundActionHref = '/',
  successTitle,
  successMessage,
  defaultStatus,
  children,
  primaryAction,
  secondaryAction,
  tertiaryAction,
}) => {
  // Default verify payment function
  const verifyPayment = async (ref: string) => {
    try {
      const response = await fetch(`/api/payments/verify?txRef=${encodeURIComponent(ref)}`);
      const result = await response.json();
      
      if (response.ok && result.success && result.data) {
        setPaymentStatus(result.data.status === 'success' ? 'success' : result.data.status === 'failed' ? 'failed' : 'pending');
      } else {
        setPaymentStatus('pending');
        setPaymentError(result.message || 'Unable to verify payment status');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setPaymentStatus('pending');
      setPaymentError('Failed to verify payment status');
    }
  };

  // Verify payment on mount if txRef is provided
  useEffect(() => {
    if (txRef) {
      if (onVerifyPayment) {
        onVerifyPayment(txRef);
      } else {
        verifyPayment(txRef);
      }
    }
  }, [txRef]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Loading size="lg" className="mb-4" />
          <p className="text-text-secondary text-sm sm:text-base">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">{notFoundTitle}</h1>
          <Link href={notFoundActionHref}>
            <Button>{notFoundActionLabel}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Determine payment status
  const isPaymentSuccessful = paymentStatus === 'success' || (!txRef && defaultStatus === 'paid');
  const isPaymentFailed = paymentStatus === 'failed';
  const isPaymentPending = paymentStatus === 'pending' || (txRef && !paymentStatus);

  return (
    <div className="min-h-screen bg-background-secondary py-6 sm:py-12 lg:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success/Failure Message */}
        <div className="bg-card rounded-xl shadow-xl p-4 sm:p-6 lg:p-8 text-center mb-6 sm:mb-8">
          {isPaymentSuccessful && (
            <>
              {/* Animated Success Icon */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 relative">
                {/* Animated checkmark with scale-in animation */}
                <div className="absolute inset-0 bg-success/20 rounded-full animate-ping opacity-75"></div>
                <svg 
                  className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 text-success relative z-10 animate-scale-in" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">{successTitle}</h1>
              <p className="text-base sm:text-lg text-text-secondary mb-6 sm:mb-8 px-2">
                {successMessage}
              </p>
            </>
          )}
          
          {isPaymentFailed && (
            <>
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">Payment Failed</h1>
              <p className="text-base sm:text-lg text-text-secondary mb-6 sm:mb-8 px-2">
                Your request was created but payment could not be processed. Please try again or contact support.
              </p>
              {paymentError && (
                <p className="text-sm text-destructive mb-4 px-2">{paymentError}</p>
              )}
            </>
          )}
          
          {isPaymentPending && (
            <>
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Loading size="lg" />
              </div>
              
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">Verifying Payment...</h1>
              <p className="text-base sm:text-lg text-text-secondary mb-6 sm:mb-8 px-2">
                Please wait while we verify your payment status.
              </p>
            </>
          )}

          {/* Custom Content */}
          <div className="text-left">
            {children}
          </div>

          {/* Action Buttons */}
          {(primaryAction || secondaryAction || tertiaryAction) && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-6 sm:mt-8">
              {secondaryAction && (
                <Link href={secondaryAction.href} className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    {secondaryAction.label}
                  </Button>
                </Link>
              )}
              {tertiaryAction && (
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto"
                  onClick={tertiaryAction.onClick}
                  disabled={tertiaryAction.disabled}
                >
                  {tertiaryAction.label}
                </Button>
              )}
              {primaryAction && (
                <Link href={primaryAction.href} className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto">
                    {primaryAction.label}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

