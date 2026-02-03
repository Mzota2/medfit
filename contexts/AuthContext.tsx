/**
 * Authentication context for managing user state
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserRole } from '@/lib/firebase/auth';
import { signIn as authSignIn, signUp as authSignUp } from '@/lib/auth';
import { signOut as authSignOut } from '@/lib/auth';
import { updateUserByUid, getUserByUid } from '@/lib/users';
import { UserRole } from '@/types/user';

interface AuthContextType {
  user: FirebaseUser | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const isSigningUpRef = useRef(false);
  const lastEmailVerifiedRef = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // For manual signup, only set state if email is verified
      if (firebaseUser && isSigningUpRef.current && !firebaseUser.emailVerified) {
        // Don't update state for unverified signup
        setLoading(false);
        return;
      }
      
      // Sync Firebase Auth emailVerified with Firestore
      if (firebaseUser) {
        const currentEmailVerified = firebaseUser.emailVerified;
        const previousEmailVerified = lastEmailVerifiedRef.current;
        
        // If emailVerified changed from false to true, update Firestore
        if (currentEmailVerified && previousEmailVerified !== currentEmailVerified) {
          try {
            const firestoreUser = await getUserByUid(firebaseUser.uid);
            // Only update if Firestore emailVerified is different
            if (firestoreUser && firestoreUser.emailVerified !== currentEmailVerified) {
              await updateUserByUid(firebaseUser.uid, {
                emailVerified: currentEmailVerified,
              });
              console.log('Synced emailVerified to Firestore:', currentEmailVerified);
            }
          } catch (error) {
            // Don't fail auth flow if sync fails
            console.error('Error syncing emailVerified to Firestore:', error);
          }
        }
        
        lastEmailVerifiedRef.current = currentEmailVerified;
      } else {
        lastEmailVerifiedRef.current = null;
      }
      
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const role = await getUserRole(firebaseUser);
          setUserRole(role);
        } catch (error) {
          console.error('Error getting user role:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      
      // Reset signup flag after state update
      if (firebaseUser && isSigningUpRef.current) {
        isSigningUpRef.current = false;
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    isSigningUpRef.current = false; // Ensure signup flag is false for sign-in
    await authSignIn({ email, password });
    // State will update automatically via onAuthStateChanged
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    isSigningUpRef.current = true; // Mark that we're signing up
    await authSignUp({ email, password, displayName });
    // State will update automatically via onAuthStateChanged only if email is verified
  };

  const logout = async () => {
    try {
      // Sign out from Firebase
      await authSignOut();
      
      // Clear local state immediately
      setUser(null);
      setUserRole(null);
      
      // Clear React Query cache
      const { queryClient } = await import('@/providers/QueryProvider');
      queryClient.clear();
      
      // State will also update automatically via onAuthStateChanged
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, clear local state
      setUser(null);
      setUserRole(null);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        signIn,
        signUp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

