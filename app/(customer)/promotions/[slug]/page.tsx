import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import PromotionDetailPageClient from './PromotionDetailPageClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const business = await getBusiness();
    return generatePageMetadata(
      'Promotion',
      `Browse items on promotion at ${business?.name || 'our store'}.`,
      `/promotions/${slug}`,
      business
    );
  } catch (error) {
    console.error('Error generating promotion metadata:', error);
    const { slug } = await params;
    return generatePageMetadata(
      'Promotion',
      'Browse items on promotion.',
      `/promotions/${slug}`,
      null
    );
  }
}

export default async function PromotionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PromotionDetailPageClient slug={slug} />;
}

