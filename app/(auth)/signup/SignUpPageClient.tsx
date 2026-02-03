/**
 * Sign up page client component
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Lock } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { Button, Input } from '@/components/ui';
import { signUp, signInWithGoogle } from '@/lib/auth';
import { Logo } from '@/components/branding';

export default function SignUpPageClient() {
  const router = useRouter();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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

    if (!acceptedTerms) {
      setError('Please accept the Terms & Conditions');
      return;
    }

    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }

    if (!lastName.trim()) {
      setError('Last name is required');
      return;
    }

    setIsLoading(true);

    try {
      await signUp({
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      // After signup, user will need to verify email
      // Verification email is already sent by signUp function
      router.push('/verify?from=signup');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account. Please try again.';
      console.log(errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google.';
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5 sm:mb-2">Create Your Account</h1>
          <p className="text-center text-xs sm:text-sm text-text-secondary">
            Create account and enjoy your online shopping experience
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="First Name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              icon={<User className="w-5 h-5" />}
            />
            <Input
              label="Last Name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              icon={<User className="w-5 h-5" />}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={<Mail className="w-5 h-5" />}
          />

          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            icon={<Phone className="w-5 h-5" />}
          />
          
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={<Lock className="w-5 h-5" />}
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            icon={<Lock className="w-5 h-5" />}
          />

          <div className="flex items-start gap-2 sm:gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 sm:mt-1 w-4 h-4 text-primary rounded focus:ring-primary shrink-0"
            />
            <label htmlFor="terms" className="text-xs sm:text-sm text-foreground">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="text-primary hover:text-primary-hover transition-colors">
                Terms & Conditions
              </Link>
              .
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Sign Up
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleGoogleSignIn}
            >
              <FcGoogle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm sm:text-base">Sign Up with Google</span>
            </Button>
          </div>
          
        </form>

        <p className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-text-secondary">
          You already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

