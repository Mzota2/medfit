/**
 * Order confirmation page with success message and order details
 */
/**
 * Booking confirmation page with success message and booking details
 */
import React, { Suspense } from 'react';
import OrderConfirmedPageClient from './OrderConfirmedPageClient';

export default function OrderConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-text-secondary">Loading ...</p>
        </div>
      }
    >
      <OrderConfirmedPageClient />
    </Suspense>
  );
}

