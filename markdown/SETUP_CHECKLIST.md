# Security Features Setup Checklist

Use this checklist to ensure all security features are properly configured.

## ✅ Pre-Setup Verification

- [ ] Firebase project created
- [ ] Firestore database initialized
- [ ] Firebase Authentication enabled
- [ ] `.env.local` file exists in `main/` directory

---

## 🔒 Step 1: reCAPTCHA Configuration

### 1.1 Create reCAPTCHA Site
- [ ] Go to https://www.google.com/recaptcha/admin
- [ ] Click "Create" button
- [ ] Choose "reCAPTCHA v3" (invisible)
- [ ] Add domain: `localhost`
- [ ] Add your production domain
- [ ] Copy Site Key: `_________________`
- [ ] Copy Secret Key: `_________________`

### 1.2 Add Environment Variables
- [ ] Open `main/.env.local`
- [ ] Add `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key`
- [ ] Add `RECAPTCHA_SECRET_KEY=your-secret-key`
- [ ] Save file
- [ ] Restart development server

### 1.3 Test reCAPTCHA
- [ ] Navigate to login page
- [ ] Try to log in
- [ ] Check browser console (no errors)
- [ ] Verify login works

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## 🚫 Step 2: Rate Limiting (Automatic)

### 2.1 Verify Configuration
- [ ] Check `main/lib/security/rate-limit.ts` exists
- [ ] Verify `MAX_LOGIN_ATTEMPTS = 5` (or your preferred value)
- [ ] Verify `LOCKOUT_DURATION_MINUTES = 15` (or your preferred value)

### 2.2 Test Rate Limiting
- [ ] Try logging in with wrong password 5 times
- [ ] Verify "Account locked" message appears
- [ ] Check Firestore `login_attempts` collection has records
- [ ] Wait 15 minutes OR log in successfully
- [ ] Verify attempts reset

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## 🔐 Step 3: 2FA for Admins

### 3.1 Enable Firebase MFA
- [ ] Go to Firebase Console
- [ ] Navigate to Authentication → Sign-in method
- [ ] Scroll to "Multi-factor authentication"
- [ ] Click "Enable" or "Get started"
- [ ] Enable "Phone" provider (if using SMS)
- [ ] Enable "Authenticator apps" (if using TOTP)
- [ ] Save changes

### 3.2 Configure Phone Authentication (if using SMS)
- [ ] In Authentication → Sign-in method
- [ ] Enable "Phone" provider
- [ ] Configure phone verification settings
- [ ] Add test phone numbers (optional, for development)

### 3.3 Test 2FA Setup
- [ ] Create a test admin user (or use existing)
- [ ] Log in as admin
- [ ] Verify user document has `requires2FASetup: true`
- [ ] Complete 2FA enrollment
- [ ] Log out and log back in
- [ ] Verify 2FA is required

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## 🔥 Step 4: Firestore Configuration

### 4.1 Deploy Security Rules
- [ ] Go to Firebase Console → Firestore Database → Rules
- [ ] Copy rules from `firestore.rules` file
- [ ] Paste into Firebase Console rules editor
- [ ] Verify `login_attempts` collection rule exists
- [ ] Click "Publish"

### 4.2 Verify Rules
- [ ] Check rules syntax (no errors)
- [ ] Verify `login_attempts` collection is server-side only
- [ ] Test that client cannot access `login_attempts`

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## 🧪 Step 5: Comprehensive Testing

### 5.1 Test reCAPTCHA
- [ ] Login with correct credentials (should work)
- [ ] Check browser network tab for reCAPTCHA requests
- [ ] Verify no console errors

### 5.2 Test Rate Limiting
- [ ] Enter wrong password 1 time → See "4 attempts remaining"
- [ ] Enter wrong password 4 more times → See "Account locked"
- [ ] Try logging in → See lockout message
- [ ] Log in successfully → Verify attempts reset

### 5.3 Test 2FA
- [ ] Create admin user
- [ ] Log in → Should see 2FA setup prompt
- [ ] Complete 2FA enrollment
- [ ] Log out → Log back in
- [ ] Should require 2FA code

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## 🚀 Step 6: Production Deployment

### 6.1 Environment Variables
- [ ] Add `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` to hosting platform
- [ ] Add `RECAPTCHA_SECRET_KEY` to hosting platform
- [ ] Verify variables are set correctly

### 6.2 reCAPTCHA Production
- [ ] Add production domain to reCAPTCHA console
- [ ] Verify domain is approved
- [ ] Test login on production

### 6.3 Final Checks
- [ ] All features work in production
- [ ] Monitor Firebase usage quotas
- [ ] Set up alerts for quota limits (optional)

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## 📊 Firebase Free Tier Monitoring

### Check Usage
- [ ] Go to Firebase Console → Usage and billing
- [ ] Monitor Authentication usage
- [ ] Monitor Firestore usage
- [ ] Monitor Cloud Functions usage (if using)

### Free Tier Limits
- ✅ Authentication: Unlimited email/password, 50K phone verifications/month
- ✅ Firestore: 1GB storage, 50K reads/day, 20K writes/day
- ✅ Cloud Functions: 2M invocations/month

**Current Usage:**
- Authentication: ___ / Unlimited
- Firestore Reads: ___ / 50,000 per day
- Firestore Writes: ___ / 20,000 per day

---

## 🎯 Quick Reference

### Environment Variables Needed
```bash
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
RECAPTCHA_SECRET_KEY=...
```

### Firebase Console Links
- Authentication: https://console.firebase.google.com/project/_/authentication
- Firestore Rules: https://console.firebase.google.com/project/_/firestore/rules
- Usage: https://console.firebase.google.com/project/_/usage

### Key Files
- `main/lib/security/recaptcha.ts` - reCAPTCHA verification
- `main/lib/security/rate-limit.ts` - Rate limiting logic
- `main/lib/security/2fa.ts` - 2FA utilities
- `firestore.rules` - Security rules

---

## ✅ Final Verification

Before considering setup complete:

- [ ] All checkboxes above are checked
- [ ] reCAPTCHA works on login
- [ ] Rate limiting locks accounts after 5 attempts
- [ ] Admin users are prompted for 2FA
- [ ] Firestore rules are deployed
- [ ] No console errors
- [ ] Production environment variables set
- [ ] Production domain added to reCAPTCHA

**🎉 Setup Complete!**

---

## 📚 Documentation

- **Quick Start**: See [QUICK_START_SECURITY.md](./QUICK_START_SECURITY.md)
- **Detailed Guide**: See [SECURITY_FIREBASE_SETUP.md](./SECURITY_FIREBASE_SETUP.md)
- **Feature Details**: See [SECURITY_SETUP.md](./SECURITY_SETUP.md)

---

## 🆘 Need Help?

1. Check browser console for errors
2. Check Firebase Console for configuration
3. Verify environment variables are set
4. Review detailed guides above
5. Check Firebase documentation

