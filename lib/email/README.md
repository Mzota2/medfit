# Email Service Setup

This email service supports multiple email providers for sending transactional emails.

## Supported Providers

1. **Resend** (Recommended for production) - Modern email API (requires your own domain)
2. **SendGrid** - Popular email service (requires your own domain)
3. **SMTP** - Any SMTP server (Gmail, Outlook, custom) - **Use this if you want to send from Gmail**
4. **Console** (Development) - Logs emails to console

### Quick Decision Guide

- **Want to use Gmail?** → Use `EMAIL_PROVIDER=smtp` with Gmail SMTP settings
- **Have your own domain?** → Use `EMAIL_PROVIDER=resend` (recommended) or SendGrid
- **Just testing?** → Use `EMAIL_PROVIDER=console`

## Environment Variables

Add these to your `.env.local` file:

### Required (Choose one provider)

```bash
# Email Provider (resend, sendgrid, smtp, or console)
EMAIL_PROVIDER=resend

# Sender Information
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Business Name
```

### Resend Configuration

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Business Name
```

**Get API Key:** https://resend.com/api-keys

**Important:** 
- You **cannot** use a @gmail.com address with Resend
- You must use your own domain (e.g., noreply@yourdomain.com)
- You need to verify your domain in Resend dashboard
- If you want to use Gmail, use SMTP provider instead

### SendGrid Configuration

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Business Name
```

**Get API Key:** https://app.sendgrid.com/settings/api_keys

### SMTP Configuration (Gmail, Outlook, or Custom SMTP)

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Your Business Name
```

**For Gmail:**
1. Enable 2-Factor Authentication on your Google account
2. Generate an [App Password](https://support.google.com/accounts/answer/185833)
3. Use the App Password (not your regular password) in `SMTP_PASSWORD`
4. Use `smtp.gmail.com` as `SMTP_HOST` and port `587`
5. You can use your Gmail address in `EMAIL_FROM` (e.g., `yourname@gmail.com`)

**For Outlook/Hotmail:**
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
EMAIL_FROM=your-email@outlook.com
EMAIL_FROM_NAME=Your Business Name
```

**For Custom SMTP Server:**
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Business Name
```

### Development Mode (Console)

```bash
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Business Name
```

This will log emails to the console instead of sending them.

## Installation

For SMTP support, install nodemailer:

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

For Resend or SendGrid, no additional packages needed (uses fetch API).

## Usage

The email service is automatically integrated into payment processing:

- **Success emails** are sent when payment is confirmed
- **Failure emails** are sent when payment fails
- Emails are sent only once per transaction (idempotent)
- Email failures don't break payment processing

## Testing

1. Set `EMAIL_PROVIDER=console` for development
2. Check server logs for email content
3. Use a test email service like [Mailtrap](https://mailtrap.io/) for SMTP testing

## Email Templates

Payment emails include:
- Transaction details
- Order/Booking reference
- Amount and payment method
- Success/Failure status
- Support information

Templates are located in `lib/email/templates/payment.ts`

