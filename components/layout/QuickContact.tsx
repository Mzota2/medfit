/**
 * Quick Contact floating button for customer support
 * Fixed position at bottom right of the screen
 * Allows users to contact via WhatsApp, Email, or Phone
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Mail, Phone, X, Bot, Send } from 'lucide-react';
import { useBusinesses } from '@/hooks';
import { sanitizeHtmlContent } from '@/lib/utils/sanitizeHtml';
import { useAuth } from '@/contexts/AuthContext';
import { SITE_CONFIG } from '@/lib/config/siteConfig';


export const QuickContact: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: businesses = [] } = useBusinesses({ limit: 1 });
  const { user } = useAuth();

  const business = businesses.length > 0 ? businesses[0] : null;
  const phoneNumber = business?.contactInfo?.phone || '';
  const email = business?.contactInfo?.email || '';
  const whatsappNumber = business?.contactInfo?.phone || '';
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format phone number for WhatsApp (remove any spaces, dashes, or +)
  const formatWhatsAppNumber = (number: string) => {
    return number.replace(/[\s\-+]/g, '');
  };

  const handleWhatsApp = () => {
    const formattedNumber = formatWhatsAppNumber(whatsappNumber);
    const message = 'Hello, I need help with my order.';
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Customer Inquiry');
    const body = encodeURIComponent('Hello, I need help with my order.');
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    setIsOpen(false);
  };

  const handlePhone = () => {
    // Format phone number for tel: link (remove spaces, keep +)
    const formattedPhone = phoneNumber.replace(/\s/g, '');
    window.location.href = `tel:${formattedPhone}`;
    setIsOpen(false);
  };

  // AI support state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ id?: string; sender: 'user' | 'ai'; text?: string; html?: string; confidence?: 'high' | 'medium' | 'low' | 'unknown'; uncertain?: boolean }>>([]);
  const [humanRequests, setHumanRequests] = useState<Record<string, { loading: boolean; sent: boolean }>>({});
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState<'ordering' | 'booking' | 'refund' | 'cancellation' | 'business'>('business');

  const aiMessagesRef = React.useRef<HTMLDivElement | null>(null);

  const sendAiMessage = async () => {
    const trimmed = aiInput.trim();
    if (!trimmed) return;

    // Append user message (generate id so we can reference it later if needed)
    const userMsgId = `u-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    setAiMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: trimmed }]);
    setAiLoading(true);
    setAiInput('');

    try {
      const res = await fetch('/api/ai-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, topic: aiTopic, businessId: business?.id }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        const errMsg = json?.error || 'AI service error';
        setAiMessages(prev => [...prev, { sender: 'ai', text: `Sorry, I couldn't reach AI support: ${errMsg}`, confidence: 'unknown' }]);
      } else {
        // Prefer sanitized HTML if the API provided it
        const replyText = json.reply || '';
        const replyHtml = json.html || null;
        const confidence = json.confidence || 'unknown';
        const uncertain = !!json.uncertain;

        const aiMsgId = `ai-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        if (replyHtml) {
          setAiMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', html: replyHtml, text: replyText, confidence, uncertain }]);
        } else {
          setAiMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', text: replyText, confidence, uncertain }]);
        }
      }
    } catch (err) {
      console.error('AI send error', err);
      setAiMessages(prev => [...prev, { sender: 'ai', text: 'An unexpected error occurred contacting AI support.', confidence: 'unknown' }]);
    } finally {
      setAiLoading(false);
      // Scroll to bottom after short delay
      setTimeout(() => {
        if (aiMessagesRef.current) {
          aiMessagesRef.current.scrollTop = aiMessagesRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  React.useEffect(() => {
    if (aiMessagesRef.current) {
      aiMessagesRef.current.scrollTop = aiMessagesRef.current.scrollHeight;
    }
  }, [aiMessages]);

  const CONTACT_OPTIONS = [
    {
      label: 'AI Support',
      icon: Bot,
      onClick: () => {
        setAiOpen(true);
        setIsOpen(false);
      },
      color: 'bg-background border-b border-border',
    },
    {
      label: 'WhatsApp',
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg {...props} className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      ),
      onClick: handleWhatsApp,
      color: 'bg-background border-b border-border',
    },
    {
      label: 'Email',
      icon: Mail,
      onClick: handleEmail,
      color: 'bg-background border-b border-border',
    },
    {
      label: 'Phone',
      icon: Phone,
      onClick: handlePhone,
      color: 'bg-background',
    },
  ];

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-100">
      {/* Contact Options Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 w-48 bg-card rounded-lg shadow-xl border border-border overflow-hidden transition-all duration-200 ease-in-out opacity-100 translate-y-0">
          {CONTACT_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.label}
                onClick={option.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 ${option.color} transition-colors first:rounded-t-lg last:rounded-b-lg hover:opacity-90`}
                aria-label={`Contact us via ${option.label}`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* AI Support Modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md mx-4 bg-card rounded-lg border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-border">
                      <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <h3 className="font-semibold">{SITE_CONFIG.aiSupportName || 'AI Support'}</h3>
                </div>
                {SITE_CONFIG.aiSupportDescription && (
                  <div className="text-xs text-text-secondary">{SITE_CONFIG.aiSupportDescription}</div>
                )}
              </div>
              <button onClick={() => setAiOpen(false)} className="p-2" aria-label="Close AI support">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3">
              <label className="text-xs text-text-secondary">Topic</label>
              <select
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value as 'ordering' | 'booking' | 'refund' | 'cancellation' | 'business')}
                className="w-full mt-2 mb-3 border border-border rounded px-2 py-1"
                aria-label="Select topic"
              >
                <option value="ordering">Ordering</option>
                <option value="booking">Booking</option>
                <option value="refund">Refund</option>
                <option value="cancellation">Cancellation</option>
                <option value="business">Business information</option>
              </select>

              <div className="text-xs text-text-secondary mb-2">AI will indicate if it is unsure. The responses are suggestions and not actions; do not share secrets or credentials.</div>

              <div ref={aiMessagesRef} className="h-56 overflow-y-auto border border-border rounded p-3 bg-background">
                {aiMessages.length === 0 && (
                  <p className="text-sm text-text-secondary">Ask about orders, bookings, refunds, cancellations, or business details.</p>
                )}
                {aiMessages.map((m, idx) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div key={m.id || idx} className={`mb-2 ${isUser ? 'text-right' : ''}`}>
                      <div className={`inline-block rounded-md p-2 max-w-[80%] leading-relaxed wrap-break-word ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}>
                        {m.html ? (
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(m.html || '') }} />
                        ) : (
                          <div>{m.text}</div>
                        )}

                        {/* Confidence / uncertainty hint for AI messages */}
                        {!isUser && m.confidence && m.confidence !== 'unknown' && (
                          <div className="mt-1 text-xs text-text-secondary italic">Confidence: {m.confidence}{m.uncertain ? ' — this may be incomplete. Verify or contact support.' : ''}</div>
                        )}

                        {/* Request human support button when AI is unsure or low confidence */}
                        {!isUser && (m.uncertain || m.confidence === 'low') && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={async () => {
                                const msgId = m.id || `ai-${idx}`;
                                setHumanRequests(prev => ({ ...prev, [msgId]: { loading: true, sent: false } }));
                                try {
                                  const payload = {
                                    userMessage: aiMessages.find(x => x.sender === 'user')?.text || '',
                                    aiReply: m.text || '',
                                    topic: aiTopic,
                                    customerEmail: user?.email || undefined,
                                    customerName: user?.displayName || undefined,
                                    customerId: user?.uid || undefined,
                                    confidence: m.confidence || 'unknown',
                                  };
                                  const res = await fetch('/api/ai-support/human-request', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload),
                                  });
                                  const json = await res.json();
                                  if (res.ok && json.success) {
                                    setHumanRequests(prev => ({ ...prev, [msgId]: { loading: false, sent: true } }));
                                  } else {
                                    setHumanRequests(prev => ({ ...prev, [msgId]: { loading: false, sent: false } }));
                                    console.error('Human request error', json);
                                  }
                                } catch (e) {
                                  console.error('Human request failed', e);
                                  setHumanRequests(prev => ({ ...prev, [m.id || `ai-${idx}`]: { loading: false, sent: false } }));
                                }
                              }}
                              className="inline-flex items-center gap-2 px-2 py-1 rounded border text-sm bg-muted hover:opacity-95"
                            >
                              {humanRequests[m.id || `ai-${idx}`]?.loading ? 'Requesting…' : (humanRequests[m.id || `ai-${idx}`]?.sent ? 'Requested' : 'Request human support')}
                            </button>

                            {humanRequests[m.id || `ai-${idx}`]?.sent && (
                              <div className="text-xs text-text-secondary">Human support requested — an admin will contact you.</div>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Encourage manual escalation when AI is unsure or low confidence */}
              {aiMessages.some(m => m.uncertain || m.confidence === 'low') && (
                <div className="mb-3 p-3 rounded border border-yellow-200 bg-yellow-50 text-sm">
                  <ol className="list-decimal list-inside">
                    <li><strong>Click Request human support</strong> next to the AI message.</li>
                    <li><strong>We will notify admins</strong> who can review the conversation and follow up.</li>
                    <li><strong>Admins will contact you</strong> via in-app notification or email.</li>
                  </ol>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { void sendAiMessage(); } }}
                  className="flex-1 border border-border rounded px-3 py-2 bg-background"
                  placeholder="Describe your issue or question"
                />
                <button
                  onClick={() => void sendAiMessage()}
                  disabled={aiLoading || aiInput.trim() === ''}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                >
                  {aiLoading ? '...' : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Contact Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${
          isOpen
            ? 'bg-destructive hover:bg-destructive/90'
            : 'bg-[#25D366] hover:bg-[#20BA5A]'
        } text-white`}
        aria-label={isOpen ? 'Close contact menu' : 'Contact us'}
        title="Contact us"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
        <span className="sr-only">Contact us</span>
      </button>
    </div>
  );
};

