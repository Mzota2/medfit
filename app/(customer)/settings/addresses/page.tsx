/**
 * Address management page for customers to manage multiple delivery addresses
 * 
 * This is a **server component wrapper** that renders the client component
 * within a Suspense boundary, which is required when using `useSearchParams`
 * in the App Router.
 */

import React, { Suspense } from 'react';
import AddressesPageClient from './AddressesPageClient';

export default function AddressesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-text-secondary">Loading addresses...</p>
        </div>
      }
    >
      <AddressesPageClient />
    </Suspense>
  );
}
