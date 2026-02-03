# Environment Variables Setup Guide

This guide explains how to set up the required environment variables for the main app.

## Quick Start

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your actual values in `.env.local`

3. Restart your development server

## Required Environment Variables

### Firebase Configuration

**Where to get these:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the gear icon ⚙️ > Project Settings
4. Scroll down to "Your apps" section
5. Click on the web app icon `</>`
6. Copy the configuration values

**Variables needed:**
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API Key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Auth domain (usually `your-project.firebaseapp.com`)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Your Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Storage bucket (usually `your-project.appspot.com`)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase App ID

**Note:** These are public variables (prefixed with `NEXT_PUBLIC_`) and will be exposed to the client. This is safe for Firebase as it uses security rules.

### Paychangu Payment Gateway

**Where to get these:**
1. Log in to your [Paychangu Dashboard](https://dashboard.paychangu.com/)
2. Navigate to API Settings or Developer Settings
3. Generate or copy your API credentials

**Variables needed:**
- `NEXT_PUBLIC_PAYCHANGU_PUBLIC_KEY` - Your Paychangu Public Key (for client-side operations, safe to expose) - **Recommended**
- `PAYCHANGU_PUBLIC_KEY` - Alternative: Your Paychangu Public Key (also supported)
- `PAYCHANGU_SECRET_KEY` - Your Paychangu Secret Key (for server-side operations, KEEP THIS SECRET!)
- `PAYCHANGU_BASE_URL` - API base URL (default: `https://api.paychangu.com`)
- `PAYCHANGU_WEBHOOK_SECRET` - Webhook secret for verifying webhook requests (KEEP THIS SECRET!)

**Important:** 
- `NEXT_PUBLIC_PAYCHANGU_PUBLIC_KEY` (recommended) or `PAYCHANGU_PUBLIC_KEY` can be used client-side (safe to expose)
- `PAYCHANGU_SECRET_KEY` and `PAYCHANGU_WEBHOOK_SECRET` are server-side only. Never expose them to the client.

### Cloudinary Media Storage

**Where to get these:**
1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Sign in to your account
3. Go to Settings > Security
4. Copy your API credentials

**Variables needed:**
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Your Cloudinary API Key
- `CLOUDINARY_API_SECRET` - Your Cloudinary API Secret (KEEP THIS SECRET!)
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` - Upload preset name (create one in Settings > Upload)

**Note:** 
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` are public (safe to expose)
- `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are server-side only

## File Structure

```
main/
├── .env.local.example    # Template file (safe to commit)
├── .env.local            # Your actual variables (DO NOT COMMIT)
└── ENV_SETUP.md         # This guide
```

## Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use different credentials for development and production**
3. **Rotate secrets regularly** - Especially if they're exposed
4. **Use environment-specific files:**
   - `.env.local` - Local development (highest priority)
   - `.env.development` - Development environment
   - `.env.production` - Production environment

## Variable Naming Convention

- **`NEXT_PUBLIC_*`** - Variables that are safe to expose to the client (browser)
- **No prefix** - Server-side only variables (never exposed to client)

## Verification

After setting up your environment variables, verify they're loaded:

1. Check the browser console for Firebase initialization
2. Check server logs for Paychangu/Cloudinary configuration errors
3. Test a payment flow to ensure Paychangu is configured
4. Test image upload to ensure Cloudinary is configured

## Troubleshooting

### Firebase not initializing
- Check that all `NEXT_PUBLIC_FIREBASE_*` variables are set
- Verify the values match your Firebase project settings
- Check browser console for specific error messages

### Paychangu errors
- Ensure `PAYCHANGU_PUBLIC_KEY` and `PAYCHANGU_SECRET_KEY` are set
- Verify webhook secret matches your Paychangu dashboard
- Check that API routes can access server-side variables

### Cloudinary errors
- Verify `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set
- Check that upload preset exists and is configured correctly
- Ensure API key and secret are correct for server-side operations

## Production Deployment

For production, set these variables in your hosting platform:

- **Vercel:** Project Settings > Environment Variables
- **Netlify:** Site Settings > Build & Deploy > Environment
- **Other platforms:** Check their documentation for environment variable setup

Make sure to:
1. Use production credentials (not development)
2. Set all required variables
3. Enable environment variable encryption if available
4. Set up webhook URLs in Paychangu dashboard pointing to your production domain

