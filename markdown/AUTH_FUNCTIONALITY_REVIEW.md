# User Authentication Functionality Review

## Overview
This document provides a comprehensive review of the user authentication functionality including sign in, sign up, sign out, state management, and all auth pages.

## Authentication State Management

### Location: `main/contexts/AuthContext.tsx`

**State Storage:**
- Uses React Context API for global state management
- Wrapped around entire app in `main/app/layout.tsx`
- State persists across page navigation (client-side state)

**State Variables:**
```typescript
- user: User | null          // Firebase User object
- userRole: UserRole | null  // User role from custom claims
- loading: boolean           // Initial auth state loading
```

**State Initialization:**
- Uses Firebase `onAuthStateChanged` listener
- Initializes on mount via `useEffect`
- Automatically updates when auth state changes
- Sets `loading: false` after initial auth check

**State Updates:**
- **Sign In:** `onAuthStateChanged` fires → updates `user` → fetches `userRole`
- **Sign Up:** `onAuthStateChanged` fires → updates `user` → fetches `userRole`
- **Sign Out:** `onAuthStateChanged` fires → sets `user` to `null` → sets `userRole` to `null`
- **Page Refresh:** State restored from Firebase session

## Authentication Functions

### 1. Sign In
**Location:** `main/contexts/AuthContext.tsx` → `signIn()`
**Implementation:**
```typescript
const signIn = async (email: string, password: string) => {
  await signInWithEmailAndPassword(auth, email, password);
};
```
- Uses Firebase `signInWithEmailAndPassword`
- `onAuthStateChanged` automatically updates state
- Returns Promise (errors handled by caller)

**Used in:** `main/app/(auth)/login/page.tsx`

### 2. Sign Up
**Location:** `main/contexts/AuthContext.tsx` → `signUp()`
**Implementation:**
```typescript
const signUp = async (email: string, password: string) => {
  await createUserWithEmailAndPassword(auth, email, password);
};
```
- Uses Firebase `createUserWithEmailAndPassword`
- `onAuthStateChanged` automatically updates state
- Returns Promise (errors handled by caller)

**Used in:** `main/app/(auth)/signup/page.tsx`

### 3. Sign Out
**Location:** `main/contexts/AuthContext.tsx` → `logout()`
**Implementation:**
```typescript
const logout = async () => {
  await firebaseSignOut(auth);
  setUserRole(null); // Manual cleanup
};
```
- Uses Firebase `signOut`
- Manually clears `userRole` state
- `onAuthStateChanged` automatically sets `user` to `null`
- Returns Promise

**Used in:**
- `main/components/layout/Header.tsx` (user menu)
- `main/components/admin/AdminLayout.tsx` (admin logout)

## Authentication Pages

### 1. Login Page
**Location:** `main/app/(auth)/login/page.tsx`
**Features:**
- ✅ Email/password form
- ✅ Google OAuth sign in
- ✅ Link to signup page
- ✅ Link to forgot password
- ✅ Error handling
- ✅ Loading states
- ✅ Redirects to `/` on success

**Issues:**
- ⚠️ No validation for empty fields (handled by HTML5 `required`)
- ⚠️ No email format validation (handled by HTML5 `type="email"`)

### 2. Sign Up Page
**Location:** `main/app/(auth)/signup/page.tsx`
**Features:**
- ✅ Name, email, password, confirm password fields
- ✅ Google OAuth sign up
- ✅ Password match validation
- ✅ Minimum password length (6 characters)
- ✅ Terms & Conditions checkbox
- ✅ Error handling
- ✅ Loading states
- ✅ Redirects to `/verify` on success

**Issues:**
- ⚠️ Name field is collected but not used (not saved to user profile)
- ⚠️ No email format validation (handled by HTML5)

### 3. Verify Page
**Location:** `main/app/(auth)/verify/page.tsx`
**Features:**
- ✅ Shows user email
- ✅ 6-digit code input field
- ✅ Resend code functionality
- ✅ Timer for code expiration (5 minutes)
- ✅ Auto-sends verification email on mount
- ✅ Redirects to `/` if already verified

**Issues:**
- ❌ **CRITICAL:** Firebase Auth doesn't use 6-digit codes - it uses email links
- ❌ `handleVerify()` attempts to verify with code, but Firebase uses email links
- ❌ Code input field doesn't actually work with Firebase's verification system
- ⚠️ Implementation mismatch: UI suggests 6-digit code but Firebase uses email link verification

### 4. Forgot Password Page
**Location:** `main/app/(auth)/forgot-password/page.tsx`
**Features:**
- ✅ Email input
- ✅ Sends password reset email via Firebase
- ✅ Success message
- ✅ Error handling
- ✅ Loading states
- ✅ Link back to login

**Status:** ✅ **Correctly Implemented**

### 5. Reset Password Page
**Location:** `main/app/(auth)/reset-password/page.tsx`
**Features:**
- ✅ Reads `oobCode` from URL query params
- ✅ Password and confirm password fields
- ✅ Password match validation
- ✅ Minimum password length (6 characters)
- ✅ Uses Firebase `confirmPasswordReset`
- ✅ Success message and redirect to login
- ✅ Error handling

**Status:** ✅ **Correctly Implemented**

