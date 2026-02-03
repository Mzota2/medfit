'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/products';
import { ServiceCard } from '@/components/services';
import { Button, Loading, Badge } from '@/components/ui';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { usePromotions, useProducts, useServices } from '@/hooks';
import { useStoreType } from '@/hooks/useStoreType';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/ui';
import { PromotionStatus } from '@/types/promotion';
import { ItemStatus, Item } from '@/types/item';
import { useApp } from '@/contexts/AppContext';
import { formatDate } from '@/lib/utils/formatting';
import { Timestamp } from 'firebase/firestore';
import { Calendar } from 'lucide-react';
import { isProduct, isService } from '@/types';

export default function PromotionDetailPageClient({ slug }: { slug: string }) {
  const { currentBusiness } = useApp();
  const { addItem } = useCart();
  const toast = useToast();
  const { hasProducts, hasServices } = useStoreType();

  // Handle add to cart
  const handleAddToCart = (product: Item) => {
    addItem(product, 1);
    toast.showSuccess('Cart', `${product.name} added to cart`);
  };

  // Fetch promotions
  const { data: promotions = [], isLoading: promotionsLoading } = usePromotions({
    businessId: currentBusiness?.id,
    status: PromotionStatus.ACTIVE,
    enabled: !!currentBusiness?.id,
  });

  // Fetch products and services based on store type
  const { data: products = [], isLoading: productsLoading } = useProducts({
    businessId: currentBusiness?.id,
    status: ItemStatus.ACTIVE,
    enabled: !!currentBusiness?.id && hasProducts,
  });

  const { data: services = [], isLoading: servicesLoading } = useServices({
    businessId: currentBusiness?.id,
    status: ItemStatus.ACTIVE,
    enabled: !!currentBusiness?.id && hasServices,
  });

  // Helper to convert date to Date object
  const toDate = (date: Date | Timestamp | string | undefined): Date => {
    if (!date) return new Date(0);
    if (date instanceof Date) return date;
    if (date instanceof Timestamp) return date.toDate();
    return new Date(date);
  };

  // Find the promotion by slug or id
  const promotion = useMemo(() => {
    if (!promotions || promotions.length === 0) return undefined;
    // Try to find by slug first, then by id
    return promotions.find(p => {
      if (p.slug && p.slug === slug) return true;
      if (p.id === slug) return true;
      return false;
    });
  }, [promotions, slug]);

  // Get items in this promotion, filtered by store type
  const promotionItems = useMemo(() => {
    if (!promotion) return [];
    
    const productsArray = hasProducts && Array.isArray(products) ? products : [];
    const servicesArray = hasServices && Array.isArray(services) ? services : [];
    const allItems = [...productsArray, ...servicesArray];
    
    // Only include item IDs that match the store type
    const validProductIds = hasProducts ? (promotion.productsIds || []) : [];
    const validServiceIds = hasServices ? (promotion.servicesIds || []) : [];
    const validItemIds = [...validProductIds, ...validServiceIds];
    
    return allItems.filter(item => item.id && validItemIds.includes(item.id));
  }, [promotion, products, services, hasProducts, hasServices]);

  const loading = promotionsLoading || productsLoading || servicesLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Promotion Not Found</h1>
          <p className="text-text-secondary mb-6">
            {`The promotion you're looking for doesn't exist or is no longer available.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/promotions">
              <Button variant="outline">View All Promotions</Button>
            </Link>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const startDate = toDate(promotion.startDate);
  const endDate = toDate(promotion.endDate);
  const productItems = promotionItems.filter(isProduct);
  const serviceItems = promotionItems.filter(isService);

  return (
    <div className="min-h-screen bg-background-secondary py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-text-secondary">
            <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li>/</li>
            <li className="text-foreground">Promotion: {promotion.name}</li>
          </ol>
        </nav>

        {/* Promotion Header */}
        <div className="bg-card rounded-lg shadow-md overflow-hidden mb-8">
          {/* Promotion Image */}
          {promotion.image && (
            // Use a taller aspect ratio on mobile for better visual height, keep wider aspect on larger screens
            <div className="relative w-full bg-background-secondary aspect-3/2 sm:aspect-8/3">
              <OptimizedImage
                src={promotion.image}
                alt={promotion.name}
                fill
                context="banner"
                aspectRatio="landscape"
                className="object-cover"
                priority
              />
            </div>
          )}
          <div className="p-6 sm:p-8">
            <div className="">
              <div className="min-w-0">
                <div className='flex items-start justify-between gap-4 mb-6'>
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">{promotion.name}</h1>
                    <div className="flex-shrink-0 ml-4">
                      <Badge variant="danger" className="text-base sm:text-lg px-3 sm:px-4 py-1 sm:py-2 rounded-full whitespace-nowrap">
                        {promotion.discountType === 'percentage'
                          ? `${promotion.discount}% OFF`
                          : `${promotion.discount} OFF`}
                      </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-text-secondary text-sm sm:text-base mt-2">
                  <Calendar className="w-5 h-5" />
                  <span>
                    {formatDate(startDate)} - {formatDate(endDate)}
                  </span>
                </div>
                {promotion.description && (
                  <p className="mt-3 text-base sm:text-lg text-text-secondary">{promotion.description}</p>
                )}
              </div>

             
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="mb-8">
          {promotionItems.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg">
              <p className="text-text-secondary">
                {hasProducts && hasServices
                  ? 'No products or services found in this promotion.'
                  : hasProducts
                  ? 'No products found in this promotion.'
                  : 'No services found in this promotion.'
                }
              </p>
              <div className="mt-4">
                <Link href="/promotions">
                  <Button variant="outline">View Other Promotions</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {hasProducts && productItems.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-foreground mb-6">
                    {hasServices ? 'Products' : 'Items'} ({productItems.length})
                  </h2>
                  <div
                    role="list"
                    className="flex gap-4 overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6 -mx-4 md:mx-0 px-4 md:px-0 py-2 snap-x snap-mandatory"
                  >
                    {productItems.map((product) => (
                      <div role="listitem" key={product.id} className="shrink-0 w-72 md:w-auto snap-start">
                        <ProductCard 
                          product={product} 
                          onAddToCart={handleAddToCart}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasServices && serviceItems.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-foreground mb-6">
                    Services ({serviceItems.length})
                  </h2>
                  <div
                    role="list"
                    className="flex gap-4 overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6 -mx-4 md:mx-0 px-4 md:px-0 py-2 snap-x snap-mandatory"
                  >
                    {serviceItems.map((service) => (
                      <div role="listitem" key={service.id} className="shrink-0 w-72 md:w-auto snap-start">
                        <ServiceCard service={service} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/promotions">
            <Button variant="outline" size="lg">
              View All Promotions
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="lg">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

