/**
 * Service detail page with image gallery, booking form (date/time/attendees), and book now
 */

import type { Metadata } from 'next';
import { generateItemMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import { getItemBySlug } from '@/lib/items';
import { isService } from '@/types';
import ServiceDetailPageClient from './ServiceDetailPageClient';

/**
 * Generate metadata for service page (runs server-side)
 */
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<Metadata> {
  const { slug } = await params;
  
    try {
      const item = await getItemBySlug(slug);
      if (item && isService(item)) {
      const business = await getBusiness();
      return generateItemMetadata(item, business);
      }
    } catch (error) {
    console.error('Error generating service metadata:', error);
  }
  
  // Fallback metadata
  return {
    title: 'Service Not Found',
    description: 'The service you are looking for could not be found.',
  };
}

export default function ServiceDetailPage() {
  return <ServiceDetailPageClient />;
}
