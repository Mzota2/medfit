/**
 * Cloudinary Image Optimization System
 * 
 * This module provides optimized image URLs to minimize Cloudinary credit usage
 * while maintaining high image quality and performance.
 * 
 * Key Strategies:
 * 1. Use appropriate sizes for different contexts (listing, detail, fullscreen)
 * 2. Automatic format selection (f_auto) - Cloudinary serves best format (WebP, AVIF)
 * 3. Automatic quality (q_auto) - Cloudinary optimizes quality based on image content
 * 4. Consistent transformations to enable CDN caching
 * 5. Fill mode (c_fill) for consistent aspect ratios
 */

import { cloudinary } from './config';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { quality, format } from '@cloudinary/url-gen/actions/delivery';

/**
 * Image size presets for different use cases
 * These sizes are optimized to minimize bandwidth while maintaining quality
 */
export const IMAGE_SIZES = {
  // Thumbnail - for small previews, icons, avatars
  thumbnail: { width: 100, height: 100 },
  
  // Small - for category cards, small product cards
  small: { width: 250, height: 250 },
  
  // Medium - for product listings, category grids
  medium: { width: 400, height: 400 },
  
  // Large - for product detail pages, hero images
  large: { width: 600, height: 600 },
  
  // Extra Large - for fullscreen previews, banners
  xlarge: { width: 900, height: 900 },
  
  // Full Width - for banners, full-width hero sections
  banner: { width: 1200, height: 600 },
  
  // Square variants (for consistent aspect ratios)
  squareSmall: { width: 250, height: 250 },
  squareMedium: { width: 400, height: 400 },
  squareLarge: { width: 600, height: 600 },
  
  // Portrait variants (for product images)
  portraitSmall: { width: 300, height: 400 },
  portraitMedium: { width: 400, height: 600 },
  portraitLarge: { width: 600, height: 900 },
  
  // Landscape variants (for banners, headers)
  landscapeSmall: { width: 400, height: 260 },
  landscapeMedium: { width: 600, height: 360 },
  landscapeLarge: { width: 900, height: 600 },
} as const;

/**
 * Image context types for automatic size selection
 */
export type ImageContext = 
  | 'thumbnail'
  | 'listing'
  | 'card'
  | 'detail'
  | 'fullscreen'
  | 'banner'
  | 'hero';

/**
 * Extract publicId from Cloudinary URL
 * Handles URLs with or without transformations and version numbers
 * 
 * URL formats:
 * 1. With version: https://res.cloudinary.com/{cloud}/image/upload/v1234567890/{publicId}.{ext}
 * 2. With transformations: https://res.cloudinary.com/{cloud}/image/upload/{transformations}/{publicId}.{ext}
 * 3. Both: https://res.cloudinary.com/{cloud}/image/upload/v1234567890/{transformations}/{publicId}.{ext}
 */
