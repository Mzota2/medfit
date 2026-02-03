/**
 * Booking confirmation page with success message and booking details
 */
import React, { Suspense } from 'react';
import BookConfirmedPageClient from './BookConfirmedPageClient';

export default function BookConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-text-secondary">Loading ...</p>
        </div>
      }
    >
      <BookConfirmedPageClient />
    </Suspense>
  );
}
