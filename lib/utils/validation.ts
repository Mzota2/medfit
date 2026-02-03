/**
 * Common validation functions
 */

import { ValidationError } from './errors';
import { OrderStatus } from '@/types/order';
import { BookingStatus } from '@/types/booking';

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate email and throw if invalid
 */
export const validateEmail = (email: string, fieldName: string = 'email'): void => {
  if (!email) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  if (!isValidEmail(email)) {
    throw new ValidationError(`${fieldName} is invalid`, fieldName);
  }
};

/**
 * Validate required field
 */
export const validateRequired = (value: unknown, fieldName: string): void => {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
};

/**
 * Validate positive number
 */
export const validatePositiveNumber = (value: number, fieldName: string): void => {
  if (typeof value !== 'number' || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`, fieldName);
  }
};

/**
 * Validate non-negative number
 */
export const validateNonNegativeNumber = (value: number, fieldName: string): void => {
  if (typeof value !== 'number' || value < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative number`, fieldName);
  }
};

/**
 * Validate phone number format (basic)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validate phone number and throw if invalid
 */
export const validatePhoneNumber = (phone: string, fieldName: string = 'phone'): void => {
  if (phone && !isValidPhoneNumber(phone)) {
    throw new ValidationError(`${fieldName} is invalid`, fieldName);
  }
};

/**
 * Validate order status transition with flexible rules
 * Allows any status transition that makes logical sense
 */
export const isValidOrderStatusTransition = (
  currentStatus: string,
  newStatus: string
): boolean => {
  // If status hasn't changed, it's always valid
  if (currentStatus === newStatus) return true;

  // Define terminal states that cannot be changed from
  const terminalStates = [
    OrderStatus.COMPLETED,
    OrderStatus.CANCELED,
    OrderStatus.REFUNDED
  ];
  
  // Cannot transition from a terminal state
  if (terminalStates.includes(currentStatus as OrderStatus)) {
    return false;
  }
  
  // Special case: allow marking as completed from any non-terminal state
  if (newStatus === OrderStatus.COMPLETED) {
    return true;
  }
  
  // Allow any other transition except to terminal states without proper path
  // Terminal states can only be set through specific flows
  return !terminalStates.includes(newStatus as OrderStatus) || 
         (currentStatus === OrderStatus.PAID && newStatus === OrderStatus.REFUNDED) ||
         (currentStatus === OrderStatus.SHIPPED && newStatus === OrderStatus.COMPLETED);
};

/**
 * Validate booking status transition with flexible rules
 * Allows any status transition that makes logical sense
 */
export const isValidBookingStatusTransition = (
  currentStatus: string,
  newStatus: string
): boolean => {
  // If status hasn't changed, it's always valid
  if (currentStatus === newStatus) return true;

  // Define terminal states that cannot be changed from
  const terminalStates = [
    BookingStatus.COMPLETED,
    BookingStatus.CANCELED,
    BookingStatus.NO_SHOW,
    BookingStatus.REFUNDED
  ];
  
  // Cannot transition from a terminal state
  if (terminalStates.includes(currentStatus as BookingStatus)) {
    return false;
  }
  
  // Special case: allow marking as completed from any non-terminal state
  if (newStatus === BookingStatus.COMPLETED) {
    return true;
  }
  
  // Allow any other transition except to terminal states without proper path
  // Terminal states can only be set through specific flows
  return !terminalStates.includes(newStatus as BookingStatus) || 
         (currentStatus === BookingStatus.PAID && newStatus === BookingStatus.REFUNDED) ||
         (currentStatus === BookingStatus.CONFIRMED && newStatus === BookingStatus.COMPLETED);
};

