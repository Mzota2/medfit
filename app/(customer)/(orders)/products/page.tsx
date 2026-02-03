/**
 * Product listing page with filters, search, sorting, and pagination
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import ProductsPageClient from './ProductsPageClient';

/**
 * Generate metadata for products listing page (runs server-side)
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generatePageMetadata(
      'Products',
      `Browse our wide selection of quality products at ${business?.name || 'our store'}. Find exactly what you're looking for with our easy-to-use filters and search.`,
      '/products',
      business
    );
  } catch (error) {
    console.error('Error generating products metadata:', error);
    return generatePageMetadata(
      'Products',
      "Browse our wide selection of quality products. Find exactly what you're looking for with our easy-to-use filters and search.",
      '/products',
      null
    );
  }
}

export default function ProductsPage() {
  return <ProductsPageClient />;
}
