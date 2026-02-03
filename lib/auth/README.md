# Authentication Functions

Comprehensive authentication functions that integrate Firebase Auth with Firestore user documents.

## Usage

### Sign Up

```typescript
import { signUp } from '@/lib/auth';

// Email/password signup
const result = await signUp({
  email: 'user@example.com',
  password: 'password123',
  displayName: 'John Doe',
  phone: '+1234567890',
  role: UserRole.CUSTOMER, // optional, defaults to CUSTOMER
});

// result.firebaseUser - Firebase Auth user
// result.user - Firestore user document
// result.emailSent - Whether verification email was sent
```

### Sign In

```typescript
import { signIn } from '@/lib/auth';

const result = await signIn({
  email: 'user@example.com',
  password: 'password123',
});

// result.firebaseUser - Firebase Auth user
// result.user - Firestore user document
```

### Social Sign In

```typescript
import { signInWithGoogle, signInWithFacebook, signInWithSocial } from '@/lib/auth';

// Google
const { firebaseUser, user } = await signInWithGoogle();

// Facebook
const { firebaseUser, user } = await signInWithFacebook();

// Generic
const { firebaseUser, user } = await signInWithSocial('google');
```

### Sign Out

```typescript
import { signOut } from '@/lib/auth';

await signOut();
```

### Email Verification

```typescript
import { sendVerificationEmail, verifyEmail, isEmailVerified } from '@/lib/auth';

// Send verification email
await sendVerificationEmail();

// Verify email with code from link
await verifyEmail(oobCode);

// Check if verified
const verified = isEmailVerified();
```

### Password Management

```typescript
import { 
  sendPasswordReset, 
  resetPassword, 
  changePassword,
  verifyResetCode 
} from '@/lib/auth';

// Send password reset email
await sendPasswordReset('user@example.com');

// Reset password with code
await resetPassword(oobCode, 'newPassword123');

// Change password (requires current password)
await changePassword('currentPassword', 'newPassword123');

// Verify reset code
const email = await verifyResetCode(oobCode);
```

### Profile Management

```typescript
import { updateUserProfile, updateUserEmail, updateUserPhone } from '@/lib/auth';

// Update profile
const user = await updateUserProfile({
  displayName: 'New Name',
  photoURL: 'https://example.com/photo.jpg',
});

// Update email (requires password for reauthentication)
await updateUserEmail('newemail@example.com', 'currentPassword');

// Update phone
const user = await updateUserPhone('+1234567890');
```

### Session Management

```typescript
import { 
  getCurrentSession, 
  getCurrentUser, 
  requireAuth,
  requireRole,
  requireAdminOrStaff,
  hasRole,
  getIdToken 
} from '@/lib/auth';

// Get current session (Firebase + Firestore)
const session = await getCurrentSession();
if (session) {
  console.log(session.firebaseUser);
  console.log(session.user);
}

// Get current user (Firestore only)
const user = await getCurrentUser();

// Require authentication (throws if not signed in)
const session = await requireAuth();

// Require specific role
const session = await requireRole(UserRole.ADMIN);

// Require admin or staff
const session = await requireAdminOrStaff();

// Check role
const isAdmin = await hasRole(UserRole.ADMIN);

// Get ID token for API requests
const token = await getIdToken();
```

## Error Handling

All functions throw typed errors:

- `ValidationError` - Invalid input
- `AuthenticationError` - Auth-related errors
- `NotFoundError` - Resource not found

```typescript
import { ValidationError, AuthenticationError } from '@/lib/utils/errors';

try {
  await signIn({ email: 'user@example.com', password: 'wrong' });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Auth error:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
  }
}
```

## Integration with Components

### Client Component Example

```tsx
'use client';

import { signUp } from '@/lib/auth';
import { useState } from 'react';

export function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signUp({
        email: e.currentTarget.email.value,
        password: e.currentTarget.password.value,
        displayName: e.currentTarget.name.value,
      });
      
      // Redirect or show success
      console.log('User created:', result.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

### Server Component Example

```tsx
import { getCurrentUser } from '@/lib/auth';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  return <div>Welcome, {user.displayName}</div>;
}
```

## Features

✅ Email/password authentication  
✅ Social authentication (Google, Facebook, Twitter, Apple)  
✅ Email verification  
✅ Password reset  
✅ Password change with reauthentication  
✅ Profile management  
✅ Session management  
✅ Role-based access control  
✅ Automatic Firestore user document creation  
✅ Type-safe with TypeScript  
✅ Comprehensive error handling  

