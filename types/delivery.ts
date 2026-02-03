/**
 * Delivery types with region and district pricing for Malawi
 */

import { BaseDocument } from './common';

/**
 * Malawi Regions
 */
export enum MalawiRegion {
  NORTHERN = 'Northern',
  CENTRAL = 'Central',
  SOUTHERN = 'Southern',
}

/**
 * Malawi Districts by Region
 */
export const MALAWI_DISTRICTS = {
  [MalawiRegion.NORTHERN]: [
    'Chitipa',
    'Karonga',
    'Likoma',
    'Mzimba',
    'Nkhata Bay',
    'Rumphi',
  ],
  [MalawiRegion.CENTRAL]: [
    'Dedza',
    'Dowa',
    'Kasungu',
    'Lilongwe',
    'Mchinji',
    'Nkhotakota',
    'Ntcheu',
    'Ntchisi',
    'Salima',
  ],
  [MalawiRegion.SOUTHERN]: [
    'Balaka',
    'Blantyre',
    'Chikwawa',
    'Chiradzulu',
    'Machinga',
    'Mangochi',
    'Mulanje',
    'Mwanza',
    'Neno',
    'Nsanje',
    'Phalombe',
    'Thyolo',
    'Zomba',
  ],
} as const;

/**
 * Delivery pricing structure
 */
export interface DeliveryPricing {
  // General/default price (applies if no region/district specific price)
  generalPrice?: number;
  
  // Region-specific pricing
  regionPricing?: Record<MalawiRegion, number>;
  
  // District-specific pricing (overrides region pricing)
  districtPricing?: Record<string, number>;
}

/**
 * Delivery provider/service
 */
export interface DeliveryProvider extends BaseDocument {
  name: string; // e.g., "Speed Courier", "CTS Courier"
  description?: string;
  isActive: boolean;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  pricing: DeliveryPricing;
  currency: string; // Default: 'MWK'
  estimatedDays?: {
    min: number;
    max: number;
  };
  trackingAvailable?: boolean;
}

/**
 * Delivery option for settings
 */
export interface DeliveryOption {
  enabled: boolean;
  defaultProviderId?: string;
  providers: string[]; // Array of provider IDs
  currency: string;
}

