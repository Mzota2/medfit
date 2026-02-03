/**
 * Utility functions for handling redirects with returnUrl
 */

/**
 * Get the current pathname with query params for use as returnUrl
 */
export function getReturnUrl(pathname: string, searchParams?: URLSearchParams | null): string {
  const queryString = searchParams?.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

/**
 * Validate that a returnUrl is safe (internal path, not external)
 */
export function isValidReturnUrl(returnUrl: string | null | undefined): boolean {
  if (!returnUrl) return false;
  
  // Must start with / (internal path)
  if (!returnUrl.startsWith('/')) return false;
  
  // Must not be a protocol-relative or absolute URL
  if (returnUrl.startsWith('//') || returnUrl.startsWith('http://') || returnUrl.startsWith('https://')) {
    return false;
  }
  
  // Must not be javascript: or data: URLs
  if (returnUrl.toLowerCase().startsWith('javascript:') || returnUrl.toLowerCase().startsWith('data:')) {
    return false;
  }
  
  return true;
}

/**
 * Get the login URL with returnUrl parameter
 */
export function getLoginUrl(returnUrl?: string | null): string {
  if (returnUrl && isValidReturnUrl(returnUrl)) {
    return `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
  return '/login';
}

