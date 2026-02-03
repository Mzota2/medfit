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
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { Policy, PolicyType } from '@/types/policy';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';

/**
 * Get policy by ID
 */
export const getPolicyById = async (policyId: string): Promise<Policy> => {
  const policyRef = doc(db, COLLECTIONS.POLICIES, policyId);
  const policySnap = await getDoc(policyRef);
  
  if (!policySnap.exists()) {
    throw new NotFoundError('Policy');
  }
  
  return { id: policySnap.id, ...policySnap.data() } as Policy;
};

/**
 * Get active policy by type (optionally filtered by businessId)
 */
export const getActivePolicyByType = async (
  type: PolicyType,
  businessId?: string
): Promise<Policy | null> => {
  const policiesRef = collection(db, COLLECTIONS.POLICIES);
  let q = query(
    policiesRef,
    where('type', '==', type),
    where('isActive', '==', true)
  );
  
  if (businessId) {
    q = query(q, where('businessId', '==', businessId));
  }
  
  q = query(q, orderBy('version', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Policy;
};

/**
 * Get all policies (optionally filtered by businessId)
 */
export const getPolicies = async (options?: {
  type?: PolicyType;
  activeOnly?: boolean;
  businessId?: string;
  limit?: number;
}): Promise<Policy[]> => {
  const policiesRef = collection(db, COLLECTIONS.POLICIES);
  let q = query(policiesRef);
  
  if (options?.type) {
    q = query(q, where('type', '==', options.type));
  }
  
  if (options?.activeOnly) {
    q = query(q, where('isActive', '==', true));
  }
  
  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }
  
  q = query(q, orderBy('version', 'desc'));
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Policy[];
};

/**
 * Create policy
 */
export const createPolicy = async (
  policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>,
  businessId?: string
): Promise<string> => {
  if (!policy.type || !policy.title || !policy.content) {
    throw new ValidationError('Type, title, and content are required');
  }
  
  // Automatically get businessId if not provided
  let finalBusinessId = businessId || policy.businessId;
  if (!finalBusinessId) {
    const { getBusinessId } = await import('@/lib/businesses/utils');
    finalBusinessId = await getBusinessId();
  }
  
  // If this is set to active, deactivate other policies of the same type for the same business
  if (policy.isActive) {
    const existingPolicies = await getPolicies({ type: policy.type, activeOnly: true, businessId: finalBusinessId });
    for (const existingPolicy of existingPolicies) {
      await updatePolicy(existingPolicy.id!, { isActive: false });
    }
  }
  
  const policyData: Omit<Policy, 'id'> = {
    ...policy,
    businessId: finalBusinessId,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };
  
  const policyRef = await addDoc(collection(db, COLLECTIONS.POLICIES), policyData);
  return policyRef.id;
};

/**
 * Update policy
 */
export const updatePolicy = async (policyId: string, updates: Partial<Policy>): Promise<void> => {
  const policyRef = doc(db, COLLECTIONS.POLICIES, policyId);
  const policySnap = await getDoc(policyRef);
  
  if (!policySnap.exists()) {
    throw new NotFoundError('Policy');
  }
  
  // If setting to active, deactivate other policies of the same type for the same business
  if (updates.isActive === true) {
    const currentPolicy = policySnap.data() as Policy;
    const existingPolicies = await getPolicies({
      type: currentPolicy.type,
      activeOnly: true,
      businessId: currentPolicy.businessId,
    });
    for (const existingPolicy of existingPolicies) {
      if (existingPolicy.id !== policyId) {
        await updatePolicy(existingPolicy.id!, { isActive: false });
      }
    }
  }
  
  await updateDoc(policyRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete policy
 */
export const deletePolicy = async (policyId: string): Promise<void> => {
  const policyRef = doc(db, COLLECTIONS.POLICIES, policyId);
  const policySnap = await getDoc(policyRef);
  
  if (!policySnap.exists()) {
    throw new NotFoundError('Policy');
  }
  
  await deleteDoc(policyRef);
};

