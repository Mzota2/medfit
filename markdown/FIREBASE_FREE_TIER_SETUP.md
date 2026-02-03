# Firebase Free Tier Setup - Step by Step

This guide shows you exactly what to do to get all security features running on Firebase's free tier.

## 🎯 What You Need to Do (In Order)

### ✅ Step 1: Get reCAPTCHA Keys (2 minutes)

1. **Visit:** https://www.google.com/recaptcha/admin
2. **Click:** "Create" button (top right)
3. **Fill in:**
   - Label: `Your Business Name`
   - Type: **reCAPTCHA v3** (invisible)
   - Domains: 
     - `localhost` (for development)
     - Your production domain (e.g., `yourapp.vercel.app`)
4. **Click:** "Submit"
5. **Copy:**
   - Site Key (starts with `6L...`)
   - Secret Key (starts with `6L...`)

6. **Add to `main/.env.local`:**
   ```bash
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6L...your-site-key
   RECAPTCHA_SECRET_KEY=6L...your-secret-key
   ```

7. **Restart your dev server**

✅ **reCAPTCHA is now active!**

---

### ✅ Step 2: Enable Firebase Multi-Factor Authentication (3 minutes)

1. **Go to:** https://console.firebase.google.com/
2. **Select your project**
3. **Navigate to:** Authentication → Sign-in method
4. **Scroll down** to "Multi-factor authentication" section
5. **Click:** "Get started" or "Enable"
6. **Enable providers:**
   - ✅ **Phone** (for SMS codes) - Recommended
   - ✅ **Authenticator apps** (for TOTP codes) - More secure
7. **Click:** "Save"

8. **If using Phone MFA:**
   - In "Sign-in method" tab
   - Enable **Phone** provider
   - Configure phone verification settings
   - Save

✅ **2FA is now enabled!** Admin users will be automatically prompted to set it up.

---

### ✅ Step 3: Deploy Firestore Security Rules (1 minute)

1. **Go to:** Firebase Console → Firestore Database → Rules
2. **Open:** `firestore.rules` file in your project
3. **Copy** all the rules
4. **Paste** into Firebase Console rules editor
5. **Click:** "Publish"

✅ **Security rules are now active!**

**Note:** The rules include:
- `login_attempts` collection (server-side only)
- All your existing collections

---

### ✅ Step 4: Test Everything (5 minutes)

#### Test reCAPTCHA:
1. Go to login page
2. Try to log in
3. Should work invisibly (no user interaction)
4. Check browser console - no errors

#### Test Rate Limiting:
1. Try wrong password 5 times
2. Should see "Account locked" message
3. Check Firestore → `login_attempts` collection
4. Should see a document with your email
5. Log in successfully → attempts reset

#### Test 2FA:
1. Create or use an admin user
2. Log in as admin
3. Check user document in Firestore → should have `requires2FASetup: true`
4. Complete 2FA setup (one-time process)
5. Log out and back in
6. Should require 2FA code

---

## 📋 Environment Variables Summary

Add these to `main/.env.local`:

```bash
# Existing Firebase variables (you should already have these)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# NEW: reCAPTCHA (add these)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key-here
RECAPTCHA_SECRET_KEY=your-secret-key-here
```

---

## 🔍 Verification Checklist

After setup, verify:

- [ ] reCAPTCHA works (login succeeds)
- [ ] Rate limiting works (5 wrong attempts = lockout)
- [ ] 2FA prompts for admin users
- [ ] Firestore rules deployed
- [ ] No console errors
- [ ] `login_attempts` collection exists in Firestore

---

## 💰 Firebase Free Tier Limits

All features work within free tier limits:

| Feature | Free Tier Limit | Your Usage |
|---------|-----------------|------------|
| **Authentication** | Unlimited email/password | ✅ Unlimited |
| **Phone MFA** | 50,000 verifications/month | ✅ Plenty |
| **Firestore Reads** | 50,000/day | ✅ Enough for rate limiting |
| **Firestore Writes** | 20,000/day | ✅ Enough for login attempts |
| **Firestore Storage** | 1 GB | ✅ Sufficient |

**You're well within free tier limits!** 🎉

---

## 🚀 Production Deployment

When ready for production:

1. **Add production domain to reCAPTCHA:**
   - Go to reCAPTCHA console
   - Edit your site
   - Add production domain
   - Save

2. **Set environment variables in hosting:**
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment
   - Add both reCAPTCHA keys

3. **Deploy Firestore rules:**
   - Already done in Step 3 (rules are global)

4. **Test in production:**
   - All features should work the same

---

## 🆘 Troubleshooting

### reCAPTCHA not working?
- ✅ Check environment variables are set
- ✅ Restart dev server
- ✅ Verify domain is in reCAPTCHA console
- ✅ Check browser console for errors

### Rate limiting not working?
- ✅ Check Firestore rules are deployed
- ✅ Verify `login_attempts` collection exists
- ✅ Check browser console for errors
- ✅ Verify API route is accessible

### 2FA not prompting?
- ✅ Verify MFA is enabled in Firebase Console
- ✅ Check user role is ADMIN or STAFF
- ✅ Verify user document has `requires2FASetup: true`
- ✅ Check Firebase Authentication → Users → MFA status

---

## 📚 Additional Resources

- **Quick Start**: [QUICK_START_SECURITY.md](./QUICK_START_SECURITY.md)
- **Detailed Guide**: [SECURITY_FIREBASE_SETUP.md](./SECURITY_FIREBASE_SETUP.md)
- **Setup Checklist**: [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)

---

## ✅ You're Done!

Once you complete these 4 steps, all security features are active:
- ✅ reCAPTCHA protecting logins
- ✅ Rate limiting preventing brute force
- ✅ 2FA required for admins

**Total setup time: ~10 minutes** ⏱️


