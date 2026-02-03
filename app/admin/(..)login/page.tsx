'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { Logo } from '@/components/branding';
import { signIn, sendVerificationEmail, signInWithGoogle } from '@/lib/auth';
import { FcGoogle } from 'react-icons/fc';
import { auth } from '@/lib/firebase/config';
import { getUserRole } from '@/lib/firebase/auth';
import { Recaptcha } from '@/components/security/Recaptcha';

/**
 * Intercepting route for login when accessing admin pages
 * This shows as a modal/overlay when user tries to access admin routes without authentication
 */
export default function AdminLoginIntercept() {
  const router = useRouter();
  const { user, userRole } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');

  // Redirect if already logged in as admin
  React.useEffect(() => {
    if (user && (userRole === UserRole.ADMIN || userRole === UserRole.STAFF)) {
      // Close the modal by navigating to admin dashboard
      router.push('/admin');
    }
  }, [user, userRole, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const verifyRecaptchaToken = async (tokenToVerify: string) => {
        const response = await fetch('/api/auth/verify-recaptcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenToVerify }),
        });

        if (response.ok) return;

        const data: unknown = await response.json().catch(() => undefined);
        const errorMessage =
          data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : 'Security verification failed. Please try again.';
        throw new Error(errorMessage);
      };

      let token = recaptchaToken;
      if (!token) {
        const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
        if (siteKey && window.grecaptcha) {
          await new Promise<void>((resolve) => {
            window.grecaptcha.ready(async () => {
              try {
                token = await window.grecaptcha.execute(siteKey, { action: 'admin_login' });
                setRecaptchaToken(token);
              } catch (err) {
                console.error('reCAPTCHA execution error:', err);
              } finally {
                resolve();
              }
            });
          });
        }
      }

      if (process.env.NODE_ENV === 'production' && !token) {
        setError('Security verification is required');
        setIsLoading(false);
        return;
      }

      if (!token) {
        if (process.env.NODE_ENV === 'production') {
          setError('Security verification is required');
          setIsLoading(false);
          return;
        }
        token = 'dev-token';
      }

      await verifyRecaptchaToken(token);

      // Sign in using the auth function
      await signIn({ email, password });
      
      // Check if email is verified and get current user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('Failed to sign in. Please try again.');
        setIsLoading(false);
        return;
      }

      if (!currentUser.emailVerified) {
        try {
          await sendVerificationEmail(currentUser);
        } catch (emailError) {
          console.error('Failed to send verification email:', emailError);
        }
        router.push('/verify?from=admin');
        return;
      }

      // After sign in, directly fetch the user role from Firestore
      // This is more reliable than waiting for context to update
      try {
        const role = await getUserRole(currentUser);
        
        if (role === UserRole.ADMIN || role === UserRole.STAFF) {
          // Redirect to admin dashboard immediately
          router.push('/admin');
          // The useEffect will also handle this, but we do it here for immediate redirect
        } else {
          setError('You do not have admin access. Please contact your administrator.');
          setIsLoading(false);
        }
      } catch (roleError) {
        console.error('Error fetching user role:', roleError);
        // If we can't fetch role, wait a bit and let the useEffect handle it
        setTimeout(() => {
          if (userRole === UserRole.ADMIN || userRole === UserRole.STAFF) {
            router.push('/admin');
          } else {
            setError('Unable to verify admin access. Please try again.');
            setIsLoading(false);
          }
        }, 1000);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in. Please check your credentials.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      // Sign in with Google
      await signInWithGoogle();
      
      // Wait a moment for Firebase to complete the sign-in
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if email is verified and get current user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('Failed to sign in with Google. Please try again.');
        setIsLoading(false);
        return;
      }

      // Google accounts are automatically verified, so we can proceed
      // After sign in, directly fetch the user role from Firestore
      try {
        const role = await getUserRole(currentUser);
        
        if (role === UserRole.ADMIN || role === UserRole.STAFF) {
          // Redirect to admin dashboard immediately
          router.push('/admin');
        } else {
          setError('You do not have admin access. Please contact your administrator.');
          setIsLoading(false);
        }
      } catch (roleError) {
        console.error('Error fetching user role:', roleError);
        // If we can't fetch role, wait a bit and let the useEffect handle it
        setTimeout(() => {
          if (userRole === UserRole.ADMIN || userRole === UserRole.STAFF) {
            router.push('/admin');
          } else {
            setError('Unable to verify admin access. Please try again.');
            setIsLoading(false);
          }
        }, 1000);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Navigate back or to home
    router.push('/');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start sm:items-center justify-center px-4 py-4 sm:py-6 ">
        <div className="relative max-w-md w-full my-4 sm:my-0 bg-card rounded-lg shadow-lg p-4 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2 text-text-secondary hover:text-foreground transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="text-center mb-6 sm:mb-8">
          <Logo href="/" size="lg" className="justify-center mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5 sm:mb-2">Admin Login</h1>
          <p className="text-xs sm:text-sm text-text-secondary">Access the admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={<Mail className="w-5 h-5" />}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={<Lock className="w-5 h-5" />}
          />

          <Recaptcha
            onVerify={setRecaptchaToken}
            onError={(err) => {
              console.error('reCAPTCHA error:', err);
              if (process.env.NODE_ENV === 'production') {
                setError('Security verification failed. Please refresh and try again.');
              }
            }}
            action="admin_login"
          />

          <div className="flex flex-col gap-3 sm:gap-4">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <FcGoogle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm sm:text-base">Sign In with Google</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