const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    // Remove query parameters and fragments
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // Find /image/upload/ in the URL
    const uploadIndex = cleanUrl.indexOf('/image/upload/');
    if (uploadIndex === -1) {
      return null;
    }
    
    // Get everything after /image/upload/
    const afterUpload = cleanUrl.substring(uploadIndex + '/image/upload/'.length);
    
    // Skip version if present (v1234567890/)
    const versionPattern = /^v\d+\//;
    const pathAfterVersion = afterUpload.replace(versionPattern, '');
    
    // Now we need to separate transformations from publicId
    // Transformations are usually:
    // - Comma-separated in one segment: c_fill,w_400,h_400
    // - Or separate short segments: c_fill, w_400, h_400
    // PublicId is the folder path + filename (may contain dashes, underscores, slashes)
    
    // Split by '/' to get all segments
    const segments = pathAfterVersion.split('/');
    
    if (segments.length === 0) {
      return null;
    }
    
    // Common transformation patterns (short, contain underscores, no dashes)
    const transformationPattern = /^[a-z0-9_,]+$/i;
    const isTransformation = (segment: string): boolean => {
      // Transformations are usually:
      // - Short (<= 30 chars)
      // - Contain underscores (c_fill, w_400, q_auto, f_auto)
      // - Don't contain dashes (file names often have dashes)
      // - May be comma-separated (c_fill,w_400,h_400)
      // - Common patterns: c_fill, w_400, h_400, q_auto, f_auto, g_auto
      
      // Must match the pattern and be reasonably short
      if (!transformationPattern.test(segment) || segment.length > 30) {
        return false;
      }
      
      // If it has a dash, it's likely a filename, not a transformation
      if (segment.includes('-')) {
        return false;
      }
      
      // Transformations typically have underscores (c_fill, w_400) or are very short single letters
      // But folder names like "categories" or "eshopcure" don't have underscores and are longer
      if (segment.includes('_')) {
        return true; // Has underscore, likely a transformation
      }
      
      // Very short segments (1-5 chars) without dashes might be transformations
      // But longer segments without underscores are likely folder names
      return segment.length <= 5;
    };
    
    // Work backwards from the end to find where publicId starts
    // The publicId is the last segment(s) that don't look like transformations
    const publicIdParts: string[] = [];
    let foundPublicId = false;
    
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      
      // If we haven't found the publicId yet and this looks like a transformation, skip it
      if (!foundPublicId && isTransformation(segment)) {
        continue; // Skip transformation
      }
      
      // This looks like part of the publicId (folder path or filename)
      foundPublicId = true;
      publicIdParts.unshift(segment);
    }
    
    // If no valid publicId found, try fallback strategies
    if (publicIdParts.length === 0) {
      // Fallback 1: Look for segments with dashes (common in file names)
      for (let i = segments.length - 1; i >= 0; i--) {
        const segment = segments[i];
        if (segment.includes('-') || segment.length > 20) {
          publicIdParts.push(segment);
          // Also include preceding segments that might be folder paths
          for (let j = i - 1; j >= 0; j--) {
            if (!isTransformation(segments[j])) {
              publicIdParts.unshift(segments[j]);
            } else {
              break; // Stop if we hit a transformation
            }
          }
          break;
        }
      }
      
      // Fallback 2: Use the last segment if it doesn't look like a transformation
      if (publicIdParts.length === 0 && segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        if (!isTransformation(lastSegment)) {
          publicIdParts.push(lastSegment);
        }
      }
    }
    
    if (publicIdParts.length === 0) {
      return null;
    }
    
    let publicId = publicIdParts.join('/');
    
    // Remove file extension if present
    publicId = publicId.replace(/\.(jpg|jpeg|png|gif|webp|avif)$/i, '');
    
    // Final validation: if publicId still looks like a transformation, it's probably wrong
    if (publicId.length <= 15 && publicId.includes('_') && !publicId.includes('-') && !publicId.includes('/')) {
      // This looks like a transformation, not a publicId
      return null;
    }
    
    return publicId || null;
  } catch (error) {
    console.error('Error extracting publicId from URL:', error, url);
    return null;
  }
};

