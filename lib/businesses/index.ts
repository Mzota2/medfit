import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { business } from '@/types/business';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';

/**
 * Get business by ID
 */
export const getBusinessById = async (businessId: string): Promise<business> => {
  const businessRef = doc(db, COLLECTIONS.BUSINESS, businessId);
  const businessSnap = await getDoc(businessRef);
  
  if (!businessSnap.exists()) {
    throw new NotFoundError('Business');
  }
  
  return { id: businessSnap.id, ...businessSnap.data() } as business;
};

/**
 * Get all businesses (should only be one)
 */
export const getBusinesses = async (options?: {
  limit?: number;
}): Promise<business[]> => {
  const businessesRef = collection(db, COLLECTIONS.BUSINESS);
  let q = query(businessesRef, orderBy('createdAt', 'desc'));
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as business[];
};

/**
 * Get the single business document (first one)
 * Since there should only be one business, this returns the first document
 */
export const getBusiness = async (): Promise<business | null> => {
  const businesses = await getBusinesses({ limit: 1 });
  return businesses.length > 0 ? businesses[0] : null;
};

/**
 * Create business
 * Only one business should exist. If one already exists, throws an error.
 */
export const createBusiness = async (businessData: Omit<business, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!businessData.name) {
    throw new ValidationError('Business name is required');
  }
  
  // Check if a business already exists
  const existingBusiness = await getBusiness();
  if (existingBusiness) {
    throw new ValidationError('A business already exists. Please update the existing business instead.');
  }
  
  const data: Omit<business, 'id'> = {
    ...businessData,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };
  
  const businessRef = await addDoc(collection(db, COLLECTIONS.BUSINESS), data);
  return businessRef.id;
};

/**
 * Update business
 */
export const updateBusiness = async (businessId: string, updates: Partial<business>): Promise<void> => {
  const businessRef = doc(db, COLLECTIONS.BUSINESS, businessId);
  const businessSnap = await getDoc(businessRef);
  
  if (!businessSnap.exists()) {
    throw new NotFoundError('Business');
  }
  
  // Prepare update data - ensure nested objects are properly included
  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  
  // Explicitly set openingHours if it's in the updates (even if it's undefined, to clear it)
  if ('openingHours' in updates) {
    updateData.openingHours = updates.openingHours;
  }
  
  await updateDoc(businessRef, updateData);
};

/**
 * Delete business
 */
export const deleteBusiness = async (businessId: string): Promise<void> => {
  const businessRef = doc(db, COLLECTIONS.BUSINESS, businessId);
  const businessSnap = await getDoc(businessRef);
  
  if (!businessSnap.exists()) {
    throw new NotFoundError('Business');
  }
  
  await deleteDoc(businessRef);
};

