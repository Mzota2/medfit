# Gmail Email Setup Guide

This guide shows you how to configure the email service to send emails from a Gmail address.

## Why Gmail?

- ✅ Free to use
- ✅ No domain verification needed
- ✅ Easy to set up
- ✅ Good for small businesses/startups
- ⚠️ Daily sending limits (500 emails/day for free accounts)
- ⚠️ May have lower deliverability than dedicated services

## Step-by-Step Setup

### 1. Enable 2-Factor Authentication

1. Go to your [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled
3. This is required to generate an App Password

### 2. Generate App Password

1. Go to [Google Account App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" as the app
3. Select "Other (Custom name)" as the device
4. Enter a name like "TechCure Payment Emails"
5. Click "Generate"
6. **Copy the 16-character password** (you'll need this)

### 3. Configure Environment Variables

Add to your `.env.local` file:

```bash
# Use SMTP provider
EMAIL_PROVIDER=smtp

# Gmail SMTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Your Business Name
```

**Example:**
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=techcure@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=techcure@gmail.com
EMAIL_FROM_NAME=TechCure
```

**Important Notes:**
- Use the **App Password**, not your regular Gmail password
- Remove spaces from the App Password (it's shown with spaces for readability)
- The `EMAIL_FROM` should match your `SMTP_USER`

### 4. Test the Configuration

1. Restart your development server
2. Make a test payment
3. Check your Gmail inbox for the payment confirmation email
4. Check server logs for any errors

## Troubleshooting

### "Invalid login" error
- ✅ Make sure you're using an App Password, not your regular password
- ✅ Make sure 2-Factor Authentication is enabled
- ✅ Check that the App Password doesn't have spaces

### "Connection timeout" error
- ✅ Check your firewall/network settings
- ✅ Try port 465 with `SMTP_PORT=465` (SSL instead of TLS)
- ✅ Make sure port 587 is not blocked

### Emails going to spam
- ✅ This is common with Gmail for transactional emails
- ✅ Consider using a dedicated email service (Resend/SendGrid) for better deliverability
- ✅ Make sure your email content follows best practices

### Daily limit reached
- ✅ Gmail free accounts have a 500 emails/day limit
- ✅ Consider upgrading to Google Workspace for higher limits
- ✅ Or switch to Resend/SendGrid for higher limits

## Alternative: Use Your Own Domain with Resend

If you have your own domain (e.g., techcure.tech), you can:

1. Sign up for Resend (free tier: 3,000 emails/month)
2. Verify your domain
3. Use `noreply@techcure.tech` as sender
4. Better deliverability than Gmail
5. Higher sending limits

See `README.md` for Resend setup instructions.

## Production Recommendations

For production, consider:
- **Resend** - Best for transactional emails, good deliverability
- **SendGrid** - Enterprise-grade, high limits
- **Gmail SMTP** - Good for small volume, may have deliverability issues

Gmail is fine for development and small businesses, but for high-volume or critical emails, a dedicated service is recommended.

