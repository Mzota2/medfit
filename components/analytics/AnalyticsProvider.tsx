/**
 * Analytics Provider Component
 * Provides analytics context and tracking functionality
 */

'use client';

import React, { createContext, useContext, useState } from 'react';

interface AnalyticsContextType {
  trackEvent: (eventName: string, properties?: Record<string, unknown>) => void;
  trackPageView: (path: string) => void;
  isEnabled: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
};

interface AnalyticsProviderProps {
  children: React.ReactNode;
  trackingId?: string;
  enabled?: boolean;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  trackingId,
  enabled = false,
}) => {
  const [isEnabled] = useState(() => enabled && !!trackingId);

  const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
    if (!isEnabled) return;
    
    // Analytics tracking implementation
    console.log('Analytics Event:', eventName, properties);
  };

  const trackPageView = (path: string) => {
    if (!isEnabled) return;
    
    // Analytics page view tracking
    console.log('Analytics Page View:', path);
  };

  return (
    <AnalyticsContext.Provider value={{ trackEvent, trackPageView, isEnabled }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

