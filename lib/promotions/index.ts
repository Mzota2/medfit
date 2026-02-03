/**
 * Promotions CRUD operations
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
import { Promotion, PromotionStatus } from '@/types/promotion';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';

/**
 * Get promotion by ID
 */
export const getPromotionById = async (promotionId: string): Promise<Promotion> => {
  const promotionRef = doc(db, COLLECTIONS.PROMOTIONS, promotionId);
  const promotionSnap = await getDoc(promotionRef);

  if (!promotionSnap.exists()) {
    throw new NotFoundError('Promotion');
  }

  return { id: promotionSnap.id, ...promotionSnap.data() } as Promotion;
};

/**
 * Get promotions with filters
 */
export const getPromotions = async (options?: {
  status?: PromotionStatus;
  businessId?: string;
  limit?: number;
}): Promise<Promotion[]> => {
  const promotionsRef = collection(db, COLLECTIONS.PROMOTIONS);
  let q = query(promotionsRef);

  if (options?.status) {
    q = query(q, where('status', '==', options.status));
  }

  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }

  q = query(q, orderBy('startDate', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Promotion[];
};

/**
 * Create promotion
 */
export const createPromotion = async (
  promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>,
  businessId?: string
): Promise<string> => {
  if (!promotion.name || !promotion.startDate || !promotion.endDate) {
    throw new ValidationError('Name, start date, and end date are required');
  }

  // Automatically get businessId if not provided
  let finalBusinessId = businessId;
  if (!finalBusinessId) {
    const { getBusinessId } = await import('@/lib/businesses/utils');
    finalBusinessId = await getBusinessId();
  }

  const promotionData: Omit<Promotion, 'id'> = {
    ...promotion,
    businessId: finalBusinessId,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };

  const promotionRef = await addDoc(collection(db, COLLECTIONS.PROMOTIONS), promotionData);
  return promotionRef.id;
};

/**
 * Update promotion
 */
export const updatePromotion = async (
  promotionId: string,
  updates: Partial<Promotion>
): Promise<void> => {
  const promotionRef = doc(db, COLLECTIONS.PROMOTIONS, promotionId);
  const promotionSnap = await getDoc(promotionRef);

  if (!promotionSnap.exists()) {
    throw new NotFoundError('Promotion');
  }

  await updateDoc(promotionRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete promotion
 */
export const deletePromotion = async (promotionId: string): Promise<void> => {
  const promotionRef = doc(db, COLLECTIONS.PROMOTIONS, promotionId);
  const promotionSnap = await getDoc(promotionRef);

  if (!promotionSnap.exists()) {
    throw new NotFoundError('Promotion');
  }

  await deleteDoc(promotionRef);
};

// Export utils
export * from './utils';