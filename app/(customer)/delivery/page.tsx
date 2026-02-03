/**
 * Delivery Policy page
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import DeliveryPageClient from './DeliveryPageClient';

/**
 * Generate metadata for delivery page (runs server-side)
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generatePageMetadata(
      'Delivery Policy',
      `Read ${business?.name || 'our'} Delivery Policy to understand our delivery options, timeframes, charges, and pickup information.`,
      '/delivery',
      business
    );
    } catch (error) {
    console.error('Error generating delivery metadata:', error);
    return generatePageMetadata(
      'Delivery Policy',
      'Read our Delivery Policy to understand our delivery options, timeframes, charges, and pickup information.',
      '/delivery',
      null
    );
  }
}

export default function DeliveryPage() {
  return <DeliveryPageClient />;
}
