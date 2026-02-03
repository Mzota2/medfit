/**
 * Analytics Tracking Utilities
 * Handles Google Analytics and other analytics tracking
 */

let trackingId: string | null = null;
let isEnabled = false;

/**
 * Set the Google Analytics tracking ID
 */
export const setTrackingId = (id: string | null) => {
  trackingId = id;
  isEnabled = !!id;
};

/**
 * Get the current tracking ID
 */
export const getTrackingId = (): string | null => {
  return trackingId;
};

/**
 * Check if analytics is enabled
 */
export const isAnalyticsEnabled = (): boolean => {
  return isEnabled && !!trackingId;
};

/**
 * Track a custom event
 */
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  if (!isEnabled || !trackingId) return;
  
  // Analytics event tracking implementation
  console.log('Analytics Event:', eventName, properties);
};

/**
 * Track a page view
 */
export const trackPageView = (path: string) => {
  if (!isEnabled || !trackingId) return;
  
  // Analytics page view tracking
  console.log('Analytics Page View:', path);
};

