/**
 * Utility functions for extracting and handling user names
 */

/**
 * Extract first name and last name from display name
 * Handles various formats: "John Doe", "John", "John Michael Doe", etc.
 */
export const extractNameFromDisplayName = (displayName: string | null | undefined): { firstName: string; lastName: string } => {
  if (!displayName || !displayName.trim()) {
    return { firstName: '', lastName: '' };
  }

  const parts = displayName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    // Only one name provided, treat as first name
    return { firstName: parts[0], lastName: '' };
  }
  
  // First part is first name, rest is last name
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  
  return { firstName, lastName };
};

/**
 * Combine first name and last name into display name
 */
export const combineNameToDisplayName = (firstName?: string, lastName?: string): string | undefined => {
  if (!firstName && !lastName) {
    return undefined;
  }
  
  const parts: string[] = [];
  if (firstName) parts.push(firstName);
  if (lastName) parts.push(lastName);
  
  return parts.join(' ').trim() || undefined;
};

/**
 * Get display name for UI (prefers displayName, falls back to firstName + lastName)
 */
export const getDisplayName = (user: { displayName?: string; firstName?: string; lastName?: string } | null | undefined): string => {
  if (!user) return 'User';
  
  if (user.displayName) {
    return user.displayName;
  }
  
  const parts: string[] = [];
  if (user.firstName) parts.push(user.firstName);
  if (user.lastName) parts.push(user.lastName);
  
  return parts.join(' ').trim() || 'User';
};

/**
 * Get full name for orders/bookings/payments (firstName + lastName, falls back to displayName)
 */
export const getFullName = (user: { firstName?: string; lastName?: string; displayName?: string } | null | undefined): string => {
  if (!user) return '';
  
  const parts: string[] = [];
  if (user.firstName) parts.push(user.firstName);
  if (user.lastName) parts.push(user.lastName);
  
  const fullName = parts.join(' ').trim();
  
  // If we have firstName and lastName, use them
  if (fullName) {
    return fullName;
  }
  
  // Fall back to displayName if available
  if (user.displayName) {
    return user.displayName;
  }
  
  return '';
};

