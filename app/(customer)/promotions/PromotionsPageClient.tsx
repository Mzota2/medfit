'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePromotions, useProducts, useServices } from '@/hooks';
import { useStoreType } from '@/hooks/useStoreType';
import { PromotionStatus } from '@/types/promotion';
import { ItemStatus } from '@/types/item';
import { useApp } from '@/contexts/AppContext';
import { formatDate } from '@/lib/utils/formatting';
import { Timestamp } from 'firebase/firestore';
import { Calendar, ArrowRight } from 'lucide-react';
import { Button, Loading, Badge } from '@/components/ui';
import { ProductImage } from '@/components/ui/OptimizedImage';
import { isProduct, isService } from '@/types';

export default function PromotionsPageClient() {
  const { currentBusiness } = useApp();
  const { hasProducts, hasServices } = useStoreType();

  // Fetch promotions
  const { data: promotions = [], isLoading: promotionsLoading } = usePromotions({
    businessId: currentBusiness?.id,
    status: PromotionStatus.ACTIVE,
    enabled: !!currentBusiness?.id,
  });

  // Fetch all products and services to count items in each promotion
  const { data: products = [] } = useProducts({
    businessId: currentBusiness?.id,
    status: ItemStatus.ACTIVE,
    enabled: !!currentBusiness?.id && hasProducts,
  });

  const { data: services = [] } = useServices({
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

  // Filter active promotions that haven't expired and match store type
  const activePromotions = useMemo(() => {
    if (!promotions || promotions.length === 0) return [];
    
    const now = new Date();
    return promotions.filter((promo) => {
      // Check if promotion is active and not expired
      if (promo.status !== PromotionStatus.ACTIVE) return false;
      
      const endDate = toDate(promo.endDate);
      if (endDate < now) return false;
      
      // Check if promotion has items that match the store type
      const hasValidProducts = hasProducts && promo.productsIds && promo.productsIds.length > 0;
      const hasValidServices = hasServices && promo.servicesIds && promo.servicesIds.length > 0;
      
      // If store has both types, show all active promotions
      if (hasProducts && hasServices) return true;
      
      // Otherwise, only show promotions with items that match the store type
      return hasValidProducts || hasValidServices;
    });
  }, [promotions, hasProducts, hasServices]);

  // Get item count for each promotion, filtered by store type
  const promotionsWithItemCounts = useMemo(() => {
    const productsArray = hasProducts && Array.isArray(products) ? products : [];
    const servicesArray = hasServices && Array.isArray(services) ? services : [];
    const allItems = [...productsArray, ...servicesArray];
    
    return activePromotions.map((promo) => {
      // Only count items that match the store type
      const validProductIds = hasProducts ? (promo.productsIds || []) : [];
      const validServiceIds = hasServices ? (promo.servicesIds || []) : [];
      const validItemIds = [...validProductIds, ...validServiceIds];
      
      const itemCount = allItems.filter(item => 
        item.id && validItemIds.includes(item.id)
      ).length;
      
      return { 
        ...promo, 
        itemCount,
        // Add type information for filtering in the UI if needed
        hasProducts: hasProducts && promo.productsIds && promo.productsIds.length > 0,
        hasServices: hasServices && promo.servicesIds && promo.servicesIds.length > 0
      };
    });
  }, [activePromotions, products, services, hasProducts, hasServices]);

  const loading = promotionsLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-secondary py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="mb-4 sm:mb-6 text-xs sm:text-sm">
          <ol className="flex items-center gap-1.5 sm:gap-2 text-text-secondary">
            <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li>/</li>
            <li className="text-foreground">Promotions</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4">Active Promotions</h1>
          <p className="text-sm sm:text-base text-text-secondary mb-4 sm:mb-6">
            {hasProducts && hasServices
              ? 'Discover amazing deals and special offers on our products and services.'
              : hasProducts
              ? 'Discover amazing deals and special offers on our products.'
              : 'Discover amazing deals and special offers on our services.'
            }
          </p>
        </div>

        {/* Promotions Grid */}
        {promotionsWithItemCounts.length === 0 ? (
          <div className="text-center py-8 sm:py-10 md:py-12 bg-card rounded-lg px-4">
            <p className="text-sm sm:text-base text-text-secondary mb-4 sm:mb-6">
            {hasProducts && hasServices
              ? 'No active promotions at the moment. Check back soon for exciting deals!'
              : hasProducts
              ? 'No active product promotions at the moment. Check back soon for exciting deals!'
              : 'No active service promotions at the moment. Check back soon for exciting deals!'
            }
          </p>
            <Link href="/" className="mt-4 inline-block">
              <Button variant="outline" size="sm" className="sm:size-default">Back to Home</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {promotionsWithItemCounts.map((promotion) => {
              const startDate = toDate(promotion.startDate);
              const endDate = toDate(promotion.endDate);
              const promotionSlug = promotion.slug || promotion.id;

              return (
                <Link
                  key={promotion.id}
                  href={`/promotions/${promotionSlug}`}
                  className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  {/* Promotion Image */}
                  {promotion.image && (
                    // Increase mobile card image height for better prominence on phones
                    <div className="relative w-full h-52 sm:h-44 md:h-48 bg-background-secondary">
                      <ProductImage
                        src={promotion.image}
                        alt={promotion.name}
                        fill
                        context="card"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  )}

                  <div className="p-4 sm:p-5 md:p-6">
                    {/* Badge */}
                    <div className="mb-2 sm:mb-3">
                      <Badge variant="danger" className="text-sm sm:text-base md:text-lg px-2 sm:px-3 py-0.5 sm:py-1">
                        {promotion.discountType === 'percentage'
                          ? `${promotion.discount}% OFF`
                          : `${promotion.discount} OFF`}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-2 sm:mb-3 group-hover:text-primary transition-colors leading-tight">
                      {promotion.name}
                    </h2>

                    {/* Dates */}
                    <div className="flex items-center gap-1.5 sm:gap-2 text-text-secondary mb-2 sm:mb-3">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">
                        {formatDate(startDate)} - {formatDate(endDate)}
                      </span>
                    </div>

                    {/* Description */}
                    {promotion.description && (
                      <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4 line-clamp-2 leading-relaxed">
                        {promotion.description}
                      </p>
                    )}

                    {/* Item Count */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-xs sm:text-sm text-text-secondary">
                        {promotion.itemCount} {promotion.itemCount === 1 ? 'item' : 'items'}
                      </span>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-primary group-hover:gap-2 sm:group-hover:gap-3 transition-all">
                        <span className="text-xs sm:text-sm font-medium">View Details</span>
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-6 sm:mt-8 text-center">
          <Link href="/">
            <Button variant="outline" size="sm" className="sm:size-lg">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

