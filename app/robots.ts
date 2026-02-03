/**
 * Robots.txt configuration
 * Prevents search engines from indexing admin pages
 */

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/profile',
          '/settings',
          '/notifications',
          '/orders/',
          '/bookings/',
          '/cart',
          '/checkout',
          '/order-confirmed',
          '/book-confirmed',
          '/payment/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

