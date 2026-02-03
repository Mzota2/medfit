/**
 * User profile page with account info, order history, and bookings tabs.
 *
 * Server component wrapper that renders the client implementation in a
 * Suspense boundary so `useSearchParams` can be used safely.
 */

import React, { Suspense } from 'react';
import ProfilePageClient from './ProfilePageClient';

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-text-secondary">Loading profile...</p>
        </div>
      }
    >
      <ProfilePageClient />
    </Suspense>
  );
}


