/**
 * Email templates for payment notifications
 */

interface PaymentEmailData {
  customerName?: string;
  customerEmail: string;
  amount: number;
  currency: string;
  txRef: string;
  transactionId?: string;
  orderId?: string;
  orderNumber?: string;
  bookingId?: string;
  bookingNumber?: string;
  paymentMethod?: string;
  failureReason?: string;
}

/**
 * Generate payment success email HTML
 */
export function generatePaymentSuccessEmail(data: PaymentEmailData): { subject: string; html: string; text: string } {
  const { customerName, amount, currency, txRef, orderId, orderNumber, bookingId, bookingNumber, paymentMethod } = data;
  const displayName = customerName || 'Customer';
  const reference = orderNumber || bookingNumber || orderId || bookingId || txRef;
  const type = orderId ? 'Order' : 'Booking';
  
  const subject = `Payment Confirmed - ${type} #${reference}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Payment Confirmed</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${displayName},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      We're pleased to confirm that your payment has been successfully processed.
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
      <h2 style="margin-top: 0; color: #333; font-size: 20px;">Payment Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>${type} Reference:</strong></td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px; color: #333;">#${reference}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Transaction ID:</strong></td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px; color: #333; font-family: monospace;">${txRef}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Amount Paid:</strong></td>
          <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #4caf50;">${formatCurrency(amount, currency)}</td>
        </tr>
        ${paymentMethod ? `
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Payment Method:</strong></td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px; color: #333;">${formatPaymentMethod(paymentMethod)}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <p style="font-size: 16px; margin-top: 30px;">
      ${orderId 
        ? 'Your order is being processed and you will receive updates on its status. You can track your order in your account dashboard.'
        : 'Your booking has been confirmed. We look forward to serving you!'
      }
    </p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 14px; color: #666; margin: 0;">
        If you have any questions, please don't hesitate to contact our support team.
      </p>
      <p style="font-size: 14px; color: #666; margin: 10px 0 0 0;">
        Thank you for your business!
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
    <p>This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim();
  
  const text = `
Payment Confirmed - ${type} #${reference}

Dear ${displayName},

We're pleased to confirm that your payment has been successfully processed.

Payment Details:
- ${type} Reference: #${reference}
- Transaction ID: ${txRef}
- Amount Paid: ${formatCurrency(amount, currency)}
${paymentMethod ? `- Payment Method: ${formatPaymentMethod(paymentMethod)}` : ''}

${orderId 
  ? 'Your order is being processed and you will receive updates on its status. You can track your order in your account dashboard.'
  : 'Your booking has been confirmed. We look forward to serving you!'
}

If you have any questions, please don't hesitate to contact our support team.

Thank you for your business!

---
This is an automated message. Please do not reply to this email.
  `.trim();
  
  return { subject, html, text };
}

/**
 * Generate payment failure email HTML
 */
export function generatePaymentFailureEmail(data: PaymentEmailData): { subject: string; html: string; text: string } {
  const { customerName, amount, currency, txRef, orderId, orderNumber, bookingId, bookingNumber, failureReason } = data;
  const displayName = customerName || 'Customer';
  const reference = orderNumber || bookingNumber || orderId || bookingId || txRef;
  const type = orderId ? 'Order' : 'Booking';
  
  const subject = `Payment Failed - ${type} #${reference}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">❌ Payment Failed</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${displayName},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      We're sorry to inform you that your payment could not be processed at this time.
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
      <h2 style="margin-top: 0; color: #333; font-size: 20px;">Transaction Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>${type} Reference:</strong></td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px; color: #333;">#${reference}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Transaction ID:</strong></td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px; color: #333; font-family: monospace;">${txRef}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Amount:</strong></td>
          <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #333;">${formatCurrency(amount, currency)}</td>
        </tr>
        ${failureReason ? `
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Reason:</strong></td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px; color: #f44336;">${failureReason}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>What happens next?</strong><br>
        ${orderId 
          ? 'Your order has been created but is pending payment. You can retry the payment or contact support for assistance.'
          : 'Your booking request has been saved but is pending payment. You can retry the payment or contact support for assistance.'
        }
      </p>
    </div>
    
    <p style="font-size: 16px; margin-top: 30px;">
      Common reasons for payment failure include:
    </p>
    <ul style="font-size: 14px; color: #666; line-height: 1.8;">
      <li>Insufficient funds in your account</li>
      <li>Card expiration or incorrect card details</li>
      <li>Bank security restrictions</li>
      <li>Network connectivity issues</li>
    </ul>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 14px; color: #666; margin: 0;">
        If you believe this is an error, please contact our support team for assistance.
      </p>
      <p style="font-size: 14px; color: #666; margin: 10px 0 0 0;">
        We're here to help!
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
    <p>This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim();
  
  const text = `
Payment Failed - ${type} #${reference}

Dear ${displayName},

We're sorry to inform you that your payment could not be processed at this time.

Transaction Details:
- ${type} Reference: #${reference}
- Transaction ID: ${txRef}
- Amount: ${formatCurrency(amount, currency)}
${failureReason ? `- Reason: ${failureReason}` : ''}

What happens next?
${orderId 
  ? 'Your order has been created but is pending payment. You can retry the payment or contact support for assistance.'
  : 'Your booking request has been saved but is pending payment. You can retry the payment or contact support for assistance.'
}

Common reasons for payment failure include:
- Insufficient funds in your account
- Card expiration or incorrect card details
- Bank security restrictions
- Network connectivity issues

If you believe this is an error, please contact our support team for assistance.

We're here to help!

---
This is an automated message. Please do not reply to this email.
  `.trim();
  
  return { subject, html, text };
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'MWK',
  }).format(amount);
}

/**
 * Format payment method for display
 */
function formatPaymentMethod(method: string | undefined | null): string {
  // Default to Paychangu if unknown or empty
  if (!method || method.toLowerCase() === 'unknown' || method.trim() === '') {
    return 'Paychangu';
  }
  
  const methodMap: Record<string, string> = {
    'card': 'Credit/Debit Card',
    'mobile_money': 'Mobile Money',
    'bank_transfer': 'Bank Transfer',
  };
  
  return methodMap[method.toLowerCase()] || method;
}

