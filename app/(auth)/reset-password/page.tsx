import React, { Suspense } from 'react';
import ResetPasswordPageClient from './ResetPasswordPageClient';

export default function resetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-text-secondary">Loading Reset Password...</p>
        </div>
      }
    >
      <ResetPasswordPageClient />
    </Suspense>
  );
}