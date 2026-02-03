/**
 * Payment email notifications
 * Sends emails to customers after payment completion (success or failure)
 */

import { sendEmail } from './service';
import { generatePaymentSuccessEmail, generatePaymentFailureEmail } from './templates/payment';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/collections';

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
  status: 'success' | 'failed';
}

/**
 * Send payment notification email to customer
 * Tracks email sent status in payment document to prevent duplicates
 */
export async function sendPaymentEmail(
  data: PaymentEmailData,
  source: string = 'unknown'
): Promise<void> {
  const { customerEmail, txRef, status } = data;

  if (!customerEmail) {
    console.log(`[${source.toUpperCase()}] No customer email provided, skipping email notification`);
    return;
  }

  try {
    // Check if email was already sent by checking payment document
    const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
    const paymentQuery = query(
      paymentsRef,
      where('txRef', '==', txRef)
    );
    const paymentDocs = await getDocs(paymentQuery);

    if (!paymentDocs.empty) {
      const paymentDoc = paymentDocs.docs[0];
      const paymentData = paymentDoc.data();
      
      // Check if email was already sent for this status
      const emailSentKey = status === 'success' ? 'successEmailSent' : 'failureEmailSent';
      if (paymentData[emailSentKey]) {
        console.log(`[${source.toUpperCase()}] Payment email already sent for ${status} status, skipping. txRef:`, txRef);
        return;
      }
    }

    // Generate email content
    const emailContent = status === 'success'
      ? generatePaymentSuccessEmail(data)
      : generatePaymentFailureEmail(data);

    // Send email
    await sendEmail({
      to: customerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    // Mark email as sent in payment document
    if (!paymentDocs.empty) {
      const paymentDoc = paymentDocs.docs[0];
      await updateDoc(doc(db, COLLECTIONS.PAYMENTS, paymentDoc.id), {
        [status === 'success' ? 'successEmailSent' : 'failureEmailSent']: true,
        [`${status}EmailSentAt`]: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`[${source.toUpperCase()}] Payment ${status} email sent and marked in payment document. txRef:`, txRef);
    } else {
      console.log(`[${source.toUpperCase()}] Payment ${status} email sent (payment document not found to mark). txRef:`, txRef);
    }
  } catch (error) {
    // Don't throw - email failures shouldn't break payment processing
    console.error(`[${source.toUpperCase()}] Failed to send payment email:`, error);
    // Log error but continue processing
  }
}

