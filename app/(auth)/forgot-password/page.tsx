/**
 * Forgot password page
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { sendPasswordReset } from '@/lib/auth';
import { Logo } from '@/components/branding';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      await sendPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email. Please check your email address.';
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5 sm:mb-2">Forgot Password?</h1>
          <p className="text-center text-xs sm:text-sm text-text-secondary">
            Have you forgotten your password? Type your email and reset password
          </p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm sm:text-base text-foreground mb-4 sm:mb-6">
              Password reset link has been sent to <strong className="break-all">{email}</strong>. Please check your email.
            </p>
            <Link href="/login">
              <Button className="w-full sm:w-auto">Back to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="john@gmail.com"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Send Reset Link
            </Button>
          </form>
        )}

        <p className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-text-secondary">
          Remember your password?{' '}
          <Link href="/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

