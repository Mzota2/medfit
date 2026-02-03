/**
 * Optimized Image Component
 * 
 * Universal image component that:
 * - Automatically optimizes Cloudinary images
 * - Handles local images
 * - Implements lazy loading for non-critical images
 * - Provides fallback handling
 * - Supports critical images (logos, etc.) that load immediately
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getOptimizedImageUrl, type ImageContext } from '@/lib/cloudinary/optimization';
import { cn } from '@/lib/utils/cn';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean; // For critical images like logos
  context?: ImageContext; // For Cloudinary optimization
  sizes?: string;
  quality?: number | 'auto';
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: () => void;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

/**
 * Check if URL is a Cloudinary image
 */
const isCloudinaryUrl = (url: string): boolean => {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
};


/**
 * Get optimized URL based on image source
 */
const getOptimizedSrc = (
  src: string,
  options?: {
    context?: ImageContext;
    width?: number;
    height?: number;
    quality?: number | 'auto';
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    aspectRatio?: 'square' | 'portrait' | 'landscape';
  }
): string => {
  if (!src) return '';

  // If it's a Cloudinary image, optimize it
  if (isCloudinaryUrl(src)) {
    if (options?.context) {
      return getOptimizedImageUrl(src, {
        context: options.context,
        aspectRatio: options.aspectRatio,
        quality: options.quality,
        format: options.format,
      });
    } else if (options?.width || options?.height) {
      return getOptimizedImageUrl(src, {
        width: options.width,
        height: options.height,
        quality: options.quality,
        format: options.format,
      });
    } else {
      // Default optimization for Cloudinary images
      return getOptimizedImageUrl(src, {
        context: 'detail',
        quality: 'auto',
        format: 'auto',
      });
    }
  }

  // For local images, return as-is (Next.js will optimize them)
  return src;
};

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  priority = false,
  context,
  sizes,
  quality = 'auto',
  format = 'auto',
  aspectRatio,
  onError,
  onLoad,
  placeholder = 'empty',
  blurDataURL,
}) => {
  // Initialize isInView based on priority to avoid setState in effect
  const [isInView, setIsInView] = useState(priority); // Critical images load immediately
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Calculate optimized source using useMemo to avoid setState in effect
  const imageSrc = React.useMemo(() => {
    if (!isInView || !src) return '';
    
    try {
      const optimized = getOptimizedSrc(src, {
        context,
        width,
        height,
        quality,
        format,
        aspectRatio,
      });
      
      // Validate the optimized URL
      if (optimized && optimized !== src) {
        // If it's a Cloudinary URL, make sure it's valid
        if (isCloudinaryUrl(optimized)) {
          // Check if URL structure looks correct
          if (!optimized.includes('/image/upload/')) {
            console.warn('Invalid Cloudinary URL structure, using original:', optimized);
            return src;
          }
        }
        return optimized;
      }
      
      return src;
    } catch (error) {
      console.error('Error optimizing image source:', error);
      return src; // Fallback to original
    }
  }, [isInView, src, context, width, height, quality, format, aspectRatio]);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    // If priority is true, already initialized to true, no observer needed
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Disconnect observer once image is in view
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority, isInView]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    
    // If optimized URL failed, try original URL
    const target = e.target as HTMLImageElement;
    if (imageSrc !== src && src && target.src !== src) {
      // Force reload with original URL
      target.src = src;
      return;
    }
    
    onError?.(e);
  };
  
  // Use original src as fallback if optimized version fails
  const finalImageSrc = hasError && imageSrc !== src ? src : imageSrc;

  // Show placeholder while loading or if error
  if (!isInView && !priority) {
    return (
      <div
        ref={imgRef}
        className={cn(
          'bg-background-secondary animate-pulse',
          fill ? 'absolute inset-0' : '',
          className
        )}
        style={!fill && width && height ? { width, height } : undefined}
        aria-label={alt}
      />
    );
  }

  if (!finalImageSrc) {
    if (hasError) {
      return (
        <div
          className={cn(
            'bg-background-secondary flex items-center justify-center',
            fill ? 'absolute inset-0' : '',
            className
          )}
          style={!fill && width && height ? { width, height } : undefined}
          aria-label={alt}
        >
          <span className="text-text-secondary text-xs">Image not available</span>
        </div>
      );
    }
    return null;
  }

  // For Cloudinary images, we've already optimized the URL, so Next.js doesn't need to optimize again
  // For local images, Next.js handles optimization automatically
  const isCloudinary = isCloudinaryUrl(finalImageSrc);
  
  // When using fill, the wrapper must be relative and take full size of parent
  // The parent container should have a defined height (e.g., h-32, aspect-square, etc.)
  return (
    <div 
      ref={imgRef} 
      className={fill ? 'relative w-full h-full' : ''}
      style={fill ? { position: 'relative' } : undefined}
    >
      <Image
        src={finalImageSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        className={className}
        priority={priority}
        sizes={sizes}
        loading={priority ? undefined : 'lazy'}
        onError={handleError}
        onLoad={onLoad}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        unoptimized={isCloudinary} // Cloudinary already optimizes, Next.js doesn't need to optimize again
      />
    </div>
  );
};

/**
 * Logo Image Component
 * Critical image that loads immediately (no lazy loading)
 */
export const LogoImage: React.FC<Omit<OptimizedImageProps, 'priority'>> = (props) => {
  return <OptimizedImage {...props} priority={true} context="detail" />;
};

/**
 * Product Image Component
 * Optimized for product listings and detail pages
 */
export const ProductImage: React.FC<OptimizedImageProps> = ({
  context = 'detail',
  ...props
}) => {
  return <OptimizedImage {...props} context={context} />;
};

/**
 * Category Image Component
 * Optimized for category listings
 */
export const CategoryImage: React.FC<OptimizedImageProps> = ({
  context = 'listing',
  ...props
}) => {
  return <OptimizedImage {...props} context={context} />;
};

/**
 * Banner Image Component
 * Optimized for banners and hero sections
 */
export const BannerImage: React.FC<OptimizedImageProps> = ({
  context = 'banner',
  ...props
}) => {
  return <OptimizedImage {...props} context={context} priority={true} />;
};

