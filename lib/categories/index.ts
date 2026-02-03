/**
 * Categories CRUD operations
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
import { Category } from '@/types/category';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';

/**
 * Get category by ID
 */
export const getCategoryById = async (categoryId: string): Promise<Category> => {
  const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
  const categorySnap = await getDoc(categoryRef);

  if (!categorySnap.exists()) {
    throw new NotFoundError('Category');
  }

  return { id: categorySnap.id, ...categorySnap.data() } as Category;
};

/**
 * Get categories with filters
 */
export const getCategories = async (options?: {
  type?: 'product' | 'service' | 'both';
  businessId?: string;
  limit?: number;
}): Promise<Category[]> => {
  const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
  let q = query(categoriesRef);

  // If type is 'both', don't filter by type (return all categories)
  // If type is 'product' or 'service', filter by that specific type
  if (options?.type && options.type !== 'both') {
    q = query(q, where('type', '==', options.type));
  }

  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }

  q = query(q, orderBy('name', 'asc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const querySnapshot = await getDocs(q);
  const categories = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Category[];

  return categories;
};

/**
 * Create category
 */
export const createCategory = async (
  category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>,
  businessId?: string
): Promise<string> => {
  if (!category.name || !category.slug || !category.type) {
    throw new ValidationError('Name, slug, and type are required');
  }

  // Automatically get businessId if not provided
  let finalBusinessId = businessId;
  if (!finalBusinessId) {
    const { getBusinessId } = await import('@/lib/businesses/utils');
    finalBusinessId = await getBusinessId();
  }

  const categoryData: Omit<Category, 'id'> = {
    ...category,
    businessId: finalBusinessId,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };

  const categoryRef = await addDoc(collection(db, COLLECTIONS.CATEGORIES), categoryData);
  return categoryRef.id;
};

/**
 * Update category
 */
export const updateCategory = async (
  categoryId: string,
  updates: Partial<Category>
): Promise<void> => {
  const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
  const categorySnap = await getDoc(categoryRef);

  if (!categorySnap.exists()) {
    throw new NotFoundError('Category');
  }

  await updateDoc(categoryRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete category
 */
export const deleteCategory = async (categoryId: string): Promise<void> => {
  const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
  const categorySnap = await getDoc(categoryRef);

  if (!categorySnap.exists()) {
    throw new NotFoundError('Category');
  }

  await deleteDoc(categoryRef);
};
