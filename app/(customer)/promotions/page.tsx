import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import PromotionsPageClient from './PromotionsPageClient';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generatePageMetadata(
      'Promotions',
      `Browse all active promotions and special offers at ${business?.name || 'our store'}. Find great deals on products and services.`,
      '/promotions',
      business
    );
  } catch (error) {
    console.error('Error generating promotions metadata:', error);
    return generatePageMetadata(
      'Promotions',
      'Browse all active promotions and special offers. Find great deals on products and services.',
      '/promotions',
      null
    );
  }
}

export default function PromotionsPage() {
  return <PromotionsPageClient />;
}

