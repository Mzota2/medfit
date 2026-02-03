import type { Metadata } from 'next';
import { generateHomeMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import HomePageClient from './HomePageClient';

/**
 * Generate metadata for home page (runs server-side)
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generateHomeMetadata(business);
  } catch (error) {
    console.error('Error generating home metadata:', error);
    return generateHomeMetadata(null);
  }
}

export default function HomePage() {
  return <HomePageClient />;
}
