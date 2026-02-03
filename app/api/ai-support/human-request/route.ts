import { NextResponse } from 'next/server';
import { notifyCustomerSupportMessage } from '@/lib/notifications';

declare global {
  var __aiHumanRequestRateLimit: Map<string, { count: number; first: number }> | undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userMessage,
      aiReply,
      topic = 'general',
      customerEmail,
      customerName,
      customerId,
      confidence,
    } = body || {};

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userMessage' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const key = customerId || customerEmail || ip;

    // Basic rate limiting (per key)
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxRequests = 3; // per hour
    global.__aiHumanRequestRateLimit = global.__aiHumanRequestRateLimit || new Map();

    const rateMap = global.__aiHumanRequestRateLimit;
    const entry = rateMap.get(key) || { count: 0, first: now };
    if (now - entry.first > windowMs) {
      entry.count = 0;
      entry.first = now;
    }
    entry.count++;
    rateMap.set(key, entry);
    if (entry.count > maxRequests) {
      return NextResponse.json({ error: 'Too many support requests, please try again later.' }, { status: 429 });
    }

    const subject = `AI Support Request${topic ? ` — ${topic}` : ''}`;
    const messageId = `ai-escalation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const message = `User message: ${userMessage}\n\nAI reply: ${aiReply || 'N/A'}\n\nConfidence: ${confidence || 'unknown'}\n\nMessage ID: ${messageId}`;

    await notifyCustomerSupportMessage({
      customerEmail: customerEmail || 'guest',
      customerName: customerName || undefined,
      customerId: customerId || undefined,
      subject,
      message,
      messageId,
    });

    return NextResponse.json({ success: true, messageId });
  } catch (err) {
    console.error('Human support request error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
