# Image Optimization System - Complete Guide

## Overview

This project uses a comprehensive image optimization system that:
- ✅ Automatically optimizes **Cloudinary images** with format and quality optimization
- ✅ Handles **local images** with Next.js optimization
- ✅ Implements **lazy loading** for all non-critical images
- ✅ Provides **critical image exceptions** (logos load immediately)
- ✅ Applies **context-based sizing** for optimal performance

## Components

### OptimizedImage Component

The main component that handles all image optimization:

```typescript
import { OptimizedImage } from '@/components/ui/OptimizedImage';

<OptimizedImage
  src={imageUrl}
  alt="Description"
  width={400}
  height={300}
  context="detail" // or "listing", "card", "fullscreen", "banner"
  priority={false} // true for critical images like logos
/>
```

### Specialized Components

For common use cases:

```typescript
// For logos (loads immediately, no lazy loading)
import { LogoImage } from '@/components/ui/OptimizedImage';
<LogoImage src="/logo.png" alt="Logo" width={100} height={100} />

// For products
import { ProductImage } from '@/components/ui/OptimizedImage';
<ProductImage src={product.image} alt={product.name} fill context="detail" />

// For categories
import { CategoryImage } from '@/components/ui/OptimizedImage';
<CategoryImage src={category.image} alt={category.name} fill context="listing" />

// For banners/hero sections
import { BannerImage } from '@/components/ui/OptimizedImage';
<BannerImage src={banner.image} alt="Banner" fill />
```

## How It Works

### 1. Cloudinary Images

**Automatic Detection:**
- Detects if URL contains `cloudinary.com`
- Extracts publicId from full Cloudinary URLs
- Applies transformations based on context

**Optimizations Applied:**
- `f_auto` - Automatic format (WebP/AVIF for modern browsers)
- `q_auto` - Automatic quality optimization
- `c_fill` - Fill mode for consistent aspect ratios
- Context-based sizing (300x300 for cards, 600x600 for details, etc.)

**Example:**
```typescript
// Input: https://res.cloudinary.com/cloud/image/upload/eshopcure/categories/cat.jpg
// Output: https://res.cloudinary.com/cloud/image/upload/c_fill,h_400,w_400,f_auto,q_auto/eshopcure/categories/cat
```

### 2. Local Images

**Automatic Detection:**
- Detects if URL starts with `/`, `./`, or `../`
- Uses Next.js built-in optimization
- No additional transformations needed

**Next.js Optimization:**
- Automatic format conversion (WebP/AVIF)
- Responsive image generation
- Lazy loading support

### 3. Lazy Loading

**How It Works:**
- Uses Intersection Observer API
- Starts loading 50px before image enters viewport
- Shows placeholder while loading
- Critical images (priority=true) load immediately

**Implementation:**
```typescript
// Lazy loaded (default)
<OptimizedImage src={image} alt="Image" />

// Immediate load (for logos, above-fold images)
<OptimizedImage src={image} alt="Image" priority={true} />
```

## Context-Based Sizing

| Context | Size | Use Case |
|---------|------|----------|
| `thumbnail` | 100x100 | Small previews, icons |
| `card` | 300x300 | Product/service cards |
| `listing` | 400x400 | Category/product listings |
| `detail` | 600x600 | Product detail pages |
| `fullscreen` | 900x900 | Lightbox, fullscreen preview |
| `banner` | 1200x600 | Banners, hero sections |

## Usage Examples

### Product Card
```typescript
import { ProductImage } from '@/components/ui/OptimizedImage';

<ProductImage
  src={product.images[0]?.url}
  alt={product.name}
  fill
  context="card"
  sizes="(max-width: 768px) 100vw, 33vw"
/>
```

### Category Listing
```typescript
import { CategoryImage } from '@/components/ui/OptimizedImage';

<CategoryImage
  src={category.image}
  alt={category.name}
  fill
  context="listing"
/>
```

