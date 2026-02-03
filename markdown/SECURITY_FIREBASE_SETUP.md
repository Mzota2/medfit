# Complete Security Features Setup Guide for Firebase Free Tier

This guide walks you through setting up all security features (reCAPTCHA, Rate Limiting, and 2FA) on Firebase's free tier.

## Prerequisites

- Firebase project created
- Firestore database initialized
- Firebase Authentication enabled
- Environment variables file (`.env.local`) ready

---

## Step 1: Set Up Google reCAPTCHA

### 1.1 Create reCAPTCHA Site

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click **"+" (Create)** button
3. Fill in the form:
   - **Label**: Your business name (e.g., "TechCure E-commerce")
   - **reCAPTCHA type**: Select **"reCAPTCHA v3"** (invisible, score-based)
   - **Domains**: Add your domains:
     - `localhost` (for development)
     - Your production domain (e.g., `yourdomain.com`)
     - Your Vercel/Netlify domain if using (e.g., `yourapp.vercel.app`)
   - Accept the reCAPTCHA Terms of Service
4. Click **"Submit"**

### 1.2 Get Your Keys

After creating the site, you'll see:
- **Site Key** (public, safe to expose)
- **Secret Key** (private, keep secret)

### 1.3 Add to Environment Variables

Add to your `main/.env.local` file:

```bash
# Google reCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key-here
RECAPTCHA_SECRET_KEY=your-secret-key-here
```

### 1.4 Verify Setup

1. Restart your development server
2. Try logging in - reCAPTCHA should work invisibly
3. Check browser console for any errors

**Note:** In development, if keys are not set, it will use a dev token (allows login).

---

## Step 2: Configure Firebase Authentication for 2FA

### 2.1 Enable Multi-Factor Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** > **Sign-in method**
4. Scroll down to **Multi-factor authentication**
5. Click **"Get started"** or **"Enable"**
6. Choose your MFA providers:
   - **Phone authentication** (SMS) - Recommended for admins
   - **Authenticator apps** (TOTP) - More secure, requires app
7. Configure each provider:
   - **Phone**: Requires phone number verification
   - **Authenticator**: Works with apps like Google Authenticator, Authy

### 2.2 Configure Phone Authentication (if using SMS)

1. In **Authentication** > **Sign-in method**
2. Enable **Phone** provider
3. Configure:
   - **Phone numbers for testing** (optional, for development)
   - **App verification** settings

### 2.3 Test 2FA Setup

1. Create a test admin user
2. Log in as that user
3. The system should flag them for 2FA setup
4. Complete 2FA enrollment through Firebase

**Note:** Firebase free tier includes:
- ✅ Phone authentication (SMS) - Limited quota
- ✅ Multi-factor authentication
- ✅ Up to 50,000 phone verifications/month (free tier)

---

## Step 3: Configure Firestore Security Rules

### 3.1 Update Firestore Rules

The rules have already been updated in `firestore.rules`, but you need to deploy them:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Firestore Database** > **Rules**
3. Copy the contents of `firestore.rules` from your project
4. Paste into the Firebase Console rules editor
5. Click **"Publish"**

### 3.2 Verify Rules

The rules should include:
- `login_attempts` collection (server-side only, no client access)
- All other existing collections

### 3.3 Test Rules

1. Try to access Firestore from client
2. `login_attempts` should be inaccessible from client
3. Other collections should work as before

---

## Step 4: Set Up Firestore Indexes (if needed)

### 4.1 Check for Index Requirements

1. Run your app and try logging in
2. Check Firebase Console > Firestore > Indexes
3. If you see index errors, Firebase will provide a link to create them
4. Click the link and create the required indexes

### 4.2 Common Indexes Needed

For rate limiting queries, you might need:
- Collection: `login_attempts`
- Fields: `email` (Ascending), `lastAttemptAt` (Descending)

**Note:** Firebase free tier includes:
- ✅ 50,000 document reads/day
- ✅ 20,000 document writes/day
- ✅ 20,000 document deletes/day
- ✅ Automatic index creation for simple queries

---

## Step 5: Test All Features

### 5.1 Test reCAPTCHA

1. **Development:**
   - Without keys: Should use dev token (allows login)
   - With keys: Should verify invisibly

2. **Production:**
   - Must have valid keys
   - Should verify on every login attempt

### 5.2 Test Rate Limiting

1. Try logging in with wrong password 5 times
2. On 6th attempt, account should be locked
3. Wait 15 minutes OR log in successfully to reset
4. Check Firestore `login_attempts` collection for records

**Test Steps:**
```bash
# 1. Try wrong password 5 times
# 2. Check remaining attempts (should show 0)
# 3. Try again (should show lockout message)
# 4. Wait 15 minutes or log in successfully
# 5. Attempts should reset
```

### 5.3 Test 2FA for Admins

1. **Create Admin User:**
   - Sign up a new user
   - Assign admin role in Firestore
   - User document should have `requires2FASetup: true`

