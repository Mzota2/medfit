/**
 * Returns & Refund Policy page
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import ReturnsPageClient from './ReturnsPageClient';

/**
 * Generate metadata for returns page (runs server-side)
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generatePageMetadata(
      'Returns & Refund Policy',
      `Read ${business?.name || 'our'} Returns & Refund Policy to understand our return procedures, eligibility criteria, and refund processes.`,
      '/returns',
      business
    );
    } catch (error) {
    console.error('Error generating returns metadata:', error);
    return generatePageMetadata(
      'Returns & Refund Policy',
      'Read our Returns & Refund Policy to understand our return procedures, eligibility criteria, and refund processes.',
      '/returns',
      null
    );
  }
}

export default function ReturnsPage() {
  return <ReturnsPageClient />;
}
