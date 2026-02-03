# Environment Variables Required for Main App

## Quick Setup

Create a `.env.local` file in the `main/` directory with the following variables:

## Required Variables

### 🔥 Firebase Configuration (Public - Safe to expose)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**Where to get:** Firebase Console > Project Settings > General > Your apps > Web app config

---

### 💳 Paychangu Payment Gateway
```
NEXT_PUBLIC_PAYCHANGU_PUBLIC_KEY=your-paychangu-public-key  # For client-side operations (safe to expose)
PAYCHANGU_PUBLIC_KEY=your-paychangu-public-key  # Alternative (also supported)
PAYCHANGU_SECRET_KEY=your-paychangu-secret-key  # For server-side operations (KEEP SECRET!)
PAYCHANGU_BASE_URL=https://api.paychangu.com
PAYCHANGU_WEBHOOK_SECRET=your-webhook-secret
```

**Where to get:** Paychangu Dashboard > API Settings / Developer Settings

**Important:**
- `NEXT_PUBLIC_PAYCHANGU_PUBLIC_KEY` - Recommended: Public key for client-side use (safe to expose)
- `PAYCHANGU_PUBLIC_KEY` - Alternative: Also supported (use one or the other)
- `PAYCHANGU_SECRET_KEY` - Server-side only, never expose to client (KEEP SECRET!)
- `PAYCHANGU_WEBHOOK_SECRET` - Server-side only (KEEP SECRET!)

---

### ☁️ Cloudinary Media Storage
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset-name
```

**Where to get:** Cloudinary Dashboard > Settings > Security

**Note:** 
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` are public
- `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are server-side only

---

### 🔒 Google reCAPTCHA (Security)
```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
```

**Where to get:** [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)

**Note:**
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is public (safe to expose)
- `RECAPTCHA_SECRET_KEY` is server-side only (KEEP SECRET!)
- Use **reCAPTCHA v3** (invisible, score-based)
- Add your domain(s) in the reCAPTCHA console

---

## Complete .env.local Template

```bash
# ============================================
# Firebase Configuration
# ============================================
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ============================================
# Paychangu Payment Gateway
# ============================================
NEXT_PUBLIC_PAYCHANGU_PUBLIC_KEY=
PAYCHANGU_SECRET_KEY=
PAYCHANGU_BASE_URL=https://api.paychangu.com
PAYCHANGU_WEBHOOK_SECRET=

# ============================================
# Cloudinary Media Storage
# ============================================
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=

# ============================================
# Google reCAPTCHA (Security)
# ============================================
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=

# ============================================
# Email Service (for payment notifications)
# ============================================
# Choose one: resend, sendgrid, smtp, or console (for development)
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@techcure.tech
EMAIL_FROM_NAME=TechCure

# Resend (if EMAIL_PROVIDER=resend)
RESEND_API_KEY=

# SendGrid (if EMAIL_PROVIDER=sendgrid)
SENDGRID_API_KEY=

# SMTP (if EMAIL_PROVIDER=smtp)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# ============================================
# Developer Support Contact (used by Admin AI 'Email developers' link)
# ============================================
NEXT_PUBLIC_DEVELOPER_SUPPORT_EMAIL=
NEXT_PUBLIC_DEVELOPER_SUPPORT_NAME=
NEXT_PUBLIC_DEVELOPER_SUPPORT_PHONE=  # e.g. +15551234567 (used for WhatsApp links in Admin Contact) 

```

## Important Notes

1. **`.env.local` is already in `.gitignore`** - Your secrets won't be committed
2. **`NEXT_PUBLIC_*` variables** are exposed to the browser (safe for Firebase/Cloudinary public keys)
3. **Variables without `NEXT_PUBLIC_`** are server-side only (Paychangu secrets, Cloudinary API secret)
4. **Restart your dev server** after adding/changing environment variables

## Verification Steps

1. ✅ Firebase: Check browser console for Firebase initialization
2. ✅ Paychangu: Test payment flow (will error if not configured)
3. ✅ Cloudinary: Test image upload (will error if not configured)

## Production Deployment

Set these same variables in your hosting platform's environment variable settings:
- **Vercel:** Project Settings > Environment Variables
- **Netlify:** Site Settings > Build & Deploy > Environment
- **Other:** Check platform documentation

