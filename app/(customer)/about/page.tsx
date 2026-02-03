/**
 * About Us page
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import AboutPageClient from './AboutPageClient';

/**
 * Generate metadata for about page (runs server-side)
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generatePageMetadata(
      'About Us',
      `Learn more about ${business?.name || 'our business'}, our mission, values, and the team behind our success.`,
      '/about',
      business
    );
  } catch (error) {
    console.error('Error generating about metadata:', error);
    return generatePageMetadata(
      'About Us',
      'Learn more about our business, our mission, values, and the team behind our success.',
      '/about',
      null
    );
  }
}

export default function AboutPage() {
  return <AboutPageClient />;
}
