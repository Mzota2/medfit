/**
 * Product detail page with image gallery, variants, pricing, and add to cart
 */

import type { Metadata } from 'next';
import { generateItemMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import { getItemBySlug } from '@/lib/items';
import { isProduct } from '@/types';
import ProductDetailPageClient from './ProductDetailPageClient';

/**
 * Generate metadata for product page (runs server-side)
 */
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<Metadata> {
  const { slug } = await params;
  
    try {
      const item = await getItemBySlug(slug);
      if (item && isProduct(item)) {
      const business = await getBusiness();
      return generateItemMetadata(item, business);
      }
    } catch (error) {
    console.error('Error generating product metadata:', error);
    }
  
  // Fallback metadata
  return {
    title: 'Product Not Found',
    description: 'The product you are looking for could not be found.',
  };
                    }

export default function ProductDetailPage() {
  return <ProductDetailPageClient />;
}
