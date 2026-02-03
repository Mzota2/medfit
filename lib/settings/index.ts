import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { Settings } from '@/types/settings';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';
import { mergeSettingsWithDefaults } from './defaults';

/**
 * Get settings (there should only be one settings document)
 */
export const getSettings = async (): Promise<Settings | null> => {
  const settingsRef = collection(db, COLLECTIONS.SETTINGS);
  const q = query(settingsRef, limit(1));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  const data = doc.data() as Partial<Settings>;
  // Merge with defaults to ensure all new fields are present
  return mergeSettingsWithDefaults({ id: doc.id, ...data }) as Settings;
};

/**
 * Get settings by ID
 */
export const getSettingsById = async (settingsId: string): Promise<Settings> => {
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, settingsId);
  const settingsSnap = await getDoc(settingsRef);
  
  if (!settingsSnap.exists()) {
    throw new NotFoundError('Settings');
  }
  
  return { id: settingsSnap.id, ...settingsSnap.data() } as Settings;
};

/**
 * Create settings (should only be called once)
 */
export const createSettings = async (
  settings: Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>,
  businessId?: string
): Promise<string> => {
  // Check if settings already exist
  const existingSettings = await getSettings();
  if (existingSettings) {
    throw new ValidationError('Settings already exist. Use update instead.');
  }
  
  if (!settings.delivery || !settings.payment || !settings.analytics) {
    throw new ValidationError('Delivery, payment, and analytics settings are required');
  }
  
  // Automatically get businessId if not provided
  let finalBusinessId = businessId || settings.businessId;
  if (!finalBusinessId) {
    const { getBusinessId } = await import('@/lib/businesses/utils');
    finalBusinessId = await getBusinessId();
  }
  
  // Merge with defaults to ensure all cost control fields are present
  const mergedSettings = mergeSettingsWithDefaults(settings);
  
  const settingsData: Omit<Settings, 'id'> = {
    ...mergedSettings,
    businessId: finalBusinessId,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };
  
  const settingsRef = await addDoc(collection(db, COLLECTIONS.SETTINGS), settingsData);
  return settingsRef.id;
};

/**
 * Update settings
 */
export const updateSettings = async (settingsId: string, updates: Partial<Settings>): Promise<void> => {
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, settingsId);
  const settingsSnap = await getDoc(settingsRef);
  
  if (!settingsSnap.exists()) {
    throw new NotFoundError('Settings');
  }
  
  await updateDoc(settingsRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Update or create settings (upsert)
 */
export const upsertSettings = async (
  settings: Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>,
  businessId?: string
): Promise<string> => {
  const existingSettings = await getSettings();
  
  // Merge with defaults to ensure all new fields are present
  const mergedSettings = mergeSettingsWithDefaults(settings);
  
  if (existingSettings) {
    // Preserve existing cost control settings if not provided
    const settingsToUpdate = {
      ...mergedSettings,
      // Preserve existing cost control settings if not explicitly provided
      realtime: settings.realtime || existingSettings.realtime || mergedSettings.realtime,
      notifications: settings.notifications || existingSettings.notifications || mergedSettings.notifications,
      ledger: settings.ledger || existingSettings.ledger || mergedSettings.ledger,
      documentCreation: settings.documentCreation || existingSettings.documentCreation || mergedSettings.documentCreation,
      performance: settings.performance || existingSettings.performance || mergedSettings.performance,
    };
    await updateSettings(existingSettings.id!, settingsToUpdate);
    return existingSettings.id!;
  } else {
    return await createSettings(mergedSettings, businessId);
  }
};