2. **Set Up 2FA:**
   - Log in as admin
   - System should prompt for 2FA setup
   - Complete enrollment through Firebase MFA

3. **Verify 2FA:**
   - Log out and log back in
   - Should require 2FA verification

---

## Step 6: Monitor and Maintain

### 6.1 Firebase Console Monitoring

1. **Authentication:**
   - Monitor sign-in attempts
   - Check MFA enrollment status
   - Review phone verification usage

2. **Firestore:**
   - Monitor `login_attempts` collection size
   - Check read/write quotas
   - Review security rules

3. **Usage:**
   - Monitor free tier limits
   - Check quota usage in Firebase Console

### 6.2 Clean Up Old Login Attempts (Optional)

Create a Cloud Function or scheduled task to clean up old login attempts:

```javascript
// Example: Delete attempts older than 30 days
// This is optional and can be done manually or via Cloud Function
```

**Note:** Firebase free tier includes:
- ✅ 2 million Cloud Function invocations/month
- ✅ 400,000 GB-seconds compute time/month

---

## Step 7: Production Deployment

### 7.1 Environment Variables

Set these in your hosting platform:

**Vercel:**
1. Go to Project Settings > Environment Variables
2. Add:
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - `RECAPTCHA_SECRET_KEY`

**Netlify:**
1. Go to Site Settings > Build & Deploy > Environment
2. Add the same variables

**Other Platforms:**
- Check platform documentation for environment variable setup

### 7.2 Update reCAPTCHA Domains

1. Go to [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Edit your site
3. Add production domain(s)
4. Save changes

### 7.3 Deploy Firestore Rules

1. Use Firebase CLI:
   ```bash
   firebase deploy --only firestore:rules
   ```

   OR

2. Deploy via Firebase Console (as in Step 3.1)

---

## Firebase Free Tier Limits

### Authentication
- ✅ Unlimited email/password users
- ✅ 50,000 phone verifications/month (SMS)
- ✅ Multi-factor authentication included
- ✅ Social logins (Google, etc.) included

### Firestore
- ✅ 1 GB storage
- ✅ 50,000 reads/day
- ✅ 20,000 writes/day
- ✅ 20,000 deletes/day

### Cloud Functions (if needed for cleanup)
- ✅ 2 million invocations/month
- ✅ 400,000 GB-seconds compute time/month

**Note:** For most small to medium businesses, the free tier is sufficient. Monitor usage in Firebase Console.

---

## Troubleshooting

### reCAPTCHA Not Working

**Issue:** reCAPTCHA verification fails

**Solutions:**
1. Verify domain is added in reCAPTCHA console
2. Check environment variables are set correctly
3. Restart dev server after adding variables
4. Check browser console for errors
5. Verify site key matches secret key

### Rate Limiting Not Working

**Issue:** Failed attempts not being tracked

**Solutions:**
1. Check Firestore rules allow server-side writes
2. Verify `login_attempts` collection exists
3. Check browser console for errors
4. Verify API route is accessible
5. Check Firestore quota (might be exceeded)

### 2FA Not Prompting

**Issue:** Admin users not being prompted for 2FA

**Solutions:**
1. Verify Firebase MFA is enabled in console
2. Check user document has `requires2FASetup: true`
3. Verify user role is ADMIN or STAFF
4. Check Firebase Authentication > Users > MFA status
5. Ensure phone authentication is enabled (if using SMS)

### Firestore Rules Errors

**Issue:** Permission denied errors

**Solutions:**
1. Verify rules are deployed correctly
2. Check rule syntax in Firebase Console
3. Test rules using Rules Playground
4. Verify authentication is working
5. Check collection names match exactly

---

## Quick Checklist

- [ ] reCAPTCHA site created and keys added to `.env.local`
- [ ] Firebase MFA enabled in Authentication settings
- [ ] Phone authentication enabled (if using SMS 2FA)
- [ ] Firestore rules deployed
- [ ] Test reCAPTCHA on login page
- [ ] Test rate limiting (5 failed attempts)
- [ ] Test 2FA setup for admin user
- [ ] Environment variables set in production
- [ ] Production domain added to reCAPTCHA
- [ ] Monitor Firebase usage quotas

---

## Next Steps After Setup

1. **Test thoroughly** in development
2. **Deploy to production** with environment variables
3. **Monitor usage** in Firebase Console
4. **Set up alerts** for quota limits (if needed)
5. **Regular audits** of admin 2FA status
6. **Review login attempts** periodically for security

---

## Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [reCAPTCHA Documentation](https://developers.google.com/recaptcha)
- [Firebase MFA Guide](https://firebase.google.com/docs/auth/web/multi-factor)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

## Important Notes

1. **Free Tier Sufficient:** All features work on Firebase free tier
2. **Phone SMS Costs:** After 50,000/month, charges apply (but free tier is generous)
3. **Firestore Quotas:** Monitor usage, but free tier handles most use cases
4. **Development vs Production:** Use different reCAPTCHA sites for dev/prod
5. **Security:** Never commit secret keys to version control

All features are now ready to use! 🎉


