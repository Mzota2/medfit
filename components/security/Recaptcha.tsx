/**
 * reCAPTCHA component for client-side integration
 * Uses reCAPTCHA v3 (invisible)
 */

'use client';

import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render: (element: HTMLElement, options: { sitekey: string; callback?: (token: string) => void }) => number;
      reset: (widgetId: number) => void;
    };
  }
}

interface RecaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  action?: string;
}

export const Recaptcha: React.FC<RecaptchaProps> = ({ onVerify, onError, action = 'login' }) => {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (!siteKey) {
      console.warn('reCAPTCHA site key not configured');
      // In development, allow without reCAPTCHA
      if (process.env.NODE_ENV === 'development') {
        onVerify('dev-token');
      }
      return;
    }

    const executeRecaptcha = () => {
      if (cancelled) return;
      if (!window.grecaptcha) {
        setTimeout(executeRecaptcha, 100);
        return;
      }

      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(siteKey, { action })
          .then((token) => {
            onVerify(token);
          })
          .catch((error) => {
            console.error('reCAPTCHA error:', error);
            onError?.(error.message || 'reCAPTCHA verification failed');
          });
      });
    };

    // Check if script is already loaded
    if (window.grecaptcha && scriptLoadedRef.current) {
      executeRecaptcha();
      return;
    }

    // Load reCAPTCHA script if not already loaded
    if (!scriptLoadedRef.current) {
      const existingScript = document.querySelector(`script[src*="recaptcha/api.js"]`);
      if (existingScript) {
        scriptLoadedRef.current = true;
        executeRecaptcha();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        executeRecaptcha();
      };
      document.body.appendChild(script);
    }
    return () => {
      cancelled = true;
    };
  }, [siteKey, action, onVerify, onError]);

  // This component doesn't render anything visible (invisible reCAPTCHA v3)
  return null;
};

