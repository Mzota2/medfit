'use client';

import React, { useState } from 'react';
import { MessageCircle, Bot } from 'lucide-react';
import { useBusinesses } from '@/hooks';
import { SITE_CONFIG } from '@/lib/config/siteConfig';

export const AdminContact: React.FC<{ open?: boolean; onOpenAi?: () => void }> = ({ open = false, onOpenAi }) => {
  const [isOpen, setIsOpen] = useState(open);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const { data: businesses = [] } = useBusinesses({ limit: 1 });
  const business = businesses.length > 0 ? businesses[0] : null;
  // Prefer developer support contact details when available
  const email = SITE_CONFIG.developerSupportEmail || business?.contactInfo?.email || '';
  const phone = SITE_CONFIG.developerSupportPhone || business?.contactInfo?.phone || '';


  // Close popover when clicking outside
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isOpen]);
  const handleWhatsApp = () => {
    const formatted = (phone || '').replace(/[\s\-+]/g, '');
    const msg = 'Hello, I need help with the admin panel.';
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };



  return (
    <>
      <div className="flex items-center justify-between" ref={menuRef}>
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <span>Help & Support</span>
        </div>

        {/* Compact contact button */}
        <div className="relative">
          <button
            onClick={() => setIsOpen((s) => !s)}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary-hover transition-colors"
            aria-expanded={isOpen}
            aria-controls="admin-contact-popover"
            aria-haspopup="menu"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          {/* Popover menu */}
          {isOpen && (
            <div id="admin-contact-popover" role="menu" className="absolute right-0 bottom-full mb-2 w-44 bg-card rounded-lg shadow-lg border border-border overflow-visible z-50">
              <button
                onClick={() => { setIsOpen(false); onOpenAi?.(); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-background-secondary text-sm"
                role="menuitem"
              >
                <Bot className="w-4 h-4" />
                <span>{SITE_CONFIG.aiSupportName || 'AI Support'}</span>
              </button>

              <button
                onClick={() => { handleWhatsApp(); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-background-secondary text-sm"
                role="menuitem"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                <span>WhatsApp</span>
              </button>

              <a href={`mailto:${email}`} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-background-secondary text-sm" role="menuitem" aria-label="Contact via email">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 4.5h21v15h-21v-15zm2.25 1.5l8.25 6.375 8.25-6.375h-16.5zm0 12.75h16.5v-9.375l-8.25 6.375-8.25-6.375v9.375z"/></svg>
                <span>Email</span>
              </a>
            </div>
          )}
        </div>
      </div>


    </>
  );
};
