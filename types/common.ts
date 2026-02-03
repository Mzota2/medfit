/**
 * Common types and utilities shared across the system
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Base metadata fields for all Firestore documents
 */
export interface BaseDocument {
  id?: string;
  businessId?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * Timestamp conversion helpers
 */
export type FirestoreTimestamp = Timestamp | Date;

/**
 * Address information
 */
export interface Address {
  id: string;
  label: string; // e.g., "Home", "Work"
  phone?: string; // Optional, for contact at this address
  areaOrVillage: string; // Primary locality, e.g. "Area 25", "Chilinde"
  traditionalAuthority?: string; // e.g., "TA Kabudula", "TA Kaphuka"
  district: string; // e.g., "Lilongwe", "Blantyre"
  nearestTownOrTradingCentre?: string; // e.g., "Lilongwe", "Ntcheu"
  region: 'Northern' | 'Central' | 'Southern';
  country: 'Malawi';
  directions?: string; // Free-form, e.g., "near TA's office", "behind the market"
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault?: boolean;
}


/**
 * Contact information
 */
export interface ContactInfo {
  email: string;
  phone?: string;
  website?: string;
  socialMedia?: SocialMedia[];
}

export interface SocialMedia {
  platform: string;
  url: string;
  icon?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit: number;
  lastDocId?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  lastDocId?: string;
  total?: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

