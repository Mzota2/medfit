# Cloudinary Optimization Setup Guide

This guide provides step-by-step instructions to configure Cloudinary for optimal image optimization and minimal credit usage.

## Overview

Our optimization system uses:
- **Automatic format selection** (`f_auto`) - Serves WebP/AVIF to modern browsers
- **Automatic quality** (`q_auto`) - Cloudinary optimizes quality based on image content
- **Context-based sizing** - Different sizes for listings, details, fullscreen
- **CDN caching** - First view costs bandwidth, repeat views are FREE

## Manual Cloudinary Configuration Steps

### Step 1: Enable Auto Format and Quality

1. Log in to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Go to **Settings** → **Upload**
3. Scroll to **Upload presets**
4. Click on your upload preset (or create one if you haven't)
5. Configure the following:

   **In the "Upload Manipulations" section:**
   - **Format**: Set to `Auto` (or leave empty to use `f_auto` in transformations)
   - **Quality**: Set to `Auto` (or leave empty to use `q_auto` in transformations)
   - **Eager transformations**: Leave empty (we handle transformations on-demand)

   **Note**: We handle format and quality in code, so you can leave these empty in the preset.

### Step 2: Enable CDN Caching

1. Go to **Settings** → **Security**
2. Under **Access Control**:
   - Ensure **Restricted media types** is set appropriately
   - For public images, leave it unrestricted

3. Go to **Settings** → **Usage**:
   - **CDN Caching** is enabled by default
   - Cloudinary automatically caches transformed images
   - Cache duration: Default is 1 year (this is optimal)

### Step 3: Configure Upload Preset for Optimization

1. Go to **Settings** → **Upload** → **Upload presets**
2. Click on your preset (e.g., `eshopcure-upload`)
3. Configure:

   **Basic Settings:**
   - **Preset name**: `eshopcure-upload` (or your chosen name)
   - **Signing mode**: `Unsigned` (required for client-side uploads)
   - **Folder**: `eshopcure` (base folder)

   **Upload Manipulations:**
   - Leave empty (we handle transformations in code for flexibility)

   **Access Control:**
   - **Access mode**: `Public` (for public images)
   - **Use filename**: Optional (can enable to keep original filenames)

   **Save** the preset

### Step 4: Enable Auto-Create Folders

1. Go to **Settings** → **Upload**
2. Scroll to **Upload defaults**
3. Enable **Auto-create folders**
   - This allows automatic folder creation when uploading to paths like `eshopcure/categories/`

### Step 5: Configure Image Optimization Settings

1. Go to **Settings** → **Media Library**
2. Under **Image optimization**:
   - **Format**: Auto (already handled in code)
   - **Quality**: Auto (already handled in code)
   - **Progressive JPEG**: Enable (for better perceived performance)

### Step 6: Set Up Bandwidth Optimization

1. Go to **Settings** → **Usage**
2. Review your current usage:
   - **Storage**: Monitor your storage usage
   - **Bandwidth**: Monitor bandwidth consumption
   - **Transformations**: Monitor transformation usage

3. **Best Practices** (already implemented in code):
   - Use consistent transformation parameters (enables better caching)
   - Use appropriate sizes for each context
   - Leverage `f_auto` and `q_auto` for automatic optimization

### Step 7: Verify Configuration

1. Upload a test image through your application
2. Check the generated URL in Cloudinary Media Library
3. Verify the URL includes transformations:
   - Example: `https://res.cloudinary.com/your-cloud/image/upload/c_fill,h_400,w_400,f_auto,q_auto/eshopcure/categories/test-image`

## Optimization Strategy Summary

### Image Size Presets (Used in Code)

| Context | Size | Use Case |
|---------|------|----------|
| Thumbnail | 100x100 | Small previews, icons |
| Small/Card | 300x300 | Category cards, small product cards |
| Medium/Listing | 400x400 | Product listings, category grids |
| Large/Detail | 600x600 | Product detail pages |
| Extra Large/Fullscreen | 900x900 | Lightbox, fullscreen preview |
| Banner/Hero | 1200x600 | Banners, hero sections |

### Transformation Parameters

All images use:
- `c_fill` - Fill mode for consistent aspect ratios
- `f_auto` - Automatic format (WebP/AVIF for modern browsers)
- `q_auto` - Automatic quality optimization
- `w_{width},h_{height}` - Specific dimensions based on context

### Credit Usage Optimization

1. **Storage Credits**: 
   - Only original images are stored
   - Transformed images are generated on-demand and cached
   - Storage grows slowly as you add new products

2. **Upload Credits**:
   - One credit per 1,000 uploads
   - Minimal impact for most use cases

3. **Bandwidth Credits**:
   - First view of transformed image = bandwidth credit
   - Subsequent views (cached) = FREE
   - Using appropriate sizes reduces bandwidth per view
   - `f_auto` and `q_auto` reduce file sizes by 25-50%

## Expected Results

With proper optimization:
- **Image file sizes**: 200-400KB (down from 1-5MB originals)
- **Bandwidth reduction**: 60-80% compared to serving originals
- **Credit efficiency**: ~66,000 image views per 20GB bandwidth
- **Performance**: Faster page loads, better Core Web Vitals

## Monitoring Usage

1. Go to **Settings** → **Usage** regularly
2. Monitor:
   - Storage growth (should be slow)
   - Bandwidth usage (should be optimized)
   - Transformation usage (should be efficient)

3. Set up alerts (if available in your plan):
   - Storage approaching limits
   - Bandwidth usage spikes

## Troubleshooting

### Images not optimizing
- Check that `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set correctly
- Verify upload preset is configured
- Check browser console for errors

### High bandwidth usage
- Ensure you're using context-based sizing functions
- Verify `f_auto` and `q_auto` are being applied
- Check that CDN caching is working (repeat views should be faster)

### Images not loading
- Verify Cloudinary domain is allowed in `next.config.ts`
- Check that images are uploaded correctly
- Verify publicId extraction is working

## Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Image Optimization Best Practices](https://cloudinary.com/documentation/image_optimization)
- [Transformation Reference](https://cloudinary.com/documentation/image_transformations)

