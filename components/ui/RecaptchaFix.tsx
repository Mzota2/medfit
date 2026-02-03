'use client';

import { useEffect } from 'react';

export default function RecaptchaFix() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ensureBadge = (el: Element) => {
      try {
        // Move the badge to the body so it's not clipped by overflow: hidden parents
        if (el && el.parentElement && el.parentElement !== document.body) {
          document.body.appendChild(el);
        }
        // Apply inline styles to be extra sure (some pages add inline styles)
        if (el instanceof HTMLElement) {
          el.style.position = 'fixed';
          el.style.bottom = '12px';
          el.style.right = '12px';
          el.style.zIndex = '99999';
          el.style.pointerEvents = 'auto';
          el.style.transform = 'none';
        }
      } catch (e) {
        // ignore
        console.warn('RecaptchaFix: failed to ensure badge positioning', e);
      }
    };

    // Try to find any existing badge immediately
    const existing = document.querySelectorAll('.grecaptcha-badge');
    existing.forEach(ensureBadge);

    // Observe DOM mutations to catch badges injected later
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (!(node instanceof Element)) continue;
          if (node.classList && node.classList.contains('grecaptcha-badge')) {
            ensureBadge(node);
          }
          // Sometimes Google injects a div without the class but containing an iframe with title="reCAPTCHA"
          const iframe = node.querySelector && node.querySelector('iframe[title="reCAPTCHA"]');
          if (iframe) {
            const badge = iframe.closest('.grecaptcha-badge') || iframe.parentElement;
            if (badge) ensureBadge(badge);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
