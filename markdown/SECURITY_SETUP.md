# Security Features Setup Guide

This guide explains how to set up the security features: reCAPTCHA, Login Rate Limiting, and 2FA for Admins.

**📘 For a complete step-by-step Firebase setup guide, see [SECURITY_FIREBASE_SETUP.md](./SECURITY_FIREBASE_SETUP.md)**

## 1. reCAPTCHA Setup

### Get reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "Create" to create a new site
3. Choose **reCAPTCHA v3** (invisible, score-based)
4. Add your domain(s)
5. Copy the **Site Key** and **Secret Key**

### Environment Variables

Add these to your `.env.local` file:

```bash
# reCAPTCHA Configuration
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key-here
RECAPTCHA_SECRET_KEY=your-secret-key-here
```

**Note:**
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is public and safe to expose
- `RECAPTCHA_SECRET_KEY` is server-side only (KEEP SECRET!)

### How It Works

- reCAPTCHA v3 runs invisibly in the background
- It scores user interactions (0.0 to 1.0)
- Scores are verified server-side before allowing login
- No user interaction required (invisible)

## 2. Login Rate Limiting

### Configuration

Rate limiting is automatically enabled with these defaults:

- **Max Login Attempts**: 5 failed attempts
- **Lockout Duration**: 15 minutes
- **Auto-Reset**: After successful login or lockout expiration

### How It Works

1. Failed login attempts are tracked per email address
2. After 5 failed attempts, the account is locked for 15 minutes
3. Users see remaining attempts before lockout
4. Successful login resets the attempt counter
5. Lockout automatically expires after the duration

### Customization

To change these values, edit `main/lib/security/rate-limit.ts`:

```typescript
const MAX_LOGIN_ATTEMPTS = 5; // Change this
const LOCKOUT_DURATION_MINUTES = 15; // Change this
```

## 3. Two-Factor Authentication (2FA) for Admins

### Automatic Setup

2FA is **automatically enabled** for all admin and staff users:

- When a user signs up with admin/staff role
- When a user's role is changed to admin/staff
- The system marks `requires2FASetup: true` in their user document

### How It Works

1. **Automatic Flagging**: Admin/staff users are automatically flagged to set up 2FA
2. **Setup Required**: Users must complete 2FA setup before accessing admin features
3. **Firebase MFA**: Uses Firebase's built-in Multi-Factor Authentication
4. **Enforcement**: Login checks if 2FA is required and enabled

### User Experience

1. Admin/staff user logs in
2. If 2FA is not set up, they see a prompt to set it up
3. They complete 2FA enrollment
4. Future logins require 2FA verification

### Firebase MFA Setup

To enable Firebase MFA:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** > **Sign-in method**
3. Enable **Multi-factor authentication**
4. Configure MFA providers (SMS, Authenticator apps, etc.)

### User Document Fields

The following fields are added to user documents:

```typescript
{
  requires2FASetup?: boolean; // Flag indicating admin needs to set up 2FA
  twoFactorEnabled?: boolean; // Whether 2FA is actually enabled
}
```

## Testing

### Development Mode

- reCAPTCHA: If not configured, allows login with a dev token
- Rate Limiting: Still active (recommended to test)
- 2FA: Can be tested with Firebase MFA enabled

### Production Mode

- All security features are enforced
- reCAPTCHA verification is required
- Rate limiting is active
- 2FA is required for admins

## Troubleshooting

### reCAPTCHA Not Working

1. Check that `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set
2. Verify the domain is registered in reCAPTCHA console
3. Check browser console for errors
4. In development, it will use a dev token if not configured

### Rate Limiting Issues

1. Check Firestore for `login_attempts_{email}` documents
2. Verify the collection name matches `COLLECTIONS.USERS`
3. Check that timestamps are being saved correctly

### 2FA Not Prompting

1. Verify Firebase MFA is enabled in Firebase Console
2. Check user document for `requires2FASetup: true`
3. Verify user role is ADMIN or STAFF
4. Check browser console for errors

## Security Best Practices

1. **Keep Secret Keys Secret**: Never commit `RECAPTCHA_SECRET_KEY` to version control
2. **Monitor Failed Attempts**: Review Firestore for suspicious login patterns
3. **Regular 2FA Audits**: Ensure all admins have 2FA enabled
4. **Update Lockout Duration**: Adjust based on your security needs
5. **Monitor reCAPTCHA Scores**: Low scores may indicate bots

## Additional Notes

- Rate limiting uses Firestore to track attempts (consider using Redis for high-traffic apps)
- 2FA setup is a one-time process per user
- reCAPTCHA v3 is invisible and doesn't interrupt user flow
- All features work together to provide layered security

