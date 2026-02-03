/**
 * Contact Us page
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import ContactPageClient from './ContactPageClient';

/**
 * Generate metadata for contact page (runs server-side)
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generatePageMetadata(
      'Contact Us',
      `Get in touch with ${business?.name || 'us'}. Reach out for inquiries, support, or partnerships.`,
      '/contact',
      business
    );
    } catch (error) {
    console.error('Error generating contact metadata:', error);
    return generatePageMetadata(
      'Contact Us',
      'Get in touch with us. Reach out for inquiries, support, or partnerships.',
      '/contact',
      null
    );
  }
}

export default function ContactPage() {
  return <ContactPageClient />;
}
