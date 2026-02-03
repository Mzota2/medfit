/**
 * Contact form submission API route
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { notifyCustomerSupportMessage } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get current user if authenticated
    const authHeader = request.headers.get('authorization');
    let customerId: string | undefined;
    
    if (authHeader) {
      try {
        // Extract user ID from token if available
        // This is a placeholder - implement actual auth token parsing
        // For now, we'll store the message without customerId
      } catch (error) {
        console.error('Error parsing auth token:', error);
      }
    }

    // Store contact message in Firestore
    // Using a generic 'messages' collection name since it's not in COLLECTIONS
    const messagesRef = collection(db, 'messages');
    const messageDoc = await addDoc(messagesRef, {
      name,
      email,
      subject,
      message,
      customerId: customerId || null,
      createdAt: serverTimestamp(),
      read: false,
    });

    // Create notification for admin
    try {
      await notifyCustomerSupportMessage({
        customerEmail: email,
        customerName: name,
        customerId,
        subject,
        message,
        messageId: messageDoc.id,
      });
    } catch (notifError) {
      console.error('Error creating customer support notification:', notifError);
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.',
      messageId: messageDoc.id,
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}

