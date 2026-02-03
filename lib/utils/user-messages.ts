/**
 * User-friendly error messages
 * Converts technical errors into user-friendly messages for display
 */

/**
 * Convert technical error to user-friendly message
 */
export const getUserFriendlyMessage = (error: unknown, fallback: string = 'An unexpected error occurred. Please try again.'): string => {
  if (!error) {
    return fallback;
  }

  // Handle Error instances
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Firebase Auth errors
    if (message.includes('auth/user-not-found') || message.includes('user-not-found')) {
      return 'No account found with this email address. Please check and try again.';
    }
    if (message.includes('auth/wrong-password') || message.includes('wrong-password')) {
      return 'Incorrect password. Please try again.';
    }
    if (message.includes('auth/email-already-in-use') || message.includes('email-already-in-use')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (message.includes('auth/weak-password')) {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    if (message.includes('auth/network-request-failed')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    if (message.includes('auth/too-many-requests')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (message.includes('auth/invalid-email')) {
      return 'Invalid email address. Please check and try again.';
    }

    // Firestore errors
    if (message.includes('permission-denied') || message.includes('permission denied')) {
      return 'You do not have permission to perform this action.';
    }
    if (message.includes('not-found') || message.includes('not found')) {
      return 'The requested item could not be found.';
    }
    if (message.includes('unavailable')) {
      return 'Service is temporarily unavailable. Please try again later.';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      // Return the error message if it's already user-friendly
      if (error.message && !error.message.includes('Error') && !error.message.includes('at ')) {
        return error.message;
      }
      return 'Please check your input and try again.';
    }

    // Order/Booking specific errors
    if (message.includes('cannot cancel')) {
      return error.message; // Usually user-friendly already
    }
    if (message.includes('status transition') || message.includes('invalid status')) {
      return 'This status change is not allowed. Please check the order/booking status.';
    }

    // Generic error patterns
    if (message.includes('failed') || message.includes('error')) {
      // If it's a technical error, use fallback
      if (message.includes('at ') || message.includes('stack')) {
        return fallback;
      }
      // Otherwise, try to make it user-friendly
      return error.message.replace(/error:/gi, '').trim() || fallback;
    }

    // Return the error message if it seems user-friendly
    if (error.message && !error.message.includes('at ') && !error.message.includes('Error:')) {
      return error.message;
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    // Check if it looks like a technical error
    if (error.includes('at ') || error.includes('Error:') || error.includes('TypeError')) {
      return fallback;
    }
    return error;
  }

  // Default fallback
  return fallback;
};

/**
 * Success messages for common actions
 */
export const SUCCESS_MESSAGES = {
  ORDER_UPDATED: 'Order updated successfully',
  ORDER_CANCELED: 'Order canceled successfully',
  ORDER_STATUS_UPDATED: 'Order status updated successfully',
  BOOKING_UPDATED: 'Booking updated successfully',
  BOOKING_CANCELED: 'Booking canceled successfully',
  BOOKING_STATUS_UPDATED: 'Booking status updated successfully',
  PRODUCT_SAVED: 'Product saved successfully',
  PRODUCT_DELETED: 'Product deleted successfully',
  SERVICE_SAVED: 'Service saved successfully',
  SERVICE_DELETED: 'Service deleted successfully',
  NOTES_SAVED: 'Notes saved successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  ITEM_DELETED: 'Item deleted successfully',
  CATEGORY_SAVED: 'Category saved successfully',
  PROMOTION_SAVED: 'Promotion saved successfully',
} as const;

/**
 * Error messages for common actions
 */
export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection and try again.',
  PERMISSION: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested item could not be found.',
  VALIDATION: 'Please check your input and try again.',
  SAVE_FAILED: 'Failed to save changes. Please try again.',
  DELETE_FAILED: 'Failed to delete. Please try again.',
  UPDATE_FAILED: 'Failed to update. Please try again.',
  LOAD_FAILED: 'Failed to load data. Please refresh the page.',
} as const;

