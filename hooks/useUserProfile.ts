/**
 * Reusable hook for loading user profile data
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { User } from '@/types/user';

interface UseUserProfileReturn {
  userProfile: User | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

export const useUserProfile = (user: FirebaseUser | null): UseUserProfileReturn => {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadUserProfile = useCallback(async () => {
    if (!user) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userQuery = query(
        collection(db, COLLECTIONS.USERS),
        where('uid', '==', user.uid)
      );
      const userSnap = await getDocs(userQuery);
      
      if (!userSnap.empty) {
        const userData = { id: userSnap.docs[0].id, ...userSnap.docs[0].data() } as User;
        setUserProfile(userData);
      } else {
        setUserProfile(null);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to load user profile'));
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  return {
    userProfile,
    loading,
    error,
    reload: loadUserProfile,
  };
};

