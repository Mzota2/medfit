'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/products';
import { ServiceCard } from '@/components/services';
import { isProduct, isService } from '@/types';
import { Item } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useApp } from '@/contexts/AppContext';
import {
  useProducts,
  useServices,
  useCategories,
  usePromotions,
} from '@/hooks';
import { useStoreType } from '@/hooks/useStoreType';
import { PromotionStatus } from '@/types/promotion';
import { ItemStatus } from '@/types/item';
import { Timestamp } from 'firebase/firestore';
import { PromotionCarousel } from '@/components/carousel/PromotionCarousel';
import { OptimizedImage, CategoryImage } from '@/components/ui/OptimizedImage';
import { ReviewsSection } from '@/components/reviews';

export default function HomePageClient() {
  const { addItem } = useCart();
  const router = useRouter();
  const { currentBusiness } = useApp();
  const { hasProducts, hasServices } = useStoreType();
  
  // React Query hooks with real-time updates built-in
  const {
    data: products = [],
    isLoading: productsLoading,
  } = useProducts({
    businessId: currentBusiness?.id,
    status: ItemStatus.ACTIVE,
    enabled: !!currentBusiness?.id,
  });

  const {
    data: services = [],
    isLoading: servicesLoading,
  } = useServices({
    businessId: currentBusiness?.id,
    status: ItemStatus.ACTIVE,
    enabled: !!currentBusiness?.id,
  });

  const {
    data: categories = [],
  } = useCategories({
    businessId: currentBusiness?.id,
    type: 'both',
    enabled: !!currentBusiness?.id,
  });

  const {
    data: promotions = [],
  } = usePromotions({
    businessId: currentBusiness?.id,
    status: PromotionStatus.ACTIVE,
    limit: 10,
    enabled: !!currentBusiness?.id,
  });


  // Combine products and services with deduplication
  const allItems = useMemo(() => {
    const itemsMap = new Map<string, Item>();
    
    // Add products to the map
    if (hasProducts && Array.isArray(products)) {
      products.forEach(item => {
        if (item?.id) {
          itemsMap.set(item.id, item);
        }
      });
    }
    
    // Add services to the map (will overwrite if same ID exists, which is fine)
    if (hasServices && Array.isArray(services)) {
      services.forEach(item => {
        if (item?.id) {
          itemsMap.set(item.id, item);
        }
      });
    }
    
    return Array.from(itemsMap.values());
  }, [products, services, hasProducts, hasServices]);


  type CategoryLike = { id?: string; type?: string };
  const isCategoryLike = (value: unknown): value is CategoryLike => {
    if (!value || typeof value !== 'object') return false;
    return 'id' in value;
  };


   const getCategoryItems = useMemo(() => {
    return (category: unknown) => {
      if (!isCategoryLike(category) || !category?.id || !allItems.length) return [];
      return allItems
        .filter(item => {
          const isInCategory = item.categoryIds?.some((catId: string) => catId === category.id);
          const isActive = item.status === ItemStatus.ACTIVE;
          const matchesType = 
            (hasProducts && isProduct(item) && category.type === 'product') ||
            (hasServices && isService(item) && category.type === 'service');
          
          return isInCategory && isActive && matchesType;
        })
        .slice(0, 4); // Show max 4 items per category
    };
  }, [allItems, hasProducts, hasServices]);
  
  // Helper to convert createdAt to Date
  const getDate = (date: Date | Timestamp | string | undefined): Date => {
    if (!date) return new Date(0);
    if (date instanceof Date) return date;
    if (date instanceof Timestamp) return date?.toDate();
    return new Date(date);
  };

  // Derive new arrivals and top picks from store state, filtered by store type
  const newArrivals = useMemo(() => {
    return allItems
      .filter(item => {
        const isActive = item.status === ItemStatus.ACTIVE;
        if (hasProducts && hasServices) return isActive;
        if (hasProducts) return isActive && isProduct(item);
        if (hasServices) return isActive && isService(item);
        return false;
      })
      .sort((a, b) => {
        const aDate = getDate(a.createdAt);
        const bDate = getDate(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, 4);
  }, [allItems, hasProducts, hasServices]);
  
  const featuredItems = useMemo(() => {
    return allItems.filter(item => {
      const isActive = item.status === ItemStatus.ACTIVE;
      const isFeatured = item.isFeatured;
      
      // Filter by active status, featured flag, and store type
      if (hasProducts && hasServices) return isActive && isFeatured;
      if (hasProducts) return isActive && isFeatured && isProduct(item);
      if (hasServices) return isActive && isFeatured && isService(item);
      return false;
    });
  }, [allItems, hasProducts, hasServices]);

  const topPicks = useMemo(() => {
    // Start with all featured items (they get priority)
    let picks: typeof allItems = [...featuredItems];
    
    // If we need more items to reach 4, add non-featured active items
    if (picks.length < 4) {
      const remainingItems = allItems.filter(item => {
        const isActive = item.status === ItemStatus.ACTIVE;
        const isFeatured = item.isFeatured;
        
        // Only include active items that are NOT already featured and match store type
        if (hasProducts && hasServices) return isActive && !isFeatured;
        if (hasProducts) return isActive && !isFeatured && isProduct(item);
        if (hasServices) return isActive && !isFeatured && isService(item);
        return false;
      });
      
      // Sort remaining items by creation date (newest first)
      const sortedRemaining = remainingItems.sort((a, b) => {
        const aDate = getDate(a.createdAt);
        const bDate = getDate(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      });
      
      // Add enough items to reach 4 total
      const needed = 4 - picks.length;
      picks = [...picks, ...sortedRemaining.slice(0, needed)];
    }
    
    // If we have more than 4 featured items, show all of them
    // Otherwise, limit to 4 total items
    return featuredItems.length > 4 ? featuredItems : picks.slice(0, 4);
  }, [allItems, featuredItems, getDate, hasProducts, hasServices]);
  
  const loading = productsLoading || servicesLoading;

  // Helper to convert endDate to Date
  const getEndDate = (date: Date | Timestamp | string | undefined): Date => {
    if (!date) return new Date(0);
    if (date instanceof Date) return date;
    if (date && typeof date === 'object' && 'toDate' in date) {
      return (date as Timestamp)?.toDate();
    }
    return new Date(date as string | number);
  };

  // Filter categories based on store type
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(category => {
      if (hasProducts && hasServices) return true; // Show all categories if both types are enabled
      if (hasProducts) return category.type === 'product';
      if (hasServices) return category.type === 'service';
      return false;
    });
  }, [categories, hasProducts, hasServices]);

  // Filter active promotions that haven't expired and match store type
  const activePromotions = useMemo(() => {
    if (!promotions || promotions.length === 0) {
      console.log('No promotions found in store');
      return [];
    }
    
    console.log('Total promotions from store:', promotions.length);
    console.log('Promotions data:', promotions);
    
    const now = new Date();
    const filtered = promotions.filter((promo) => {
      // Check status
      if (promo.status !== PromotionStatus.ACTIVE) {
        console.log(`Promotion "${promo.name}" filtered out - status: ${promo.status}`);
        return false;
      }
      
      // Check if promotion hasn't expired
      const endDate = getEndDate(promo.endDate);
      const isNotExpired = endDate >= now;
      
      if (!isNotExpired) {
        console.log(`Promotion "${promo.name}" filtered out - expired. End date: ${endDate}, Now: ${now}`);
      }
      
      return isNotExpired;
    });
    
    console.log('Active promotions after filtering:', filtered.length);
    return filtered;
  }, [promotions]);

  const handleAddToCart = (product: Item) => {
    addItem(product, 1);
  };

  const handleBookNow = (service: Item) => {
    // Navigate to service detail page
    if (isService(service)) {
      window.location.href = `/services/${service.slug}`;
    }
  };

  // Data is automatically fetched by React Query hooks above

  return (
    <div className="min-h-screen">
      {/* Animated Carousel for Promotions and Business Details */}
      {loading ? (
        <section className="bg-gradient-to-br from-secondary to-background text-primary-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <p className="text-xl">Loading...</p>
            </div>
          </div>
        </section>
      ) : (
        <PromotionCarousel
          promotions={activePromotions}
          businessData={currentBusiness}
          products={products}
          services={services}
          autoPlayInterval={10000}
        />  
      )}

      {/* Shop By Category */}
      <section className="py-8 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 md:mb-4">Shop by Category</h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-sm md:text-base">
              Browse our wide range of products and services organized by category
            </p>
          </div>
          {/* Mobile: Horizontal Scroll */}
          <div className="md:hidden">
            {filteredCategories.length > 0 ? (
              <div className="flex gap-4 pb-4 overflow-x-auto snap-x snap-mandatory px-1">
                {filteredCategories.map((category) => (
                  <div 
                    key={category.id}
                    className="shrink-0 w-[160px] snap-start bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group relative"
                  >
                    <div
                      role="link"
                      tabIndex={0}
                      onClick={() =>
                        router.push(
                          category.type === 'service'
                            ? `/services?category=${category.name.toLowerCase().replace(/\s+/g, '-')}`
                            : `/products?category=${category.name.toLowerCase().replace(/\s+/g, '-')}`
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          router.push(
                            category.type === 'service'
                              ? `/services?category=${category.name.toLowerCase().replace(/\s+/g, '-')}`
                              : `/products?category=${category.name.toLowerCase().replace(/\s+/g, '-')}`
                          );
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <div className="relative aspect-square bg-background-secondary">
                        {category.image ? (
                          <CategoryImage 
                            src={category.image}
                            alt={category.name}
                            fill
                            context="card"
                            className="object-cover"
                            sizes="(max-width: 768px) 160px, 50vw"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary-light to-primary flex items-center justify-center">
                            {category.icon ? (
                              <span className="text-3xl">{category.icon}</span>
                            ) : (
                              <OptimizedImage 
                                src="/placeholder-category.jpg" 
                                alt={category.name} 
                                fill 
                                className="object-cover opacity-50" 
                                sizes="(max-width: 768px) 160px, 50vw" 
                              />
                            )}
                          </div>
                        )}
                        {/* Product/Service Previews */}
                        <div className="absolute left-0 bottom-0 w-full p-1.5 grid grid-cols-4 gap-1">
                          {getCategoryItems(category).map((item) => (
                            <Link 
                              key={`${category.id}-${item.id}`}
                              href={`/${isProduct(item) ? 'products' : 'services'}/${item.slug}`}
                              onClick={(e) => e.stopPropagation()}
                              className="relative aspect-square rounded-sm overflow-hidden border !border-white/80 shadow-sm hover:border-primary hover:z-10 hover:scale-105 transition-all duration-200"
                            >
                              <OptimizedImage
                                src={item.images?.[0]?.url || '/placeholder-product.jpg'}
                                alt={item.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 70px, 80px"
                              />
                            </Link>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 text-center">
                        <h2 className="font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                          {category.name}
                        </h2>
                        {category.description && (
                          <p className="text-xs text-text-secondary line-clamp-2">{category.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-text-muted col-span-full">
                <p>No categories available for the current store type.</p>
              </div>
            )}
          </div>
          {/* Desktop: Grid Layout */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <div 
                  key={category.id} 
                  className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group relative"
                >
                  <div
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      router.push(
                        category.type === 'service'
                          ? `/services?category=${category.name.toLowerCase().replace(/\s+/g, '-')}`
                          : `/products?category=${category.name.toLowerCase().replace(/\s+/g, '-')}`
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        router.push(
                          category.type === 'service'
                            ? `/services?category=${category.name.toLowerCase().replace(/\s+/g, '-')}`
                            : `/products?category=${category.name.toLowerCase().replace(/\s+/g, '-')}`
                        );
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div className="relative aspect-square bg-background-secondary">
                      {category.image ? (
                        <CategoryImage 
                          src={category.image}
                          alt={category.name}
                          fill
                          context="card"
                          className="object-cover"
                          sizes="(max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-light to-primary flex items-center justify-center">
                          {category.icon ? (
                            <span className="text-4xl">{category.icon}</span>
                          ) : (
                            <OptimizedImage 
                              src="/placeholder-category.jpg" 
                              alt={category.name} 
                              fill 
                              className="object-cover opacity-50" 
                              sizes="(max-width: 1200px) 100%, 100%"
                            />
                          )}
                        </div>
                      )}
                      {/* Product/Service Previews */}
                      <div className="absolute bottom-0 left-0 p-2 grid grid-cols-4 gap-2 w-full">
                        {getCategoryItems(category).map((item) => (
                          <Link 
                            key={`${category.id}-${item.id}`}
                            href={`/${isProduct(item) ? 'products' : 'services'}/${item.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="relative aspect-square rounded-md overflow-hidden border-2 !border-white/90 shadow-md hover:border-primary hover:z-10 hover:scale-105 transition-all duration-200"
                          >
                            <OptimizedImage
                              src={item.images?.[0]?.url || '/placeholder-product.jpg'}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 1200px) 100px, 120px"
                            />
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 text-center">
                      <h2 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {category.name}
                      </h2>
                      {category.description && (
                        <p className="text-xs text-text-secondary line-clamp-2">{category.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-text-muted col-span-full">
                <p>No categories available at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-8 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex flex-col gap-1 md:gap-2 w-full text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-foreground">NEW ARRIVALS</h2>
              <p className="text-text-secondary text-sm md:text-base">
                {hasProducts && hasServices && 'Explore our latest products and services featuring exclusive designs and premium quality. Limited stock available.'}
                {hasProducts && !hasServices && 'Explore our latest products featuring exclusive designs and premium quality. Limited stock available.'}
                {!hasProducts && hasServices && 'Explore our latest services featuring exclusive designs and premium quality. Limited availability.'}
              </p>
              <Link 
                className="shrink-0" 
                href={hasProducts ? 
                  (hasServices ? '/search?sort=newest' : '/products?sort=newest') : 
                  '/services?sort=newest'
                }>
                <Button variant="outline">
                  {hasProducts && hasServices ? 'Browse All' : 'View All'} →
                </Button>
              </Link>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-text-secondary">Loading new arrivals...</p>
            </div>
          ) : newArrivals.length > 0 ? (
            <>
              {/* Mobile: Horizontal Scroll */}
              <div className="md:hidden -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {newArrivals.map((item) => (
                    <div key={item.id} className="shrink-0 w-[280px] snap-start">
                      {isProduct(item) ? (
                        <ProductCard
                          product={item}
                          onAddToCart={handleAddToCart}
                        />
                      ) : isService(item) ? (
                        <ServiceCard
                          service={item}
                          onBookNow={handleBookNow}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              {/* Desktop: Grid Layout */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {newArrivals.map((item) => (
                isProduct(item) ? (
                  <ProductCard
                    key={item.id}
                    product={item}
                    onAddToCart={handleAddToCart}
                  />
                ) : isService(item) ? (
                  <ServiceCard
                    key={item.id}
                    service={item}
                    onBookNow={handleBookNow}
                  />
                ) : null
              ))}
            </div>
            </>
          ) : (
            <div className="text-center py-12 text-text-muted">
              <p>No new arrivals at the moment. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Top Picks */}
      <section className="py-8 md:py-16 bg-background-secondary dark:bg-background-tertiary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 text-foreground">OUR TOP PICKS</h2>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-text-secondary">Loading top picks...</p>
            </div>
          ) : topPicks.length > 0 ? (
            <>
              {/* Mobile: Horizontal Scroll */}
              <div className="md:hidden -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  {topPicks.map((item) => (
                    isProduct(item) ? (
                      <div key={`product-${item.id}`} className="shrink-0 w-[280px] snap-start">
                        <ProductCard
                          product={item}
                          onAddToCart={handleAddToCart}
                        />
                      </div>
                    ) : isService(item) ? (
                      <div key={`service-${item.id}`} className="shrink-0 w-[280px] snap-start">
                        <ServiceCard
                          service={item}
                          onBookNow={handleBookNow}
                        />
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
              {/* Desktop: Grid Layout */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {topPicks.map((item) => (
                isProduct(item) ? (
                  <ProductCard
                    key={item.id}
                    product={item}
                    onAddToCart={handleAddToCart}
                  />
                ) : isService(item) ? (
                  <ServiceCard
                    key={item.id}
                    service={item}
                    onBookNow={handleBookNow}
                  />
                ) : null
              ))}
            </div>
            </>
          ) : (
            <div className="text-center py-12 text-text-muted">
              <p>No top picks available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* Service Highlights */}
      <section className="py-8 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 text-foreground">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Fast & Cheap Delivery</h3>
                <p className="text-text-secondary">Receive your orders right at your door step</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Secure Payment</h3>
                <p className="text-text-secondary">Shop with confidence using our encrypted checkout.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Easy Returns</h3>
                <p className="text-text-secondary">Hassle-free returns within 30 days of purchase.</p>
              </div>
            </>
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      {currentBusiness?.id && (
        <section className="py-8 md:py-16 bg-background-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 md:mb-4">What Our Customers Say</h2>
              <p className="text-sm md:text-base text-text-secondary max-w-3xl mx-auto">
                Join thousands of satisfied customers. See why people love shopping with us!
              </p>
            </div>
            <ReviewsSection
              businessId={currentBusiness.id}
              reviewType="business"
              title="Customer Reviews"
            />
          </div>
        </section>
      )}
    </div>
  );
}

