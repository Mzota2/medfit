/**
 * Delivery Providers CRUD operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { DeliveryProvider } from '@/types/delivery';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';

/**
 * Get delivery provider by ID
 */
export const getDeliveryProviderById = async (providerId: string): Promise<DeliveryProvider> => {
  const providerRef = doc(db, COLLECTIONS.DELIVERY_PROVIDERS, providerId);
  const providerSnap = await getDoc(providerRef);

  if (!providerSnap.exists()) {
    throw new NotFoundError('Delivery Provider');
  }

  return { id: providerSnap.id, ...providerSnap.data() } as DeliveryProvider;
};

/**
 * Get delivery providers with filters
 */
export const getDeliveryProviders = async (options?: {
  businessId?: string;
  isActive?: boolean;
  limit?: number;
}): Promise<DeliveryProvider[]> => {
  const providersRef = collection(db, COLLECTIONS.DELIVERY_PROVIDERS);
  let q = query(providersRef);

  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }

  if (options?.isActive !== undefined) {
    q = query(q, where('isActive', '==', options.isActive));
  }

  q = query(q, orderBy('name', 'asc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DeliveryProvider[];
};

/**
 * Create delivery provider
 */
export const createDeliveryProvider = async (
  provider: Omit<DeliveryProvider, 'id' | 'createdAt' | 'updatedAt'>,
  businessId?: string
): Promise<string> => {
  if (!provider.name) {
    throw new ValidationError('Provider name is required');
  }

  // Automatically get businessId if not provided
  let finalBusinessId = businessId || provider.businessId;
  if (!finalBusinessId) {
    const { getBusinessId } = await import('@/lib/businesses/utils');
    finalBusinessId = await getBusinessId();
  }

  const providerData: Omit<DeliveryProvider, 'id'> = {
    ...provider,
    businessId: finalBusinessId,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };

  const providerRef = await addDoc(collection(db, COLLECTIONS.DELIVERY_PROVIDERS), providerData);
  return providerRef.id;
};

/**
 * Update delivery provider
 */
export const updateDeliveryProvider = async (
  providerId: string,
  updates: Partial<DeliveryProvider>
): Promise<void> => {
  const providerRef = doc(db, COLLECTIONS.DELIVERY_PROVIDERS, providerId);
  const providerSnap = await getDoc(providerRef);

  if (!providerSnap.exists()) {
    throw new NotFoundError('Delivery Provider');
  }

  await updateDoc(providerRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete delivery provider
 */
export const deleteDeliveryProvider = async (providerId: string): Promise<void> => {
  const providerRef = doc(db, COLLECTIONS.DELIVERY_PROVIDERS, providerId);
  const providerSnap = await getDoc(providerRef);

  if (!providerSnap.exists()) {
    throw new NotFoundError('Delivery Provider');
  }

  await deleteDoc(providerRef);
};

