/**
 * User roles and authentication types
 */

import { BaseDocument } from './common';
import { PolicyAcceptance } from './policy';

/**
 * User roles enforced via Firebase Auth custom claims
 */
export enum UserRole {
  CUSTOMER = 'customer',
  STAFF = 'staff',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

/**
 * Custom claims structure for Firebase Auth tokens
 */
export interface CustomClaims {
  role: UserRole;
  businessId?: string;
}


export interface CustomerAddress {
  id: string;
  label: string; // e.g., "Home", "Work"
  recipientName?: string; // Optional, for person at this address
  phone?: string; // Optional, for contact at this address
  addressType: 'physical' | 'post_office_box'; // Physical address or PO Box
  // Physical address fields
  areaOrVillage?: string; // Primary locality, e.g. "Area 25", "Chilinde" (required for physical)
  traditionalAuthority?: string; // e.g., "TA Kabudula", "TA Kaphuka"
  district: string; // e.g., "Lilongwe", "Blantyre"
  nearestTownOrTradingCentre?: string; // e.g., "Lilongwe", "Ntcheu"
  region: 'Northern' | 'Central' | 'Southern';
  country: 'Malawi';
  directions?: string; // Free-form, e.g., "near TA's office", "behind the market"
  // Post Office Box fields
  postOfficeBox?: string; // PO Box number (required for post_office_box)
  postOfficeName?: string; // Name of the post office
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault?: boolean;
}

/**
 * Customer preferences
 */
export interface CustomerPreferences {
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  language?: string;
  currency?: string;
  defaultDeliveryProviderId?: string; // Default delivery provider for orders
}

/**
 * Admin permissions (granular access control)
 */
export interface AdminPermissions {
  canManageOrders?: boolean;
  canManageBookings?: boolean;
  canManageInventory?: boolean;
  canManageCustomers?: boolean;
  canManageSettings?: boolean;
  canViewAnalytics?: boolean;
  canManageAdmins?: boolean;
}


/**
 * Unified User type - single type for all user roles
 * This simplifies database management, sign up, and login
 */
export interface User extends BaseDocument {
  // Firebase Auth UID
  uid: string;
  
  // Basic profile information (common to all roles)
  email: string;
  firstName?: string; // First name for orders, bookings, payments
  lastName?: string; // Last name for orders, bookings, payments
  displayName?: string; // Full display name (optional, used for Google signup and UI display)
  phone?: string;
  photoURL?: string;
  
  // Role - determines user type and access level
  role: UserRole;
  
  // Customer-specific fields (only populated for customers)
  addresses?: CustomerAddress[];
  defaultAddressId?: string;
  acceptedPolicyVersions?: PolicyAcceptance[];
  preferences?: CustomerPreferences;
  
  // Admin/Staff-specific fields (only populated for admins/staff)
  permissions?: AdminPermissions;
  position?: string; // Job title/position (e.g., "CEO", "Manager", "Developer")
  image?: string; // Profile image URL for team display
  
  // Business association (for multi-business scenarios)
  businessId?: string;
  
  // Account status
  isActive?: boolean;
  emailVerified?: boolean;
  verifyAccountToken?: string;
  resetPasswordToken?: string;
  resetPasswordTokenExpiresAt?: Date | string;
  verifyAccountTokenExpiresAt?: Date | string;
  lastLoginAt?: Date | string;
  
  // 2FA fields
  requires2FASetup?: boolean; // Flag to indicate admin needs to set up 2FA
  twoFactorEnabled?: boolean; // Whether 2FA is enabled
}

/**
 * Type guards for user roles
 */
export const isCustomer = (user: User): boolean => {
  return user.role === UserRole.CUSTOMER;
};

export const isAdmin = (user: User): boolean => {
  return user.role === UserRole.ADMIN;
};

export const isStaff = (user: User): boolean => {
  return user.role === UserRole.STAFF;
};

export const isSuperAdmin = (user: User): boolean => {
  return user.role === UserRole.SUPER_ADMIN;
};

export const isAdminOrStaff = (user: User): boolean => {
  return user.role === UserRole.ADMIN || user.role === UserRole.STAFF;
};

/**
 * Helper to create a user object for sign up
 */
export interface CreateUserInput {
  uid: string;
  email: string;
  firstName?: string; // Optional on backend (for Google signup), required on frontend
  lastName?: string; // Optional on backend (for Google signup), required on frontend
  displayName?: string; // Optional, used for Google signup and UI display
  phone?: string;
  photoURL?: string;
  emailVerified?: boolean;
  role: UserRole;
  position?: string; // Job title/position for admin/staff
  image?: string; // Profile image URL for admin/staff
}

export const createUser = (input: CreateUserInput): Omit<User, keyof BaseDocument> => {
  const baseUser: Omit<User, keyof BaseDocument> = {
    uid: input.uid,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    displayName: input.displayName,
    phone: input.phone,
    photoURL: input.photoURL,
    role: input.role,
    isActive: true,
    emailVerified: input.emailVerified || false,
  };

  // Add role-specific defaults
  if (input.role === UserRole.CUSTOMER) {
    baseUser.addresses = [];
    baseUser.preferences = {
      notifications: {
        email: true,
        push: false,
        sms: false,
      },
    };
  } else if (input.role === UserRole.ADMIN || input.role === UserRole.STAFF) {
    // Default admin permissions - all enabled
    baseUser.permissions = {
      canManageOrders: true,
      canManageBookings: true,
      canManageInventory: true,
      canManageCustomers: true,
      canManageSettings: input.role === UserRole.ADMIN,
      canViewAnalytics: true,
      canManageAdmins: input.role === UserRole.ADMIN,
    };
  }

  return baseUser;
};

