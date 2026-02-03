import sanitizeHtml from 'sanitize-html';
export function sanitizeHtmlContent(dirtyHtml: string): string {
  if (!dirtyHtml) return '';

  const clean = sanitizeHtml(dirtyHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'iframe']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'loading'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
    },
    allowedSchemesByTag: {
      iframe: ['https'],
      img: ['data', 'http', 'https'],
    },
    transformTags: {
      // Attributes are untyped at runtime - accept optional string values here
      iframe: (tagName: string, attribs: Record<string, string | undefined>) => {
        const src = attribs?.src || '';
        // Whitelist trusted hosts for iframes (Google Maps, YouTube, OpenStreetMap)
        const allowedHosts = [
          'www.google.com',
          'maps.google.com',
          'www.youtube.com',
          'www.youtube-nocookie.com',
          'www.openstreetmap.org',
        ];

        try {
          const url = new URL(src);
          if (!allowedHosts.includes(url.hostname)) {
            // Replace disallowed iframe with an empty div
            return { tagName: 'div', text: '', attribs: {} as Record<string, string> };
          }
        } catch {
          return { tagName: 'div', text: '', attribs: {} as Record<string, string> };
        }

        return {
          tagName: 'iframe',
          attribs: {
            src: String(attribs.src || ''),
            width: String(attribs.width || '600'),
            height: String(attribs.height || '450'),
            loading: 'lazy',
          },
        };
      },
    },

  });

  return clean;
}
