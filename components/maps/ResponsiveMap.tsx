'use client';

import React from 'react';
import { sanitizeHtmlContent } from '@/lib/utils/sanitizeHtml';

interface ResponsiveMapProps {
  html: string;
}

export default function ResponsiveMap({ html }: ResponsiveMapProps) {
  if (!html) return null;

  // Server-side fallback (no DOMParser available)
  if (typeof window === 'undefined') {
    return (
      <div className="aspect-video w-full rounded-lg overflow-hidden border border-border">
        <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(html) }} />
      </div>
    );
  }

  // Client-side: attempt to parse iframe details safely (no JSX inside try/catch)
  const allowedHosts = [
    'www.google.com',
    'maps.google.com',
    'www.youtube.com',
    'www.youtube-nocookie.com',
    'www.openstreetmap.org',
  ];

  let hasIframe = false;
  let src = '';
  let w = 600;
  let h = 450;
  let hostAllowed = false;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const iframe = doc.querySelector('iframe');

    if (iframe) {
      hasIframe = true;
      src = iframe.getAttribute('src') || '';
      w = parseInt(iframe.getAttribute('width') || '', 10) || 600;
      h = parseInt(iframe.getAttribute('height') || '', 10) || 450;

      try {
        const url = new URL(src);
        hostAllowed = allowedHosts.includes(url.hostname);
      } catch {
        hostAllowed = false;
      }
    }
  } catch {
    // Parsing failed -> fallback to sanitized markup below
    hasIframe = false;
  }

  // If we couldn't find a trusted iframe, show sanitized HTML fallback
  if (!hasIframe || !hostAllowed) {
    return (
      <div className="aspect-video w-full rounded-lg overflow-hidden border border-border">
        <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(html) }} />
      </div>
    );
  }

  // Render responsive iframe using computed aspect ratio
  const aspectStyle: React.CSSProperties = { aspectRatio: `${w}/${h}` };

  return (
    <div className="w-full rounded-lg overflow-hidden border border-border" style={aspectStyle}>
      <iframe
        src={src}
        title="Business location map"
        className="w-full h-full"
        width="100%"
        height="100%"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
