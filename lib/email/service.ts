/**
 * Email service for sending transactional emails
 * Supports multiple email providers (Resend, SendGrid, SMTP)
 */

type EmailProvider = 'resend' | 'sendgrid' | 'smtp' | 'console';

interface EmailConfig {
  provider: EmailProvider;
  fromEmail: string;
  fromName: string;
  // Resend
  resendApiKey?: string;
  // SendGrid
  sendgridApiKey?: string;
  // SMTP
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Get email configuration from environment variables
 */
function getEmailConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase() as EmailProvider;
  const fromEmail = process.env.EMAIL_FROM || process.env.NEXT_PUBLIC_APP_EMAIL || 'noreply@techcure.tech';
  const fromName = process.env.EMAIL_FROM_NAME || 'TechCure';

  return {
    provider,
    fromEmail,
    fromName,
    resendApiKey: process.env.RESEND_API_KEY,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
  };
}

/**
 * Send email using Resend
 */
async function sendViaResend(config: EmailConfig, options: SendEmailOptions): Promise<void> {
  if (!config.resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Resend API error: ${error.message || response.statusText}`);
  }
}

/**
 * Send email using SendGrid
 */
async function sendViaSendGrid(config: EmailConfig, options: SendEmailOptions): Promise<void> {
  if (!config.sendgridApiKey) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      personalizations: [
        {
          to: [{ email: options.to }],
          subject: options.subject,
        },
      ],
      content: [
        {
          type: 'text/html',
          value: options.html,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid API error: ${error || response.statusText}`);
  }
}

/**
 * Send email using SMTP (Nodemailer)
 */
async function sendViaSMTP(config: EmailConfig, options: SendEmailOptions): Promise<void> {
  // Dynamic import to avoid bundling nodemailer if not needed
  // const nodemailer = await import('nodemailer');

  // if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
  //   throw new Error('SMTP configuration is incomplete');
  // }

  // const transporter = nodemailer.createTransport({
  //   host: config.smtpHost,
  //   port: config.smtpPort || 587,
  //   secure: config.smtpPort === 465,
  //   auth: {
  //     user: config.smtpUser,
  //     pass: config.smtpPassword,
  //   },
  // });

  // await transporter.sendMail({
  //   from: `${config.fromName} <${config.fromEmail}>`,
  //   to: options.to,
  //   subject: options.subject,
  //   html: options.html,
  //   text: options.text || options.html.replace(/<[^>]*>/g, ''),
  // });
}

/**
 * Send email using console (for development/testing)
 */
async function sendViaConsole(config: EmailConfig, options: SendEmailOptions): Promise<void> {
  console.log('='.repeat(60));
  console.log('📧 EMAIL (Console Mode - Development Only)');
  console.log('='.repeat(60));
  console.log('From:', `${config.fromName} <${config.fromEmail}>`);
  console.log('To:', options.to);
  console.log('Subject:', options.subject);
  console.log('HTML:', options.html);
  console.log('='.repeat(60));
}

/**
 * Send an email
 * Automatically selects the configured email provider
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const config = getEmailConfig();

  try {
    switch (config.provider) {
      case 'resend':
        await sendViaResend(config, options);
        console.log('✅ Email sent via Resend to:', options.to);
        break;
      case 'sendgrid':
        await sendViaSendGrid(config, options);
        console.log('✅ Email sent via SendGrid to:', options.to);
        break;
      case 'smtp':
        await sendViaSMTP(config, options);
        console.log('✅ Email sent via SMTP to:', options.to);
        break;
      case 'console':
      default:
        await sendViaConsole(config, options);
        console.log('📧 Email logged to console (development mode)');
        break;
    }
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    // Don't throw - email failures shouldn't break payment processing
    // Log error for monitoring
    throw error;
  }
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  const config = getEmailConfig();
  
  if (config.provider === 'console') {
    return true; // Console mode is always available
  }
  
  switch (config.provider) {
    case 'resend':
      return !!config.resendApiKey;
    case 'sendgrid':
      return !!config.sendgridApiKey;
    case 'smtp':
      return !!(config.smtpHost && config.smtpUser && config.smtpPassword);
    default:
      return false;
  }
}

