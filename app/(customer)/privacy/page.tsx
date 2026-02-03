/**
 * Privacy Policy page
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import PrivacyPageClient from './PrivacyPageClient';

/**
 * Generate metadata for privacy page (runs server-side)
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generatePageMetadata(
      'Privacy Policy',
      `Read ${business?.name || 'our'} Privacy Policy to understand how we collect, use, and protect your personal information.`,
      '/privacy',
      business
    );
    } catch (error) {
    console.error('Error generating privacy metadata:', error);
    return generatePageMetadata(
      'Privacy Policy',
      'Read our Privacy Policy to understand how we collect, use, and protect your personal information.',
      '/privacy',
      null
    );
  }
}

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
