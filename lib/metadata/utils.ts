/**
 * Metadata utilities for SEO and social sharing
 */

import type { Metadata } from 'next';
import { getAppBaseUrl } from '@/lib/paychangu/config';
import { SITE_CONFIG } from '@/lib/config/siteConfig';

/**
 * Get the site base URL
 */
export const getSiteUrl = (): string => {
  // Prefer configured public app URL from SITE_CONFIG; fall back to Paychangu-configured base URL
  return SITE_CONFIG.appUrl || getAppBaseUrl();
};

/**
 * Generate metadata for a product or service
 */
export const generateItemMetadata = async (
  item: {
    name: string;
    description?: string;
    images: Array<{ url: string; alt?: string }>;
    pricing: { basePrice: number; currency: string };
    type: 'product' | 'service';
    slug: string;
    seo?: {
      title?: string;
      description?: string;
      keywords?: string[];
    };
  },
  business?: { name: string; logo?: string; description?: string } | null
): Promise<Metadata> => {
  const siteUrl = getSiteUrl();
  const businessName = business?.name || SITE_CONFIG.defaultBusinessName || SITE_CONFIG.appTitle;
  
  // Use SEO title/description if available, otherwise use item name/description
  const title = item.seo?.title || `${item.name} | ${businessName}`;
  const description = item.seo?.description || item.description || `Shop ${item.name} at ${businessName}`;
  const keywords = item.seo?.keywords || [item.name, item.type, businessName];
  
  // Get the main image URL
  const imageUrl = item.images?.[0]?.url || '/placeholder-product.jpg';
  // Make sure image URL is absolute
  const absoluteImageUrl = imageUrl.startsWith('http') 
    ? imageUrl 
    : `${siteUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
  
  const itemUrl = `${siteUrl}/${item.type === 'product' ? 'products' : 'services'}/${item.slug}`;

  return {
    title,
    description,
    keywords: keywords.join(', '),
    openGraph: {
      title,
      description,
      url: itemUrl,
      siteName: businessName,
      images: [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: item.images?.[0]?.alt || item.name,
        },
      ],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteImageUrl],
      creator: business?.name,
    },
    alternates: {
      canonical: itemUrl,
    },
    other: {
      'product:price:amount': item.pricing.basePrice.toString(),
      'product:price:currency': item.pricing.currency,
    },
  };
};

/**
 * Generate metadata for the home page
 */
export const generateHomeMetadata = async (
  business?: { name: string; description?: string; logo?: string } | null
): Promise<Metadata> => {
  const siteUrl = getSiteUrl();
  const businessName = business?.name || SITE_CONFIG.defaultBusinessName || SITE_CONFIG.appTitle;
  const businessDescription = business?.description || SITE_CONFIG.appDescription;
  
  const title = `${businessName} - Quality Products & Services Online`;
  const description = businessDescription;
  
  const logoUrl = business?.logo || SITE_CONFIG.brandImageUrl || '/logo.png';
  const absoluteLogoUrl = logoUrl.startsWith('http') 
    ? logoUrl 
    : `${siteUrl}${logoUrl.startsWith('/') ? logoUrl : '/' + logoUrl}`;

  return {
    title,
    description,
    keywords: [businessName, 'e-commerce', 'online shopping', 'products', 'services', 'quality'],
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: businessName,
      images: [
        {
          url: absoluteLogoUrl,
          width: 1200,
          height: 630,
          alt: `${businessName} Logo`,
        },
      ],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteLogoUrl],
      creator: businessName,
    },
    alternates: {
      canonical: siteUrl,
    },
  };
};

/**
 * Generate metadata for other pages (about, contact, etc.)
 */
export const generatePageMetadata = (
  title: string,
  description: string,
  path: string,
  business?: { name: string; logo?: string } | null
): Metadata => {
  const siteUrl = getSiteUrl();
  const businessName = business?.name || SITE_CONFIG.defaultBusinessName || SITE_CONFIG.appTitle;
  const fullTitle = `${title} | ${businessName}`;
  const pageUrl = `${siteUrl}${path}`;
  
  const logoUrl = business?.logo || SITE_CONFIG.brandImageUrl || '/logo.png';
  const absoluteLogoUrl = logoUrl.startsWith('http') 
    ? logoUrl 
    : `${siteUrl}${logoUrl.startsWith('/') ? logoUrl : '/' + logoUrl}`;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url: pageUrl,
      siteName: businessName,
      images: [
        {
          url: absoluteLogoUrl,
          width: 1200,
          height: 630,
          alt: `${businessName} Logo`,
        },
      ],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [absoluteLogoUrl],
      creator: businessName,
    },
    alternates: {
      canonical: pageUrl,
    },
  };
};

/**
 * Generate metadata for admin pages (noindex, nofollow)
 */
export const generateAdminMetadata = (title: string): Metadata => {
  return {
    title: `${title} | Admin`,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    openGraph: {
      title: `${title} | Admin`,
      type: 'website',
    },
  };
};

