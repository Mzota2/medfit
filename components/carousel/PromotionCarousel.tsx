'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OptimizedImage, BannerImage } from '@/components/ui/OptimizedImage';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ShoppingCart, ChevronLeft, ChevronRight, Calendar, ArrowRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Promotion } from '@/types/promotion';
import { business } from '@/types/business';
import { Item } from '@/types/item';
import { Timestamp } from 'firebase/firestore';
import { formatDate } from '@/lib/utils/formatting';
import { ProductImage } from '@/components/ui/OptimizedImage';

interface CarouselItem {
  id: string;
  type: 'promotion' | 'business';
  data: Promotion | business;
}

interface PromotionCarouselProps {
  promotions: Promotion[];
  businessData: business | null;
  products?: Item[];
  services?: Item[];
  autoPlayInterval?: number;
}

export const PromotionCarousel: React.FC<PromotionCarouselProps> = ({
  promotions,
  businessData,
  products = [],
  services = [],
  autoPlayInterval = 10000
}) => {
  // Helper to convert date to Date object
  const toDate = (date: Date | Timestamp | string | undefined): Date => {
    if (!date) return new Date(0);
    if (date instanceof Date) return date;
    if (date instanceof Timestamp) return date.toDate();
    return new Date(date);
  };

  // Get promotion items for a given promotion
  const getPromotionItems = (promo: Promotion): Item[] => {
    const allItems = [...products, ...services];
    const itemIds = [...(promo.productsIds || []), ...(promo.servicesIds || [])];
    return allItems.filter(item => item.id && itemIds.includes(item.id));
  };
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const { theme, resolvedTheme} = useTheme();
  const isDark = resolvedTheme == 'dark';

  // Build carousel items: promotions first, then business details at the end
  const carouselItems: CarouselItem[] = [
    ...promotions.map((promo) => ({
      id: promo.id || `promo-${promo.name}`,
      type: 'promotion' as const,
      data: promo,
    })),
    ...(businessData
      ? [
          {
            id: 'business-details',
            type: 'business' as const,
            data: businessData,
          },
        ]
      : []),
  ];

  const slideVariants = {
    enter: {
      opacity: 0,
    },
    center: {
      zIndex: 1,
      opacity: 1,
    },
    exit: {
      zIndex: 0,
      opacity: 0,
    },
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = useCallback((newDirection: number) => {
    setCurrentIndex((prevIndex) => {
      if (newDirection === 1) {
        return prevIndex === carouselItems.length - 1 ? 0 : prevIndex + 1;
      } else {
        return prevIndex === 0 ? carouselItems.length - 1 : prevIndex - 1;
      }
    });
  }, [carouselItems.length]);

  // Auto-play functionality
  useEffect(() => {
    if (carouselItems.length <= 1) return;

    const interval = setInterval(() => {
      paginate(1);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [paginate, carouselItems.length, autoPlayInterval]);

  if (carouselItems.length === 0) {
    return null;
  }

  const currentItem = carouselItems[currentIndex];
  const isPromotion = currentItem.type === 'promotion';
  const promotion = isPromotion ? (currentItem.data as Promotion) : null;
  const business = !isPromotion ? (currentItem.data as business) : null;

  return (
    <section className="relative bg-gradient-to-br from-secondary to-background text-primary-foreground overflow-hidden min-h-[500px] lg:min-h-[800px]" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Mobile: Full-width carousel */}
      <div className="lg:hidden h-full relative">
        {/* Static Background Image - Always visible, updates with currentIndex */}
        <div className="absolute inset-0 w-full h-full">
          {currentItem.type === 'promotion' && (currentItem.data as Promotion).image ? (
            <BannerImage
              src={(currentItem.data as Promotion).image || '/hero.jpg'}
              alt={(currentItem.data as Promotion).name || 'Promotion'}
              fill
              priority={currentIndex === 0}
              className="object-cover transition-opacity duration-500"
              sizes="100vw"
            />
          ) : currentItem.type === 'business' && (currentItem.data as business).banner ? (
            <BannerImage
              src={(currentItem.data as business).banner || '/hero.jpg'}
              alt={(currentItem.data as business).name || 'Welcome to our store'}
              fill
              priority={currentIndex === 0}
              className="object-cover transition-opacity duration-500"
              sizes="100vw"
            />
          ) : (
            <BannerImage
              src="/hero.jpg"
              alt={currentItem.type === 'promotion' ? (currentItem.data as Promotion).name || 'Promotion' : (currentItem.data as business).name || 'Welcome to our store'}
              fill
              priority={currentIndex === 0}
              className="object-cover transition-opacity duration-500"
              sizes="100vw"
            />
          )} 
          {/* Gradient overlay using business branding colors */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/60 to-secondary/80" />
        </div>

        {/* Navigation Arrows - Always visible, outside animation */}
        {carouselItems.length > 1 && (  
          <div className='absolute top-4 left-0 right-0 z-30 flex items-center justify-between px-4'>
            <button
              onClick={() => paginate(-1)}
              className={`${isDark ? 'bg-black/60 hover:bg-black/80 text-white' : 'bg-white/90 hover:bg-white text-primary'} rounded-full p-2 sm:p-3 transition-all hover:scale-110 shadow-lg backdrop-blur-sm border !border-white/20 hover:border-primary`}
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

             {/* Dots Indicator */}
              {carouselItems.length > 1 && (
                <div className="flex items-center gap-2">
                  {carouselItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setDirection(index > currentIndex ? 1 : -1);
                        setCurrentIndex(index);
                      }}
                      className={`h-2 rounded-full transition-all focus:outline-none
                        ${index === currentIndex
                          ? `w-8 ${isDark ? 'bg-white !border-white/90' : 'bg-white !border-white/80'} border shadow-md`
                          : `w-2 ${isDark ? 'bg-white/40 !border-white/60 hover:bg-white/70' : 'bg-white/60 !border-white/80 hover:bg-white/80'} border`
                        }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}

            <button
              onClick={() => paginate(1)}
              className={`${isDark ? 'bg-black/60 hover:bg-black/80 text-white' : 'bg-white/90 hover:bg-white text-primary'} rounded-full p-2 sm:p-3 transition-all hover:scale-110 shadow-lg backdrop-blur-sm border !border-white/20 hover:border-primary`}
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        )}

        {/* Animated Content Container - Only content fades */}
        <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={currentIndex}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
              opacity: { duration: 0.5, ease: 'easeInOut' },
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);

                if (swipe < -swipeConfidenceThreshold) {
                  paginate(1);
                } else if (swipe > swipeConfidenceThreshold) {
                  paginate(-1);
                }
              }}
            className="absolute inset-0 z-10 w-full h-full"
            >
            {/* Content Overlay - Centered */}
            <div className="h-full flex flex-col justify-center items-center px-6 sm:px-8 py-4 sm:py-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex flex-col justify-center items-center text-center w-full max-w-2xl"
                >
                  {isPromotion && promotion ? (() => {
                    const promotionItems = getPromotionItems(promotion);
                    const startDate = toDate(promotion.startDate);
                    const endDate = toDate(promotion.endDate);
                    const promotionSlug = promotion.slug || promotion.id;
                    
                    return (
                      <>
                        <motion.h1
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                        >
                          {promotion.name.toUpperCase()}
                        </motion.h1>
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ 
                            opacity: 1, 
                            scale: 1,
                          }}
                          transition={{ 
                            delay: 0.4, 
                            duration: 0.6,
                            type: "spring",
                            stiffness: 200,
                            damping: 15
                          }}
                          className="inline-block mb-3 sm:mb-4"
                        >
                          <motion.div
                            animate={{
                              scale: [1, 1.05, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className={`inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-lg sm:text-xl md:text-2xl rounded-lg sm:rounded-xl shadow-lg border-2 !border-white/30 backdrop-blur-sm`}
                          >
                            <motion.span
                              animate={{
                                rotate: [0, -5, 5, -5, 0],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="inline-block"
                        >
                          {promotion.discountType === 'percentage'
                            ? `${promotion.discount}% OFF`
                            : `${promotion.discount} OFF`}
                            </motion.span>
                          </motion.div>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.45, duration: 0.5 }}
                          className="flex items-center gap-4 mb-3 sm:mb-4 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="text-xs sm:text-sm md:text-base font-medium">
                              {formatDate(startDate)} - {formatDate(endDate)}
                            </span>
                          </div>
                        </motion.div>
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5, duration: 0.5 }}
                          className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
                        >
                          {promotion.description ||
                            "Limited time offer! Don't miss out on this amazing deal."}
                        </motion.p>
                        {promotionItems.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55, duration: 0.5 }}
                            className="mb-4 sm:mb-6 w-full"
                          >
                            <p className="text-xs sm:text-sm font-semibold text-white mb-3 sm:mb-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] text-center">
                              Featured Items ({promotionItems.length})
                            </p>
                            <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
                              {promotionItems.slice(0, 2).map((item, index) => (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  transition={{ 
                                    delay: 0.6 + (index * 0.1), 
                                    duration: 0.4,
                                    type: "spring",
                                    stiffness: 100
                                  }}
                                  whileHover={{ scale: 1.05, y: -5 }}
                                  className="group"
                                >
                                <Link
                                  href={item.type === 'product' ? `/products/${item.slug}` : `/services/${item.slug}`}
                                    className={`block relative ${isDark ? 'bg-black/30' : 'bg-white/10'} rounded-xl overflow-hidden border-2 !border-white/20 hover:border-white/40 transition-all duration-300 shadow-xl hover:shadow-2xl`}
                                >
                                    <div className="relative aspect-[4/3]">
                                  <ProductImage
                                    src={item.images[0]?.url || '/placeholder-product.jpg'}
                                    alt={item.name}
                                    fill
                                    context="card"
                                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                                        sizes="(max-width: 640px) 50vw, 33vw"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    </div>
                                    <div className="p-2 sm:p-3">
                                      <h4 className="text-[10px] sm:text-xs font-semibold text-white line-clamp-2 mb-1">
                                        {item.name}
                                      </h4>
                                      <p className="text-[9px] sm:text-[10px] text-white/90 line-clamp-1">
                                        {item.type === 'product' ? 'Product' : 'Service'}
                                      </p>
                                    </div>
                                </Link>
                                </motion.div>
                              ))}
                              {promotionItems.length > 2 && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 1.2, duration: 0.4 }}
                                  whileHover={{ scale: 1.05 }}
                                  className="group h-full w-full"
                                >
                                <Link
                                  href={`/promotions/${promotionSlug}`}
                                    className={`relative bg-gradient-to-br w-full h-full !border-white/30 hover:border-white/50 transition-all duration-300 shadow-xl hover:shadow-2xl aspect-square flex flex-col items-center justify-center`}
                                >
                                    <div className="text-center p-4">
                                      <div className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                    +{promotionItems.length - 2}
                                      </div>
                                      <p className="text-[10px] sm:text-xs font-semibold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                        More Items
                                      </p>
                                    </div>
                                </Link>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6, duration: 0.5 }}
                          className="flex gap-3"
                        >
                          <Link href={`/promotions/${promotionSlug}`} className="w-full sm:w-auto">
                            <Button
                              size="lg"
                              className="bg-white text-primary hover:bg-white/90 transition-transform hover:scale-105 w-full sm:w-auto shadow-lg"
                            >
                              View All Items
                              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                            </Button>
                          </Link>
                        </motion.div>
                      </>
                    );
                  })() : business ? (
                    <>
                      <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 !text-gray-50 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] bg-black/50 backdrop-blur-md px-4 py-2 rounded-lg inline-block border border-white/20"
                      >
                        {business.name
                          ? `WELCOME TO ${business.name.toUpperCase()}`
                          : 'WELCOME TO OUR STORE'}
                      </motion.h1>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                          className="text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
                      >
                        {business.description ||
                          'Discover amazing deals on premium products and professional services. Start exploring our curated collection and find exactly what you need today.'}
                      </motion.p>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                      >
                        <Link href="/products" className="w-full sm:w-auto">
                          <Button
                            size="lg"
                            className="bg-white text-primary flex items-center gap-2 hover:bg-white/90 transition-transform hover:scale-105 w-full sm:w-auto shadow-lg"
                          >
                            SHOP NOW <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                          </Button>
                        </Link>
                      </motion.div>
                    </>
                  ) : null}
                </motion.div>
                </div>
            </motion.div>
          </AnimatePresence>
      </div>

      {/* Desktop: Full-width carousel with overlay */}
      <div className="hidden lg:block h-full relative">
        {/* Static Background Image - Always visible, updates with currentIndex */}
        <div className="absolute inset-0 w-full h-full">
          {currentItem.type === 'promotion' && (currentItem.data as Promotion).image ? (
            <BannerImage
              src={(currentItem.data as Promotion).image || '/hero.jpg'}
              alt={(currentItem.data as Promotion).name || 'Promotion'}
              fill
              priority={currentIndex === 0}
              className="object-cover transition-opacity duration-500"
              sizes="100vw"
            />
          ) : currentItem.type === 'business' && (currentItem.data as business).banner ? (
            <BannerImage
              src={(currentItem.data as business).banner || '/hero.jpg'}
              alt={(currentItem.data as business).name || 'Welcome to our store'}
              fill
              priority={currentIndex === 0}
              className="object-cover transition-opacity duration-500"
              sizes="100vw"
            />
          ) : (
            <BannerImage
              src="/hero.jpg"
              alt={currentItem.type === 'promotion' ? (currentItem.data as Promotion).name || 'Promotion' : (currentItem.data as business).name || 'Welcome to our store'}
              fill
              priority={currentIndex === 0}
              className="object-cover transition-opacity duration-500"
              sizes="100vw"
            />
          )}
          {/* Gradient overlay using business branding colors */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/60 to-secondary/80" />
              </div>

        {/* Navigation Arrows - Always visible, outside animation */}
          {carouselItems.length > 1 && (  
          <div className='absolute top-6 left-0 right-0 z-30 flex items-center justify-between px-8'>
              <button
                onClick={() => paginate(-1)}
              className="bg-white/90 hover:bg-white rounded-full p-4 transition-all hover:scale-110 shadow-lg backdrop-blur-sm"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-6 h-6 text-primary" />
              </button>

               {/* Dots Indicator */}
                {carouselItems.length > 1 && (
                  <div className="flex items-center gap-2">
                    {carouselItems.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setDirection(index > currentIndex ? 1 : -1);
                          setCurrentIndex(index);
                        }}
                        className={`h-2 rounded-full transition-all focus:outline-none
                          ${index === currentIndex
                          ? 'w-8 bg-white border !border-white/80 shadow-md'
                          : 'w-2 bg-white/60 border !border-white/80 hover:bg-white/80'
                          }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                )}

              <button
                onClick={() => paginate(1)}
              className="bg-white/90 hover:bg-white rounded-full p-4 transition-all hover:scale-110 shadow-lg backdrop-blur-sm"
                aria-label="Next slide"
              >
                <ChevronRight className="w-6 h-6 text-primary" />
              </button>
            </div>
          )}

        {/* Animated Content Container - Only content fades */}
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIndex}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              opacity: { duration: 0.5, ease: 'easeInOut' },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
            className="absolute inset-0 z-10 w-full h-full"
          >
            {/* Content Overlay - Centered */}
            <div className="h-full flex flex-col justify-center items-center px-8 lg:px-12 xl:px-16 py-8 lg:py-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="flex flex-col justify-center items-center text-center w-full max-w-4xl"
                >
                  {isPromotion && promotion ? (() => {
                    const promotionItems = getPromotionItems(promotion);
                    const startDate = toDate(promotion.startDate);
                    const endDate = toDate(promotion.endDate);
                    const promotionSlug = promotion.slug || promotion.id;
                    
                    return (
                      <>
                        <motion.h1
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                          className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                        >
                          {promotion.name.toUpperCase()}
                        </motion.h1>
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ 
                            opacity: 1, 
                            scale: 1,
                          }}
                          transition={{ 
                            delay: 0.4, 
                            duration: 0.6,
                            type: "spring",
                            stiffness: 200,
                            damping: 15
                          }}
                          className="inline-block mb-4 sm:mb-6"
                        >
                          <motion.div
                            animate={{
                              scale: [1, 1.05, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl rounded-xl shadow-lg border-2 !border-white/30 backdrop-blur-sm"
                          >
                            <motion.span
                              animate={{
                                rotate: [0, -5, 5, -5, 0],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="inline-block"
                            >
                              {promotion.discountType === 'percentage'
                                ? `${promotion.discount}% OFF`
                                : `${promotion.discount} OFF`}
                            </motion.span>
                          </motion.div>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.45, duration: 0.5 }}
                          className="flex items-center justify-center gap-4 mb-4 sm:mb-6 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="text-sm sm:text-base md:text-lg font-medium">
                              {formatDate(startDate)} - {formatDate(endDate)}
                            </span>
                          </div>
                        </motion.div>
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5, duration: 0.5 }}
                          className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
                        >
                          {promotion.description ||
                            "Limited time offer! Don't miss out on this amazing deal."}
                        </motion.p>
                        {promotionItems.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55, duration: 0.5 }}
                            className="mb-6 sm:mb-8 w-full"
                          >
                            <p className="text-sm sm:text-base lg:text-lg font-semibold text-white mb-4 sm:mb-6 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] text-center">
                              Featured Items ({promotionItems.length})
                            </p>
                            <div className="grid grid-cols-7 gap-4 max-w-4xl mx-auto">
                              {promotionItems.slice(0, 6).map((item, index) => (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  transition={{ 
                                    delay: 0.6 + (index * 0.1), 
                                    duration: 0.4,
                                    type: "spring",
                                    stiffness: 100
                                  }}
                                  whileHover={{ scale: 1.05, y: -5 }}
                                  className="group w-full h-full"
                                >
                                  <Link
                                    href={item.type === 'product' ? `/products/${item.slug}` : `/services/${item.slug}`}
                                    className="block h-full w-fullrelative bg-white/10 rounded-lg overflow-hidden border-2 !border-white/20 hover:border-white/40 transition-all duration-300 shadow-lg hover:shadow-xl"
                                  >
                                    <div className="relative aspect-[4/3]">
                                      <ProductImage
                                        src={item.images[0]?.url || '/placeholder-product.jpg'}
                                        alt={item.name}
                                        fill
                                        context="card"
                                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                                        sizes="(max-width: 640px) 50vw, 33vw"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    </div>
                                    <div className="p-2 sm:p-2.5 lg:p-3">
                                      <h4 className="text-[10px] sm:text-xs lg:text-sm font-semibold text-white line-clamp-2 mb-0.5">
                                        {item.name}
                                      </h4>
                                      <p className="text-[9px] sm:text-[10px] text-white/90 line-clamp-1">
                                        {item.type === 'product' ? 'Product' : 'Service'}
                                      </p>
                                    </div>
                                  </Link>
                                </motion.div>
                              ))}
                              {promotionItems.length > 6 && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 1.2, duration: 0.4 }}
                                  whileHover={{ scale: 1.05 }}
                                  className="group w-full h-full"
                                >
                                  <Link
                                    href={`/promotions/${promotionSlug}`}
                                    className="relative bg-gradient-to-br h-full w-full from-white/20 to-white/10 rounded-lg overflow-hidden border-2 !border-white/30 hover:border-white/50 transition-all duration-300 shadow-lg hover:shadow-xl aspect-[4/3] flex flex-col items-center justify-center"
                                  >
                                    <div className="text-center p-3 sm:p-4">
                                      <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                        +{promotionItems.length - 6}
                                      </div>
                                      <p className="text-[10px] sm:text-xs font-semibold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                        More Items
                                      </p>
                                    </div>
                                  </Link>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6, duration: 0.5 }}
                          className="flex gap-3 sm:gap-4 justify-center"
                        >
                          <Link href={`/promotions/${promotionSlug}`}>
                            <Button
                              size="lg"
                              className="bg-white text-primary hover:bg-white/90 transition-transform hover:scale-105 shadow-lg text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4"
                            >
                              View All Items
                              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 ml-2" />
                            </Button>
                          </Link>
                        </motion.div>
                      </>
                    );
                  })() : business ? (
                    <>
                        <motion.h1
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                          className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 !text-gray-50 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] bg-black/50 backdrop-blur-md px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl inline-block border border-white/20"
                        >
                          {business.name
                            ? `WELCOME TO ${business.name.toUpperCase()}`
                            : 'WELCOME TO OUR STORE'}
                        </motion.h1>
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4, duration: 0.5 }}
                          className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
                        >
                          {business.description ||
                            'Discover amazing deals on premium products and professional services. Start exploring our curated collection and find exactly what you need today.'}
                        </motion.p>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                      >
                        <Link href="/products">
                          <Button
                            size="lg"
                            className="bg-white text-primary flex items-center gap-2 hover:bg-white/90 transition-transform hover:scale-105 shadow-lg text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4"
                          >
                            SHOP NOW <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                          </Button>
                        </Link>
                      </motion.div>
                    </>
                  ) : null}
                  </motion.div>
        </div>
            </motion.div>
          </AnimatePresence>
      </div>
    </section>
  );
};