## Auth Provider Setup

**Location:** `main/app/layout.tsx`
```typescript
<AuthProvider>
  {children}
</AuthProvider>
```
- ✅ Wrapped at root level
- ✅ Available to all pages and components
- ✅ Properly configured

## User Role Management

### Location: `main/lib/firebase/auth.ts`

**Issue Found:**
```typescript
export const getUserRole = async (user: User): Promise<UserRole | null> => {
  return user?.role || null;  // ❌ Firebase User doesn't have .role property
};
```

**Problem:**
- Firebase `User` object doesn't have a `role` property
- Should read from custom claims via `user.getIdTokenResult()`
- Current implementation will always return `null`

**Expected Implementation:**
```typescript
export const getUserRole = async (user: User): Promise<UserRole | null> => {
  try {
    const tokenResult = await user.getIdTokenResult();
    return tokenResult.claims.role as UserRole || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};
```

## Component Integration

### Header Component
**Location:** `main/components/layout/Header.tsx`
- ✅ Uses `useAuth()` hook
- ✅ Shows user menu when authenticated
- ✅ Shows "Sign In" button when not authenticated
- ✅ Logout button in user menu
- ✅ Safe hook wrapper (`useAuthSafe`) for error handling

**Syntax Issue:**
```typescript
// Line 29 - Missing braces in catch block
} catch {  // Should be } catch {
  return { itemCount: 0, totalAmount: 0 };
}
```
- ⚠️ Minor syntax issue in `useCartSafe` function

### Admin Layout
**Location:** `main/components/admin/AdminLayout.tsx`
- ✅ Uses `useAuth()` hook
- ✅ Logout functionality
- ✅ Access to user and userRole

## Authentication Flow

### Sign Up Flow
1. User fills form → `signUp(email, password)` called
2. Firebase creates account
3. `onAuthStateChanged` fires → user state updated
4. `getUserRole()` called → fetches role from custom claims (currently broken)
5. Redirect to `/verify` page
6. Verification email sent (should use email link, not 6-digit code)

### Sign In Flow
1. User fills form → `signIn(email, password)` called
2. Firebase authenticates
3. `onAuthStateChanged` fires → user state updated
4. `getUserRole()` called → fetches role from custom claims (currently broken)
5. Redirect to `/` (home page)

### Sign Out Flow
1. User clicks logout → `logout()` called
2. Firebase `signOut()` called
3. `userRole` manually cleared
4. `onAuthStateChanged` fires → `user` set to `null`
5. UI updates (user menu disappears, "Sign In" button appears)

### Google OAuth Flow
1. User clicks "Login with Google" → `signInWithPopup()` called
2. Google popup opens
3. User authenticates with Google
4. `onAuthStateChanged` fires → user state updated
5. Redirect to `/` (home page)

## Issues Summary

### Critical Issues
1. ❌ **`getUserRole()` function is broken** - doesn't read from Firebase custom claims
2. ❌ **Verify page uses 6-digit code** - Firebase uses email link verification

### Minor Issues
1. ⚠️ **Sign up page collects name but doesn't save it** - name field unused
2. ⚠️ **Header.tsx syntax issue** - missing braces in catch block (line 29)
3. ⚠️ **No email format validation** - relies on HTML5 only
4. ⚠️ **No password strength requirements** - only checks minimum length

### Recommendations

1. **Fix `getUserRole()` function:**
   ```typescript
   export const getUserRole = async (user: User): Promise<UserRole | null> => {
     try {
       const tokenResult = await user.getIdTokenResult();
       return tokenResult.claims.role as UserRole || null;
     } catch (error) {
       console.error('Error getting user role:', error);
       return null;
     }
   };
   ```

2. **Fix Verify Page:**
   - Remove 6-digit code input
   - Show message: "Check your email for verification link"
   - Add button to resend verification email
   - Auto-redirect when email is verified (poll or listen to auth state)

3. **Save name on signup:**
   - Update `signUp()` to accept name parameter
   - Create user profile document in Firestore with name
   - Or use `updateProfile()` to set displayName

4. **Fix Header.tsx syntax:**
   - Add proper braces to catch block

5. **Add password strength validation:**
   - Require uppercase, lowercase, number
   - Show strength indicator
   - Validate on client-side before submission

## State Management Summary

### State Persistence
- ✅ State persists across page navigation (React Context)
- ✅ State persists across browser refresh (Firebase session)
- ✅ State automatically syncs with Firebase Auth (onAuthStateChanged)
- ✅ State cleared on logout

### State Access
- ✅ Available globally via `useAuth()` hook
- ✅ Protected with error handling in Header component
- ✅ Properly typed with TypeScript interfaces

### State Updates
- ✅ Automatic updates via `onAuthStateChanged` listener
- ✅ Manual updates for `userRole` on logout
- ✅ Proper cleanup on unmount (unsubscribe from listener)

## Overall Assessment

**Status:** ⚠️ **Functional with Critical Issues**

- ✅ Authentication infrastructure is solid
- ✅ State management is properly implemented
- ✅ Most auth pages work correctly
- ❌ User role fetching is broken
- ❌ Verify page implementation doesn't match Firebase's system
- ⚠️ Some minor improvements needed

