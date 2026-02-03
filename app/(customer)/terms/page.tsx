/**
 * Terms & Conditions page
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import TermsPageClient from './TermsPageClient';

/**
 * Generate metadata for terms page (runs server-side)
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generatePageMetadata(
      'Terms & Conditions',
      `Read ${business?.name || 'our'} Terms & Conditions to understand the rules and guidelines for using our services.`,
      '/terms',
      business
    );
  } catch (error) {
    console.error('Error generating terms metadata:', error);
    return generatePageMetadata(
      'Terms & Conditions',
      'Read our Terms & Conditions to understand the rules and guidelines for using our services.',
      '/terms',
      null
    );
  }
}

export default function TermsPage() {
  return <TermsPageClient />;
}
