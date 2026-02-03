/**
 * Refund Policy page
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import RefundPageClient from './RefundPageClient';

/**
 * Generate metadata for refund page (runs server-side)
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generatePageMetadata(
      'Refund Policy',
      `Read ${business?.name || 'our'} Refund Policy to understand our refund procedures, eligibility criteria, and processing times.`,
      '/refund',
      business
    );
    } catch (error) {
    console.error('Error generating refund metadata:', error);
    return generatePageMetadata(
      'Refund Policy',
      'Read our Refund Policy to understand our refund procedures, eligibility criteria, and processing times.',
      '/refund',
      null
    );
  }
}

export default function RefundPage() {
  return <RefundPageClient />;
}
