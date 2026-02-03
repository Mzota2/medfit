/**
 * Service card component for service listings
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProductImage } from '@/components/ui/OptimizedImage';
import { Button } from '@/components/ui/Button';
import { ShareButton } from '@/components/ui/ShareButton';
import { Item, isService, ItemStatus } from '@/types';
import { formatCurrency } from '@/lib/utils/formatting';
import { useItemPromotion } from '@/hooks/useItemPromotion';
import { calculatePromotionPrice } from '@/lib/promotions/utils';
import { getEffectivePrice, getFinalPrice } from '@/lib/utils/pricing';

export interface ServiceCardProps {
  service: Item;
  onBookNow?: (service: Item) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onBookNow }) => {
  const [isHovered, setIsHovered] = useState(false);
  const mainImage = service.images[0]?.url || '/placeholder-service.jpg';
  const secondImage = service.images[1]?.url;

  // Check if service is on promotion from promotions collection
  const { promotion, isOnPromotion, discountPercentage } = useItemPromotion(service);

  // Type guard to ensure it's a service
  if (!isService(service)) {
    return null;
  }

  // Step 1: Calculate promotion price from base price (promotion applied first)
  const promotionPrice = promotion 
    ? calculatePromotionPrice(service.pricing.basePrice, promotion)
    : null;

  // Step 2: Get final price (promotion price + transaction fee if enabled)
  const finalPrice = getFinalPrice(
    service.pricing.basePrice,
    promotionPrice,
    service.pricing.includeTransactionFee,
    service.pricing.transactionFeeRate
  );

  // For display: use final price (includes promotion + transaction fee)
  const displayPrice = service.totalFee || finalPrice;
  
  // For comparison/strikethrough: show price before promotion (with transaction fee if enabled)
  const effectivePrice = getEffectivePrice(
    service.pricing.basePrice,
    service.pricing.includeTransactionFee,
    service.pricing.transactionFeeRate
  );

  // Check for totalFee discount (backward compatibility)
  const hasTotalFeeDiscount = service.totalFee && service.totalFee !== service.pricing.basePrice;
  
  // Show promotion if item is in promotions collection OR has totalFee discount
  const showPromotion = isOnPromotion || hasTotalFeeDiscount;

  // Generate share URL
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/services/${service.slug}`
    : `/services/${service.slug}`;

  return (
    <div 
      className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      <Link href={`/services/${service.slug}`} className="block">
        <div className="relative aspect-square w-full bg-background-secondary overflow-hidden group">
          <div 
            className={`absolute inset-0 transition-opacity duration-500 ${
              isHovered && secondImage ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <ProductImage
              src={mainImage}
              alt={service.name}
              fill
              context="card"
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          {secondImage && (
            <div 
              className={`absolute inset-0 transition-opacity duration-500 ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <ProductImage
                src={secondImage}
                alt={`${service.name} - View 2`}
                fill
                context="card"
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          )}
          {/* Dark overlay gradient for badge visibility */}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
          
          {/* Promotion badge */}
          {showPromotion && discountPercentage > 0 && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg backdrop-blur-sm border-2 !border-white/20">
                {discountPercentage}% OFF
              </div>
            </div>
          )}
          
          {showPromotion && discountPercentage === 0 && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg backdrop-blur-sm border-2 !border-white/20">
                On Sale
              </div>
            </div>
          )}
          
          {service.status === ItemStatus.ACTIVE && !showPromotion && (
            <div className="absolute top-2 left-2 z-10">
              <div className="bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg backdrop-blur-sm border-2 !border-white/20">
                Available
              </div>
            </div>
          )}

          {/* Share button - always visible on mobile, hover on desktop */}
          <div className={`absolute ${showPromotion ? 'top-2 left-2' : 'top-2 right-2'} z-10 md:opacity-0 md:group-hover:opacity-100 transition-opacity`}>
            <ShareButton
              url={shareUrl}
              title={service.name}
              description={service.description}
              variant="ghost"
              size="sm"
              className="bg-white/90 hover:bg-white backdrop-blur-sm shadow-sm"
            />
          </div>
          
          {/* Mobile share button in the bottom right corner */}
        
        </div>
      </Link>
      
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/services/${service.slug}`} className="flex-1">
            <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1.5 sm:mb-2 line-clamp-2 hover:text-primary transition-colors">
              {service.name}
            </h3>
          </Link>
        </div>
        
        {service.description && (
          <p className="text-xs sm:text-sm text-text-secondary mb-2 sm:mb-3 line-clamp-2">
            {service.description}
          </p>
        )}
        
        {/* Pricing with promotion display */}
        <div className="flex items-baseline gap-2 mb-2 sm:mb-3 flex-wrap">
          <span className="text-lg sm:text-xl font-bold text-primary">
            {formatCurrency(displayPrice, service.pricing.currency)}
          </span>
          {(promotionPrice !== null || hasTotalFeeDiscount) && (
            <span className="text-xs sm:text-sm text-text-tertiary line-through">
              {formatCurrency(effectivePrice, service.pricing.currency)}
            </span>
          )}
          {service.duration && (
            <span className="text-xs sm:text-sm text-text-muted ml-auto">
              {service.duration} min
            </span>
          )}
        </div>
        
        {onBookNow && service.status === ItemStatus.ACTIVE && (
          <Button
            size="sm"
            className="w-full text-xs sm:text-sm"
            onClick={(e) => {
              e.preventDefault();
              onBookNow(service);
            }}
          >
            Book Now
          </Button>
        )}
      </div>
    </div>
  );
};