### Logo (Critical Image)
```typescript
import { LogoImage } from '@/components/ui/OptimizedImage';

<LogoImage
  src="/logo.png"
  alt="Company Logo"
  width={100}
  height={100}
/>
```

### Banner/Hero Section
```typescript
import { BannerImage } from '@/components/ui/OptimizedImage';

<BannerImage
  src={heroImage}
  alt="Hero Banner"
  fill
/>
```

## Migration Guide

### Before (Old Code)
```typescript
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/cloudinary/utils';

<Image
  src={getOptimizedImageUrl(imageUrl, { width: 400, height: 400 })}
  alt="Image"
  fill
/>
```

### After (New Code)
```typescript
import { OptimizedImage } from '@/components/ui/OptimizedImage';

<OptimizedImage
  src={imageUrl}
  alt="Image"
  fill
  context="detail"
/>
```

## Benefits

1. **Automatic Optimization**
   - Cloudinary images: Format and quality optimization
   - Local images: Next.js optimization
   - No manual optimization needed

2. **Lazy Loading**
   - Images load only when needed
   - Faster initial page load
   - Better Core Web Vitals

3. **Credit Efficiency**
   - Smaller file sizes (200-400KB vs 1-5MB)
   - CDN caching (repeat views are free)
   - Appropriate sizing for each context

4. **Consistent API**
   - Same component for all images
   - Context-based sizing
   - Automatic fallback handling

## Critical Images

Images that should load immediately (no lazy loading):

- Logos
- Above-fold hero images
- Navigation icons
- Critical UI elements

**How to mark as critical:**
```typescript
<OptimizedImage src={logo} alt="Logo" priority={true} />
// or use specialized component
<LogoImage src={logo} alt="Logo" />
```

## Error Handling

The component automatically:
- Falls back to original URL if optimization fails
- Shows placeholder while loading
- Displays error message if image fails to load
- Handles both Cloudinary and local images

## Performance Impact

### Before Optimization
- Image sizes: 1-5MB
- Bandwidth: High
- Load time: Slow
- Credit usage: High

### After Optimization
- Image sizes: 200-400KB (60-80% reduction)
- Bandwidth: Low
- Load time: Fast
- Credit usage: Minimal

## Best Practices

1. **Always use context-based sizing**
   ```typescript
   // ✅ Good
   <ProductImage context="card" />
   
   // ❌ Bad
   <ProductImage width={300} height={300} />
   ```

2. **Mark critical images**
   ```typescript
   // ✅ Good
   <LogoImage src={logo} priority={true} />
   
   // ❌ Bad
   <OptimizedImage src={logo} />
   ```

3. **Use appropriate contexts**
   ```typescript
   // ✅ Good
   <CategoryImage context="listing" /> // For category grids
   <ProductImage context="detail" /> // For product pages
   
   // ❌ Bad
   <ProductImage context="fullscreen" /> // For listings (too large)
   ```

4. **Provide proper alt text**
   ```typescript
   // ✅ Good
   <OptimizedImage src={image} alt="Product name" />
   
   // ❌ Bad
   <OptimizedImage src={image} alt="image" />
   ```

## Troubleshooting

### Images not loading
- Check that Cloudinary domain is allowed in `next.config.ts`
- Verify image URL is correct
- Check browser console for errors

### Images not optimizing
- Verify Cloudinary configuration
- Check that URL is a valid Cloudinary URL
- Ensure context is specified correctly

### High bandwidth usage
- Use appropriate context sizes
- Enable lazy loading (don't use priority unless needed)
- Verify `f_auto` and `q_auto` are being applied

## Summary

The optimization system:
- ✅ Works with both Cloudinary and local images
- ✅ Applies lazy loading automatically
- ✅ Optimizes images based on context
- ✅ Handles errors gracefully
- ✅ Minimizes Cloudinary credit usage
- ✅ Improves page load performance

All images across the website should use `OptimizedImage` or its specialized variants for consistent optimization and performance.

