/**
 * Ledger utility functions for checking settings
 */

import { getSettings } from '@/lib/settings';

/**
 * Check if ledger auto-creation is enabled
 */
export const shouldCreateLedgerEntry = async (): Promise<boolean> => {
  try {
    const settings = await getSettings();
    const ledgerSettings = settings?.ledger;

    // If ledger is disabled or manual generation is enabled, don't auto-create
    if (!ledgerSettings?.enabled || ledgerSettings?.manualGeneration) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking ledger settings:', error);
    // On error, default to manual generation (don't auto-create)
    return false;
  }
};

/**
 * Check if manual ledger generation is enabled
 */
export const isManualGenerationEnabled = async (): Promise<boolean> => {
  try {
    const settings = await getSettings();
    return settings?.ledger?.manualGeneration ?? true; // Default to true
  } catch (error) {
    console.error('Error checking ledger settings:', error);
    return true; // Default to manual generation
  }
};

