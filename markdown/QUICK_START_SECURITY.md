# Quick Start: Security Features Setup

This is a quick checklist to get all security features running on Firebase free tier.

## ⚡ Quick Setup (5-10 minutes)

### 1. reCAPTCHA (2 minutes)

1. Go to https://www.google.com/recaptcha/admin
2. Click "Create" → Choose "reCAPTCHA v3"
3. Add domains: `localhost` and your production domain
4. Copy **Site Key** and **Secret Key**
5. Add to `main/.env.local`:
   ```bash
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key
   RECAPTCHA_SECRET_KEY=your-secret-key
   ```
6. Restart dev server

✅ **Done!** reCAPTCHA now works invisibly on all logins.

---

### 2. Rate Limiting (Already Configured!)

✅ **No setup needed!** Rate limiting works automatically:
- Tracks failed attempts in Firestore
- Locks after 5 attempts
- 15-minute lockout
- Auto-resets on success

**Optional:** Adjust limits in `main/lib/security/rate-limit.ts`:
```typescript
const MAX_LOGIN_ATTEMPTS = 5; // Change if needed
const LOCKOUT_DURATION_MINUTES = 15; // Change if needed
```

---

### 3. 2FA for Admins (3-5 minutes)

1. Go to Firebase Console → Authentication → Sign-in method
2. Scroll to **Multi-factor authentication**
3. Click **"Enable"**
4. Choose providers:
   - ✅ **Phone** (SMS) - Easy for users
   - ✅ **Authenticator apps** (TOTP) - More secure
5. If using Phone, enable **Phone** provider in Sign-in method
6. Save changes

✅ **Done!** Admin users will be automatically flagged for 2FA setup.

**Note:** When an admin logs in, they'll be prompted to set up 2FA. This is a one-time setup.

---

### 4. Deploy Firestore Rules (1 minute)

1. Go to Firebase Console → Firestore Database → Rules
2. Copy rules from `firestore.rules` in your project
3. Paste into Firebase Console
4. Click **"Publish"**

✅ **Done!** Security rules are now active.

---

## 🧪 Test Everything

### Test reCAPTCHA
- [ ] Log in - should work invisibly
- [ ] Check browser console - no errors

### Test Rate Limiting
- [ ] Try wrong password 5 times
- [ ] See "Account locked" message
- [ ] Wait 15 min or log in successfully
- [ ] Attempts reset

### Test 2FA
- [ ] Create/admin user
- [ ] Log in - should see 2FA setup prompt
- [ ] Complete 2FA enrollment
- [ ] Log out and back in - should require 2FA

---

## 📊 Firebase Free Tier Limits

All features work on free tier:

- ✅ **reCAPTCHA**: Unlimited (Google service)
- ✅ **Rate Limiting**: Uses Firestore (50K reads/day free)
- ✅ **2FA**: Included in Firebase Auth (50K phone verifications/month free)

**You're good to go!** 🎉

---

## 🚨 If Something Doesn't Work

1. **reCAPTCHA errors**: Check environment variables, restart server
2. **Rate limiting not working**: Check Firestore rules, verify collection exists
3. **2FA not prompting**: Verify MFA is enabled in Firebase Console

See [SECURITY_FIREBASE_SETUP.md](./SECURITY_FIREBASE_SETUP.md) for detailed troubleshooting.

---

## 📝 Production Checklist

Before going live:

- [ ] Add production domain to reCAPTCHA
- [ ] Set environment variables in hosting platform
- [ ] Deploy Firestore rules
- [ ] Test all features in production
- [ ] Monitor Firebase usage quotas

---

**That's it!** All security features are now active. 🛡️


