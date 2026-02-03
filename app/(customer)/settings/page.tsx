/**
 * Account settings page with account info, security, and billing sections.
 *
 * Server component wrapper that renders the client implementation inside a
 * Suspense boundary so `useSearchParams` can be used safely.
 */

import React, { Suspense } from 'react';
import SettingsPageClient from './SettingsPageClient';

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-text-secondary">Loading account settings...</p>
        </div>
      }
    >
      <SettingsPageClient />
    </Suspense>
  );
}


