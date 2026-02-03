/**
 * Service listing page with filters, search, sorting, and pagination
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import ServicesPageClient from './ServicesPageClient';

/**
 * Generate metadata for services listing page (runs server-side)
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generatePageMetadata(
      'Services',
      `Browse our professional services at ${business?.name || 'our store'}. Book appointments, schedule consultations, and find the perfect service for your needs.`,
      '/services',
      business
    );
  } catch (error) {
    console.error('Error generating services metadata:', error);
    return generatePageMetadata(
      'Services',
      'Browse our professional services. Book appointments, schedule consultations, and find the perfect service for your needs.',
      '/services',
      null
    );
  }
}

export default function ServicesPage() {
  return <ServicesPageClient />;
}
