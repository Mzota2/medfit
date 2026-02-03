/**
 * Payment status page - server wrapper.
 *
 * Renders the client payment status component inside Suspense so
 * `useSearchParams` can be used safely.
 */

import React, { Suspense } from 'react';
import PaymentStatusPageClient from './PaymentStatusPageClient';

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background-secondary">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-text-secondary">Verifying payment status...</p>
          </div>
        </div>
      }
    >
      <PaymentStatusPageClient />
    </Suspense>
  );
}


