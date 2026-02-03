'use client';

import React from 'react';
import { X, Bot, Send } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/config/siteConfig';

interface AdminAiModalProps {
  open: boolean;
  onClose: () => void;
}

export const AdminAiModal: React.FC<AdminAiModalProps> = ({ open, onClose }) => {
  const [aiMessages, setAiMessages] = React.useState<Array<{ id?: string; sender: 'user' | 'ai'; text?: string; html?: string; confidence?: 'high' | 'medium' | 'low' | 'unknown'; uncertain?: boolean }>>([]);
  const [aiInput, setAiInput] = React.useState('');
  const [aiLoading, setAiLoading] = React.useState(false);
  const messagesRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }, 50);
    }
  }, [open, aiMessages]);

  const sendAiMessage = async () => {
    const trimmed = aiInput.trim();
    if (!trimmed) return;
    const userId = `u-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    setAiMessages(prev => [...prev, { id: userId, sender: 'user', text: trimmed }]);
    setAiLoading(true);
    setAiInput('');

    try {
      const res = await fetch('/api/ai-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, topic: 'admin' }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setAiMessages(prev => [...prev, { sender: 'ai', text: `AI error: ${json?.error || 'unknown'}`, confidence: 'unknown' }]);
      } else {
        const aiId = `ai-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        const replyText = json.reply || 'No response';
        const replyHtml = json.html || undefined;
        const confidence = json.confidence || 'unknown';
        const uncertain = !!json.uncertain;
        setAiMessages(prev => [...prev, { id: aiId, sender: 'ai', text: replyText, html: replyHtml, confidence, uncertain }]);
      }
    } catch (err) {
      console.error('AI error', err);
      setAiMessages(prev => [...prev, { sender: 'ai', text: 'Error contacting AI support.', confidence: 'unknown' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const openEmailDevelopers = (question: string, aiReply?: string, confidence?: string) => {
    const devEmail = SITE_CONFIG.developerSupportEmail || SITE_CONFIG.defaultContactEmail || '';
    if (!devEmail) {
      // fallback: open contact page
      window.open('/admin/guide', '_blank');
      return;
    }

    const subject = encodeURIComponent(`Developer support request: ${question.slice(0, 80)}`);
    const bodyLines = [
      'Developer support request via Admin AI Support',
      '',
      `Question: ${question}`,
      '',
      `AI reply: ${aiReply || ''}`,
      '',
      `Confidence: ${confidence || 'unknown'}`,
      '',
      'Please include steps to reproduce, relevant logs, and any screenshots. Thank you.',
      '',
      `Admin dashboard: ${SITE_CONFIG.appUrl || ''}`,
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    const mailto = `mailto:${devEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl mx-4 bg-card rounded-lg border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <h3 className="font-semibold">{SITE_CONFIG.aiSupportName ? `${SITE_CONFIG.aiSupportName} (Admin)` : 'Admin AI Support'}</h3>
            </div>
            {SITE_CONFIG.aiSupportDescription && (
              <div className="text-xs text-text-secondary">{SITE_CONFIG.aiSupportDescription}</div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="p-2" aria-label="Close AI chat">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div ref={messagesRef} className="h-64 overflow-y-auto bg-background p-2 rounded mb-3">
            {aiMessages.length === 0 ? (
              <p className="text-sm text-text-secondary">Ask about using the admin panel, managing orders, bookings, or refunds.</p>
            ) : (
              aiMessages.map((m, idx) => (
                <div key={m.id || idx} className={`mb-2 ${m.sender === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block rounded-md p-2 ${m.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}>
                    {m.html ? (
                      <div dangerouslySetInnerHTML={{ __html: m.html }} />
                    ) : (
                      <div>{m.text}</div>
                    )}

                    {/* Confidence hint for admins */}
                    {m.sender === 'ai' && m.confidence && m.confidence !== 'unknown' && (
                      <div className="mt-1 text-xs text-text-secondary italic">Confidence: {m.confidence}{m.uncertain ? ' — this may be incomplete. Email developers or verify in the admin UI.' : ''}</div>
                    )}

                    {/* Email developers button when AI uncertain or low confidence */}
                    {m.sender === 'ai' && (m.uncertain || m.confidence === 'low') && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => openEmailDevelopers(aiMessages.find(x => x.sender === 'user')?.text || '', m.text || '', m.confidence)}
                          className="inline-flex items-center gap-2 px-2 py-1 rounded border text-sm bg-muted hover:opacity-95"
                        >
                          Email developers
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void sendAiMessage(); }}
              className="flex-1 border border-border rounded px-2 py-1"
              placeholder="Ask AI about admin tasks"
              aria-label="Ask AI about admin tasks"
            />
            <button
              onClick={() => void sendAiMessage()}
              disabled={aiLoading || !aiInput.trim()}
              className="px-3 py-1 rounded bg-primary text-primary-foreground"
              aria-label="Send message to AI"
            >
              {aiLoading ? '...' : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
