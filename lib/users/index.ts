import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { User, CreateUserInput } from '@/types/user';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User> => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new NotFoundError('User');
  }
  
  return { id: userSnap.id, ...userSnap.data() } as User;
};

/**
 * Get user by UID (Firebase Auth UID)
 */
export const getUserByUid = async (uid: string): Promise<User | null> => {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const q = query(usersRef, where('uid', '==', uid), limit(1));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as User;
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const q = query(usersRef, where('email', '==', email), limit(1));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as User;
};

/**
 * Get all users with pagination
 */
export const getUsers = async (options?: {
  limit?: number;
  lastDocId?: string;
  role?: string;
  businessId?: string;
}): Promise<{ users: User[]; lastDocId?: string; hasMore: boolean }> => {
  const usersRef = collection(db, COLLECTIONS.USERS);
  let q = query(usersRef);
  
  if (options?.role) {
    q = query(q, where('role', '==', options.role));
  }
  
  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const querySnapshot = await getDocs(q);
  const users = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as User[];
  
  const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
  const hasMore = querySnapshot.docs.length === (options?.limit || 10);
  
  return {
    users,
    lastDocId: lastDoc?.id,
    hasMore
  };
};

export const getCustomers = async (): Promise<User[]> => {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const q = query(usersRef, where('role', '==', 'customer'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as User[];
};

export const getAdmins = async (businessId?: string): Promise<User[]> => {
  const usersRef = collection(db, COLLECTIONS.USERS);
  // If businessId is provided, filter by it; otherwise get all admins
  // Note: Firestore doesn't support OR queries easily, so we'll fetch all and filter client-side
  // if we want to include users without businessId
  const q = query(usersRef, where('role', '==', 'admin'));
  
  const querySnapshot = await getDocs(q);
  let admins = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as User[];
  
  // Filter by businessId if provided, or include users without businessId
  if (businessId) {
    admins = admins.filter(admin => !admin.businessId || admin.businessId === businessId);
  }
  
  return admins;
};

export const getStaff = async (businessId?: string): Promise<User[]> => {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const q = query(usersRef, where('role', '==', 'staff'));
  
  const querySnapshot = await getDocs(q);
  let staff = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as User[];
  
  // Filter by businessId if provided, or include users without businessId
  if (businessId) {
    staff = staff.filter(staffMember => !staffMember.businessId || staffMember.businessId === businessId);
  }
  
  return staff;
};

export const createUser = async (input: CreateUserInput, businessId?: string): Promise<string> => {
  if (!input.uid || !input.email) {
    throw new ValidationError('UID and email are required');
  }
  
  // Check if user already exists
  const existingUser = await getUserByUid(input.uid);
  if (existingUser) {
    throw new ValidationError('User with this UID already exists');
  }
  
  // Automatically get businessId if not provided (for admin/staff users)
  let finalBusinessId = businessId;
  const { getBusinessId } = await import('@/lib/businesses/utils');
  finalBusinessId = await getBusinessId();
  if (process.env.NODE_ENV !== 'production') {
    console.log(finalBusinessId);
  }
  const userData: Omit<User, 'id'> = {
    ...input,
    ...(finalBusinessId && { businessId: finalBusinessId }),
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
    isActive: true,
    emailVerified: false,
  };
  
  const userRef = await addDoc(collection(db, COLLECTIONS.USERS), userData);
  return userRef.id;
};

/**
 * Update user
 */
export const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new NotFoundError('User');
  }
  
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Update user by UID (Firebase Auth UID)
 * Useful for syncing Firebase Auth state with Firestore
 */
export const updateUserByUid = async (uid: string, updates: Partial<User>): Promise<void> => {
  const user = await getUserByUid(uid);
  
  if (!user || !user.id) {
    throw new NotFoundError('User');
  }
  
  await updateUser(user.id, updates);
};

/**
 * Delete user (soft delete by setting isActive to false)
 */
export const deleteUser = async (userId: string): Promise<void> => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new NotFoundError('User');
  }
  
  // Soft delete
  await updateDoc(userRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
};

