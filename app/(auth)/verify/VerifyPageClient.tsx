
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { sendVerificationEmail, verifyEmail, reloadUser } from '@/lib/auth';
import { auth } from '@/lib/firebase/config';
import { Logo } from '@/components/branding';

/**
 * Firebase email verification link expiration time
 * Firebase sets this to 3 days by default and it cannot be customized
 * Reference: https://firebase.google.com/docs/auth/web/email-auth#send_a_verification_email
 */
const FIREBASE_VERIFICATION_LINK_EXPIRATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

/**
 * Format time remaining in a human-readable format
 */
const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'Expired';
  
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = seconds % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

export default function VerifyPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [linkExpiresAt, setLinkExpiresAt] = useState<number | null>(null); // Timestamp when link expires
  const [timeRemaining, setTimeRemaining] = useState(0); // Time remaining until link expires
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const sendVerificationEmailHandler = React.useCallback(async () => {
    if (!user) return;

    setError('');
    setIsLoading(true);

    try {
      await sendVerificationEmail(user);
      setEmailSent(true);
      // Firebase verification links expire after 3 days (Firebase default, not customizable)
      const expirationTime = Date.now() + FIREBASE_VERIFICATION_LINK_EXPIRATION_MS;
      setLinkExpiresAt(expirationTime);
      // Store in localStorage to persist across page refreshes
      localStorage.setItem(`verification_expires_${user.uid}`, expirationTime.toString());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification email.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Handle verification from email link
  const handleVerifyFromLink = React.useCallback(async () => {
    if (!oobCode) return;

    setIsLoading(true);
    setError('');

    try {
      // applyActionCode automatically signs in the user if they're not already signed in
      await verifyEmail(oobCode);
      
      // Wait a moment for Firebase auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload user to get updated emailVerified status
      await reloadUser();
      
      // applyActionCode automatically signs the user in, so we just need to wait
      // for the auth state to propagate through onAuthStateChanged
      // Clear any stored expiration since verification is complete
      const currentUser = auth.currentUser;
      if (currentUser) {
        localStorage.removeItem(`verification_expires_${currentUser.uid}`);
      }
      
      // Show success state briefly, then redirect
      setIsLoading(false);
      setVerificationSuccess(true);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Show success for 1.5 seconds
      
      // Redirect to home - user is now automatically signed in and verified
      router.push('/');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify email. The link may have expired.';
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [oobCode, router]);

  useEffect(() => {
    if (oobCode && mode === 'verifyEmail') {
      handleVerifyFromLink();
    }
  }, [oobCode, mode, handleVerifyFromLink]);

  // Check if email is already verified
  useEffect(() => {
    if (user) {
      if (user.emailVerified) {
        router.push('/');
      } else if (!emailSent && !oobCode) {
        // Check if we're coming from login/signup (email already sent)
        const fromLogin = searchParams.get('from') === 'login';
        const fromSignup = searchParams.get('from') === 'signup';
        
        if (fromLogin || fromSignup) {
          // Email was already sent from login/signup, just mark as sent
          setEmailSent(true);
          // Set expiration time (Firebase default: 3 days from when email was sent)
          const expirationTime = Date.now() + FIREBASE_VERIFICATION_LINK_EXPIRATION_MS;
          setLinkExpiresAt(expirationTime);
          localStorage.setItem(`verification_expires_${user.uid}`, expirationTime.toString());
        } else {
          // Check if there's a stored expiration time from a previous email
          const storedExpiration = localStorage.getItem(`verification_expires_${user.uid}`);
          if (storedExpiration) {
            const expirationTimestamp = parseInt(storedExpiration, 10);
            if (expirationTimestamp > Date.now()) {
              // Link hasn't expired yet
              setEmailSent(true);
              setLinkExpiresAt(expirationTimestamp);
            } else {
              // Link has expired, clear it
              localStorage.removeItem(`verification_expires_${user.uid}`);
            }
          }
        }
        // No auto-send - user must manually click "Resend Verification Email"
      }
    } else {
      // Redirect to login if no user
      router.push('/login');
    }
  }, [user, emailSent, oobCode, router, searchParams]);

  // Timer for link expiration countdown
  useEffect(() => {
    if (linkExpiresAt && emailSent) {
      const updateCountdown = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((linkExpiresAt - now) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          // Link has expired
          setLinkExpiresAt(null);
          if (user) {
            localStorage.removeItem(`verification_expires_${user.uid}`);
          }
        }
      };
      
      // Update immediately
      updateCountdown();
      
      // Update every second
      const timer = setInterval(updateCountdown, 1000);
      return () => clearInterval(timer);
    }
  }, [linkExpiresAt, emailSent, user]);

  // Poll for email verification status
  useEffect(() => {
    if (!user || user.emailVerified || oobCode) return;

    const interval = setInterval(async () => {
      try {
        await reloadUser();
        // Auth state will update automatically via onAuthStateChanged
      } catch {
        // Silent fail - just continue polling
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [user, oobCode]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background-secondary dark:bg-background-tertiary flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6">
        <div className="text-center max-w-md w-full">
          <p className="text-sm sm:text-base text-text-secondary mb-4">Please sign in to verify your account.</p>
          <Link href="/login">
            <Button className="w-full sm:w-auto">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  // If coming from email link, show loading while verifying
  if (oobCode && mode === 'verifyEmail') {
    return (
      <div className="min-h-screen bg-background-secondary dark:bg-background-tertiary flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6">
        <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-4 sm:p-6 md:p-8 text-center">
          <div className="text-center mb-6 sm:mb-8">
            <Logo href="/" size="lg" className="justify-center mb-3 sm:mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5 sm:mb-2">
              {error ? 'Verification Failed' : verificationSuccess ? 'Email Verified!' : 'Verifying Email'}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              {error 
                ? 'There was an issue verifying your email address. The link may have expired.'
                : verificationSuccess
                  ? 'Your email has been verified! You are being signed in automatically...'
                  : 'Please wait while we verify your email address and sign you in...'}
            </p>
          </div>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm mb-4 sm:mb-6">
              {error}
            </div>
          )}
          {isLoading && !error && (
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
              <p className="text-xs sm:text-sm text-text-secondary">This will only take a moment...</p>
            </div>
          )}
          {verificationSuccess && !error && (
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-success/20 flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-secondary dark:bg-background-tertiary flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <Logo href="/" size="lg" className="justify-center mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5 sm:mb-2">Verify Your Email</h1>
          <p className="text-center text-xs sm:text-sm text-text-secondary">
            We&apos;ve sent a verification link to{' '}
            <strong className="text-foreground break-all">{user.email}</strong>. 
            Please check your email and click the link to verify your account.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm mb-4 sm:mb-6">
            {error}
          </div>
        )}

        {emailSent && (
          <div className="bg-success/10 border border-success/20 text-success px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm mb-4 sm:mb-6">
            <p>Verification email sent! Please check your inbox.</p>
            {timeRemaining > 0 && (
              <p className="mt-2 text-xs">
                Link expires in: {formatTimeRemaining(timeRemaining)}
              </p>
            )}
            {timeRemaining === 0 && linkExpiresAt && (
              <p className="mt-2 text-xs text-destructive">
                The verification link has expired. Please request a new one.
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={sendVerificationEmailHandler}
            disabled={isLoading}
            isLoading={isLoading}
          >
            {emailSent ? 'Resend Verification Email' : 'Send Verification Email'}
          </Button>

          <div className="text-center text-xs sm:text-sm text-text-secondary">
            <p className="mb-2">Didn&apos;t receive the email?</p>
            <ul className="list-disc list-inside space-y-1 text-left max-w-sm mx-auto text-xs sm:text-sm">
              <li>Check your spam/junk folder</li>
              <li>Make sure the email address is correct</li>
              <li>Wait a few minutes and try again</li>
            </ul>
          </div>

          <div className="pt-3 sm:pt-4 border-t border-border">
            <Link href="/login" className="block text-center text-xs sm:text-sm text-primary hover:text-primary-hover transition-colors">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
