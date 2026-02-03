/**
 * Reset business data function
 * Deletes all business-related data collections (products, services, categories, promotions)
 * Does NOT delete orders, bookings, payments, ledger, users, or business settings
 */

import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { getBusinessId } from '@/lib/businesses/utils';
import { ValidationError, AuthenticationError } from '@/lib/utils/errors';
import { getUserRole } from '@/lib/firebase/auth';
import { UserRole } from '@/types/user';
import { auth } from '@/lib/firebase/config';

/**
 * Delete all documents from a collection
 * Uses batches to delete documents (Firestore batch limit is 500)
 */
async function deleteCollectionDocuments(collectionName: string, businessId?: string): Promise<number> {
  const collectionRef = collection(db, collectionName);
  
  // Build query - filter by businessId if provided
  let q = query(collectionRef);
  if (businessId) {
    q = query(collectionRef, where('businessId', '==', businessId));
  }
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return 0;
  }

  let deletedCount = 0;
  const docs = snapshot.docs;
  
  // Delete in batches of 500 (Firestore batch limit)
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    const batchDocs = docs.slice(i, i + 500);
    
    batchDocs.forEach((document) => {
      batch.delete(doc(db, collectionName, document.id));
      deletedCount++;
    });
    
    await batch.commit();
  }

  return deletedCount;
}

/**
 * Reset business data
 * Deletes products, services, categories, and promotions
 * Only admins can perform this action
 */
export const resetBusinessData = async (): Promise<{
  items: number;
  categories: number;
  promotions: number;
  services: number;
}> => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new AuthenticationError('You must be signed in to reset business data');
  }

  // Check if user is admin
  const role = await getUserRole(currentUser);
  if (role !== UserRole.ADMIN) {
    throw new AuthenticationError('Only administrators can reset business data');
  }

  // Get business ID (optional - some collections might not have businessId)
  const businessId = await getBusinessId();

  const results = {
    items: 0,
    categories: 0,
    promotions: 0,
    services: 0,
  };

  try {
    // Delete items (products)
    try {
      results.items = await deleteCollectionDocuments(COLLECTIONS.ITEMS, businessId);
    } catch (error) {
      console.error('Error deleting items:', error);
      // Continue with other collections
    }

    // Delete services (if they exist as a separate collection)
    // Note: services might be stored in items collection with a type field
    // Check if services collection exists by trying to query it
    try {
      // Check if services collection has documents
      const servicesRef = collection(db, 'services');
      const servicesQuery = businessId 
        ? query(servicesRef, where('businessId', '==', businessId))
        : query(servicesRef);
      const servicesSnapshot = await getDocs(servicesQuery);
      
      if (!servicesSnapshot.empty) {
        results.services = await deleteCollectionDocuments('services', businessId);
      }
    } catch (error) {
      console.error('Error deleting services:', error);
      // Services collection might not exist, that's okay
    }

    // Delete categories
    try {
      results.categories = await deleteCollectionDocuments(COLLECTIONS.CATEGORIES, businessId);
    } catch (error) {
      console.error('Error deleting categories:', error);
      // Continue with other collections
    }

    // Delete promotions
    try {
      results.promotions = await deleteCollectionDocuments(COLLECTIONS.PROMOTIONS, businessId);
    } catch (error) {
      console.error('Error deleting promotions:', error);
      // Continue with other collections
    }

    return results;
  } catch (error) {
    console.error('Error resetting business data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to reset business data';
    throw new ValidationError('Failed to reset business data');
  }
};

