import React, { Suspense } from 'react';
import VerifyPageClient from './VerifyPageClient';

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-text-secondary">Loading Verify...</p>
        </div>
      }
    >
      <VerifyPageClient />
    </Suspense>
  );
}