export const getOptimizedImageUrl = (
  imageUrlOrPublicId: string,
  options?: {
    width?: number;
    height?: number;
    context?: ImageContext;
    quality?: number | 'auto';
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    aspectRatio?: 'square' | 'portrait' | 'landscape';
    gravity?: 'auto' | 'face' | 'center';
  }
): string => {
  if (!imageUrlOrPublicId) {
    return '';
  }

  // Extract publicId from URL if it's a full URL
  let publicId = imageUrlOrPublicId;
  if (imageUrlOrPublicId.startsWith('http://') || imageUrlOrPublicId.startsWith('https://')) {
    const extracted = extractPublicIdFromUrl(imageUrlOrPublicId);
    if (!extracted) {
      // If we can't extract publicId, return original URL (might be external image or malformed)
      console.warn('Could not extract publicId from URL, using original:', imageUrlOrPublicId);
      return imageUrlOrPublicId;
    }
    publicId = extracted;
    
    // Validate extracted publicId doesn't look like a transformation
    // Transformations are usually short, contain underscores, and don't have dashes or slashes
    const looksLikeTransformation = 
      extracted.length <= 15 && 
      extracted.includes('_') && 
      !extracted.includes('-') && 
      !extracted.includes('/') &&
      /^[a-z0-9_]+$/i.test(extracted);
    
    if (looksLikeTransformation) {
      // This looks like a transformation, not a publicId - extraction failed
      console.warn('Extracted publicId looks like a transformation, using original URL:', {
        extracted,
        original: imageUrlOrPublicId,
      });
      return imageUrlOrPublicId;
    }
  }

  try {
    let image = cloudinary.image(publicId);

    // Determine dimensions based on context or explicit options
    let width: number;
    let height: number;

    if (options?.context) {
      // Use context-based sizing
      const sizeMap: Record<ImageContext, { width: number; height: number }> = {
        thumbnail: IMAGE_SIZES.thumbnail,
        listing: IMAGE_SIZES.medium,
        card: IMAGE_SIZES.small,
        detail: IMAGE_SIZES.large,
        fullscreen: IMAGE_SIZES.xlarge,
        banner: IMAGE_SIZES.banner,
        hero: IMAGE_SIZES.banner,
      };
      
      const contextSize = sizeMap[options.context];
      
      // Apply aspect ratio if specified
      if (options.aspectRatio === 'square') {
        width = contextSize.width;
        height = contextSize.width;
      } else if (options.aspectRatio === 'portrait') {
        width = contextSize.width;
        height = Math.round(contextSize.width * 1.33);
      } else if (options.aspectRatio === 'landscape') {
        width = contextSize.width;
        height = Math.round(contextSize.width * 0.67);
      } else {
        width = contextSize.width;
        height = contextSize.height;
      }
    } else {
      // Use explicit dimensions or defaults
      width = options?.width || 600;
      height = options?.height || 600;
    }

    // Apply resize transformation with fill mode for consistent aspect ratios
    // c_fill ensures the image fills the dimensions while maintaining aspect ratio
    const gravity = options?.gravity === 'face' ? 'auto:face' : 'auto';
    image = image.resize(
      fill()
        .width(width)
        .height(height)
        .gravity(gravity)
    );

    // Quality: Use auto for best compression, or explicit value
    if (options?.quality === 'auto' || options?.quality === undefined) {
      // q_auto: Cloudinary automatically selects the best quality
      // This reduces file size by 20-50% without noticeable quality loss
      image = image.delivery(quality('auto'));
    } else {
      image = image.delivery(quality(options.quality));
    }

    // Format: Use auto for best format selection
    if (options?.format === 'auto' || options?.format === undefined) {
      // f_auto: Cloudinary serves WebP to modern browsers, AVIF to supported browsers
      // Falls back to original format for older browsers
      // This reduces file size by 25-35% compared to JPEG
      image = image.delivery(format('auto'));
    } else {
      image = image.delivery(format(options.format));
    }

    let optimizedUrl = image.toURL();
    
    // Fix malformed URLs where transformations appear as separate segments
    // The URL-gen library sometimes generates URLs like: /c_fill,w_400,h_400/q_auto/f_auto/v1/publicId
    // We need: /c_fill,w_400,h_400,q_auto,f_auto/publicId (no version, transformations comma-separated)
    
    // Remove version numbers (v1/, v1234567890/, etc.) - versions shouldn't be in optimized URLs
    optimizedUrl = optimizedUrl.replace(/\/v\d+\//g, '/');
    
    // Replace separate transformation segments with comma-separated format
    // Pattern: /q_auto/ or /f_auto/ should become ,q_auto or ,f_auto
    optimizedUrl = optimizedUrl.replace(/\/(q_auto|f_auto)\//g, ',$1/');
    
    // Clean up any double commas
    optimizedUrl = optimizedUrl.replace(/,,+/g, ',');
    
    // Remove trailing comma before slash
    optimizedUrl = optimizedUrl.replace(/,\//g, '/');
    
    // Ensure transformations are in the correct format: comma-separated, not slash-separated
    // Fix pattern: /transform1/transform2/ should become /transform1,transform2/
    const uploadIndex = optimizedUrl.indexOf('/image/upload/');
    if (uploadIndex !== -1) {
      const beforeUpload = optimizedUrl.substring(0, uploadIndex + '/image/upload/'.length);
      const afterUpload = optimizedUrl.substring(uploadIndex + '/image/upload/'.length);
      const segments = afterUpload.split('/');
      
      // Find where transformations end and publicId begins
      // Transformations are short segments with underscores, publicId is longer or has dashes
      const transformationSegments: string[] = [];
      let publicIdStartIndex = -1;
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const looksLikeTransformation = 
          segment.length <= 15 && 
          segment.includes('_') && 
          !segment.includes('-') &&
          /^[a-z0-9_,]+$/i.test(segment);
        
        if (looksLikeTransformation && publicIdStartIndex === -1) {
          transformationSegments.push(segment);
        } else {
          publicIdStartIndex = i;
          break;
        }
      }
      
      // If we found separate transformation segments, combine them
      if (transformationSegments.length > 1) {
        const combinedTransformations = transformationSegments.join(',');
        const publicIdPart = segments.slice(publicIdStartIndex).join('/');
        optimizedUrl = `${beforeUpload}${combinedTransformations}/${publicIdPart}`;
      }
    }
    
    // Validate the URL was generated correctly
    if (!optimizedUrl || !optimizedUrl.includes('cloudinary.com')) {
      console.warn('Invalid optimized URL generated, using original:', {
        optimizedUrl,
        original: imageUrlOrPublicId,
        publicId,
      });
      return imageUrlOrPublicId;
    }
    
    // Validate URL structure
    // Note: Cloudinary URLs don't need file extensions when using f_auto - this is normal and correct
    // The format is determined by the transformation (f_auto), not the file extension
    // Valid Cloudinary URL format: https://res.cloudinary.com/{cloud}/image/upload/{transformations}/{publicId}
    // Transformations should be comma-separated in one segment (e.g., c_fill,w_400,h_400,q_auto,f_auto)
    // NOT as separate path segments (e.g., /c_fill/w_400/h_400/q_auto/f_auto/)
    
    const urlParts = optimizedUrl.split('/image/upload/');
    if (urlParts.length === 2) {
      const afterUpload = urlParts[1];
      const segments = afterUpload.split('/');
      
      // Check for transformations appearing as separate path segments (malformed)
      // This happens when the publicId extraction incorrectly includes transformations
      let consecutiveTransformations = 0;
      let foundPublicId = false;
      
      for (const segment of segments) {
        // Check if segment looks like a transformation
        // Transformations: short (<=15), contain underscore, no dashes, alphanumeric + underscore + comma
        const looksLikeTransformation = 
          segment.length <= 15 && 
          segment.includes('_') && 
          !segment.includes('-') &&
          /^[a-z0-9_,]+$/i.test(segment);
        
        if (looksLikeTransformation && !foundPublicId) {
          consecutiveTransformations++;
          // If we see 2+ transformation-like segments in a row, it's likely malformed
          // This indicates the publicId extraction failed and included transformations
          if (consecutiveTransformations >= 2) {
            console.warn('Malformed URL detected (transformations as separate segments), using original:', {
              optimizedUrl,
              original: imageUrlOrPublicId,
              publicId,
            });
            return imageUrlOrPublicId;
          }
        } else {
          // Found a non-transformation segment (likely the publicId or folder path)
          foundPublicId = true;
          consecutiveTransformations = 0;
        }
      }
    }
    
    return optimizedUrl;
  } catch (error) {
    console.error('Error generating optimized URL:', error, {
      imageUrlOrPublicId,
      publicId: imageUrlOrPublicId.startsWith('http') ? extractPublicIdFromUrl(imageUrlOrPublicId) : imageUrlOrPublicId,
    });
    // Fallback to original URL if optimization fails
    return imageUrlOrPublicId;
  }
};

/**
 * Get thumbnail URL (100x100)
 */
export const getThumbnailUrl = (imageUrlOrPublicId: string): string => {
  return getOptimizedImageUrl(imageUrlOrPublicId, {
    context: 'thumbnail',
    aspectRatio: 'square',
  });
};

/**
 * Get listing image URL (400x400) - for product/category listings
 */
export const getListingImageUrl = (imageUrlOrPublicId: string): string => {
  return getOptimizedImageUrl(imageUrlOrPublicId, {
    context: 'listing',
    aspectRatio: 'square',
  });
};

/**
 * Get card image URL (300x300) - for small cards
 */
export const getCardImageUrl = (imageUrlOrPublicId: string): string => {
  return getOptimizedImageUrl(imageUrlOrPublicId, {
    context: 'card',
    aspectRatio: 'square',
  });
};

/**
 * Get detail image URL (600x600) - for product detail pages
 */
export const getDetailImageUrl = (imageUrlOrPublicId: string): string => {
  return getOptimizedImageUrl(imageUrlOrPublicId, {
    context: 'detail',
    aspectRatio: 'square',
  });
};

/**
 * Get fullscreen image URL (900x900) - for lightbox/preview
 */
export const getFullscreenImageUrl = (imageUrlOrPublicId: string): string => {
  return getOptimizedImageUrl(imageUrlOrPublicId, {
    context: 'fullscreen',
    aspectRatio: 'square',
  });
};

/**
 * Get banner image URL (1200x600) - for banners and hero sections
 */
export const getBannerImageUrl = (imageUrlOrPublicId: string): string => {
  return getOptimizedImageUrl(imageUrlOrPublicId, {
    context: 'banner',
    aspectRatio: 'landscape',
  });
};

/**
 * Get hero image URL (1200x600) - for hero sections
 */
export const getHeroImageUrl = (imageUrlOrPublicId: string): string => {
  return getOptimizedImageUrl(imageUrlOrPublicId, {
    context: 'hero',
    aspectRatio: 'landscape',
  });
};

/**
 * Get optimized image URL with custom dimensions
 * Use this when you need specific dimensions not covered by presets
 */
export const getCustomImageUrl = (
  imageUrlOrPublicId: string,
  width: number,
  height: number,
  options?: {
    quality?: number | 'auto';
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    gravity?: 'auto' | 'face' | 'center';
  }
): string => {
  return getOptimizedImageUrl(imageUrlOrPublicId, {
    width,
    height,
    quality: options?.quality || 'auto',
    format: options?.format || 'auto',
    gravity: options?.gravity || 'auto',
  });
};

