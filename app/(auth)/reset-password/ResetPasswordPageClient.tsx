/**
 * Reset password page
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { resetPassword } from '@/lib/auth';
import { Logo } from '@/components/branding';

export default function ResetPasswordPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get('oobCode');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!oobCode) {
      setError('Invalid reset link');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(oobCode, password);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password. The link may have expired.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-secondary dark:bg-background-tertiary flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <Logo href="/" size="lg" className="justify-center mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-3 sm:mb-4">Reset Password</h1>
          <p className="text-center text-xs sm:text-sm text-text-secondary mb-6 sm:mb-8">
            Safely reset your password and get hold of your account
          </p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm sm:text-base text-foreground mb-4 sm:mb-6">Password has been reset successfully. Redirecting to login...</p>
            <Link href="/login">
              <Button className="w-full sm:w-auto">Go to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
                {error}
              </div>
            )}

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Password"
            />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              disabled={!oobCode}
            >
              Submit Request
            </Button>
          </form>
        )}

        <p className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-text-secondary">
          <Link href="/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

