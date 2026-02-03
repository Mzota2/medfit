/**
 * Date, currency, and formatting utilities
 */

/**
 * Format date to readable string
 */
export const formatDate = (date: Date | string, locale: string = 'en-US'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Validate date is valid
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
};

/**
 * Format date and time
 */
export const formatDateTime = (date: Date | string, locale: string = 'en-US'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Validate date is valid
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(dateObj);
};

/**
 * Format currency
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'MWK',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Format number with commas
 */
export const formatNumber = (value: number, locale: string = 'en-US'): string => {
  return new Intl.NumberFormat(locale).format(value);
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  return formatDate(dateObj);
};

/**
 * Format payment method name, defaulting to "Paychangu" if unknown or empty
 */
export const formatPaymentMethod = (paymentMethod: string | undefined | null): string => {
  if (!paymentMethod || paymentMethod.toLowerCase() === 'unknown' || paymentMethod.trim() === '') {
    return 'Paychangu';
  }
  return paymentMethod;
};

/**
 * Generate order number
 */
export const generateOrderNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
};

/**
 * Generate booking number
 */
export const generateBookingNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `BK-${timestamp}-${random}`;
};

