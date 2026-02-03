/**
 * New Product Page
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useCreateProduct, useCategories, useDeleteProduct, useUpdateProduct } from '@/hooks';
import { Item, ItemStatus, ItemImage } from '@/types/item';
import { Button, Input, Textarea, Loading } from '@/components/ui';
import { uploadImage } from '@/lib/cloudinary/utils';
import { isCloudinaryConfigured } from '@/lib/cloudinary/config';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { X, Plus } from 'lucide-react';
import Link from 'next/link';
import {IMAGE_VARIANTS } from '@/lib/images/variants';
import { ImageUploadWithCrop } from '@/components/admin/ImageUploadWithCrop';
import { ERROR_MESSAGES, getUserFriendlyMessage } from '@/lib/utils/user-messages';

export default function NewProductPage() {
  const router = useRouter();
  const { currentBusiness } = useApp();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories = [] } = useCategories({
    businessId: currentBusiness?.id,
    type: 'product',
    enabled: !!currentBusiness?.id,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    slug: string;
    sku: string;
    status: ItemStatus;
    categoryIds: string[];
    pricing: {
      basePrice: number;
      compareAtPrice: number;
      currency: string;
      taxIncluded: boolean;
      includeTransactionFee: boolean;
      transactionFeeRate: number;
    };
    inventory: {
      quantity: number;
      reserved: number;
      available: number;
      lowStockThreshold: number;
      trackInventory: boolean;
    };
    images: ItemImage[];
    tags: string[];
    specifications: Record<string, any>;
    isReturnable: boolean;
  }>({
    name: '',
    description: '',
    slug: '',
    sku: '',
    status: ItemStatus.DRAFT as ItemStatus,
    categoryIds: [] as string[],
    pricing: {
      basePrice: 0,
      compareAtPrice: 0,
      currency: 'MWK',
      taxIncluded: false,
      includeTransactionFee: false,
      transactionFeeRate: 0.03, // Default 3%
    },
    inventory: {
      quantity: 0,
      reserved: 0,
      available: 0,
      lowStockThreshold: 10,
      trackInventory: true,
    },
    images: [] as ItemImage[],
    tags: [], // Made optional - default to empty array
    specifications: {}, // Made optional - default to empty object
    isReturnable: true, // Default to true for new products
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Categories are automatically fetched by React Query

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      // Only auto-generate slug if it hasn't been manually edited
      slug: slugManuallyEdited ? prev.slug : generateSlug(name),
    }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setFormData((prev) => ({
      ...prev,
      slug: e.target.value,
    }));
  };

  const handleImageUpload = async (file: File) => {
    if (!isCloudinaryConfigured()) {
      setErrors({ images: 'Cloudinary is not properly configured' });
      return null;
    }

    try {
      setIsUploadingImage(true);
      const result = await uploadImage(file, 'products');
      return result.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrors({ images: 'Failed to upload images. The product was not created. Please try again.' });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAddImage = async (file: File) => {
    const imageUrl = await handleImageUpload(file);
    if (imageUrl) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, { url: imageUrl, alt: '', order: prev.images.length }],
      }));
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    }
    if (formData.pricing.basePrice <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    if (formData.categoryIds.length === 0) {
      newErrors.categories = 'At least one category is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      let productId: string | null = null;
      const uploadedImages: ItemImage[] = [];

      // Step 1: Save to Firebase first (without new image URLs)
      // This way we don't waste Cloudinary storage if Firebase fails
      const available = formData.inventory.trackInventory
        ? formData.inventory.quantity - formData.inventory.reserved
        : 999999;

      const productDataWithoutNewImages: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'product',
        name: formData.name,
        description: formData.description,
        slug: formData.slug,
        status: formData.status,
        categoryIds: formData.categoryIds,
        images: formData.images, // Only existing images, not new uploads
        pricing: formData.pricing,
        sku: formData.sku,
        inventory: {
          ...formData.inventory,
          available,
        },
        tags: formData.tags,
        specifications: formData.specifications,
        isReturnable: formData.isReturnable,
      };

      // Add businessId to the product data
      const productDataWithBusiness = {
        ...productDataWithoutNewImages,
        businessId: currentBusiness?.id,
      };
      productId = await createProduct.mutateAsync(productDataWithBusiness);

      // Step 2: Upload new images to Cloudinary if files were selected
      if (imageFiles.length > 0) {
        if (!isCloudinaryConfigured()) {
          // Cleanup: Delete the Firebase record if Cloudinary is not configured
          if (productId) {
            try {
              await deleteProduct.mutateAsync(productId);
            } catch (cleanupError) {
              console.error('Failed to cleanup Firebase record:', cleanupError);
            }
          }
          setErrors({ images: 'Cloudinary is not properly configured' });
          setIsSubmitting(false);
          return;
        }

        setIsUploadingImage(true);
        try {
          for (let i = 0; i < imageFiles.length; i++) {
            try {
              const result = await uploadImage(imageFiles[i], 'products');
              uploadedImages.push({
                url: result.url,
                alt: formData.name,
                order: formData.images.length + i,
              });
            } catch (error) {
              console.error('Error uploading image:', error);
              // If any image fails, stop and cleanup
              throw error;
            }
          }

          // Step 3: Update Firebase record with the new Cloudinary image URLs
          if (productId && uploadedImages.length > 0) {
            const allImages = [...formData.images, ...uploadedImages].map((img, idx) => ({
              ...img,
              order: idx,
            }));
            await updateProduct.mutateAsync({
              productId: productId,
              updates: { images: allImages },
            });
          }
        } catch (error) {
          console.error('Error uploading images:', error);
          // Cleanup: Delete the Firebase record if image upload fails
          if (productId) {
            try {
              await deleteProduct.mutateAsync(productId);
              console.log('Cleaned up Firebase record after failed image upload');
            } catch (cleanupError) {
              console.error('Failed to cleanup Firebase record:', cleanupError);
            }
          }
          setErrors({ images: 'Failed to upload images. The product was not created. Please try again.' });
          setIsSubmitting(false);
          setIsUploadingImage(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      router.push(`/admin/products`);
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create product';
      setErrors({ submit: getUserFriendlyMessage(errorMessage, 'Failed to create product. Please try again.') });
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  if (createProduct.isPending || isSubmitting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Create New Product</h1>
        <Link href="/admin/products" className="w-full sm:w-auto sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto">
            <span className="hidden sm:inline">Back to Products</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Product Name"
                value={formData.name}
                onChange={handleNameChange}
                error={errors.name}
                required
                placeholder="iPhone 15 Pro"
              />
              <Input
                label="Slug"
                value={formData.slug}
                onChange={handleSlugChange}
                error={errors.slug}
                required
                placeholder="iphone-15-pro"
              />
              <Input
                label="SKU"
                value={formData.sku}
                onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                placeholder="PROD-001"
              />
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ItemStatus }))}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                >
                  <option value={ItemStatus.DRAFT}>Draft</option>
                  <option value={ItemStatus.ACTIVE}>Active</option>
                  <option value={ItemStatus.INACTIVE}>Inactive</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <Textarea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Product description here..."
                rows={4}
              />
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Categories <span className="text-destructive">*</span>
            </label>
            {errors.categories && (
              <p className="text-sm text-destructive mb-2">{errors.categories}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-4">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.categoryIds.includes(category.id!)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData((prev) => ({
                          ...prev,
                          categoryIds: [...prev.categoryIds, category.id!],
                        }));
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          categoryIds: prev.categoryIds.filter((id) => id !== category.id),
                        }));
                      }
                    }}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm text-foreground">{category.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Base Price"
                type="number"
                step="0.01"
                min="0"
                value={formData.pricing.basePrice}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pricing: { ...prev.pricing, basePrice: parseFloat(e.target.value) || 0 },
                  }))
                }
                error={errors.price}
                required
                placeholder="9999.00"
              />
              <Input
                label="Compare At Price (Original Price)"
                type="number"
                step="0.01"
                min="0"
                value={formData.pricing.compareAtPrice || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pricing: {
                      ...prev.pricing,
                      compareAtPrice: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
                placeholder="14999.00"
              />
              <Input
                label="Currency"
                value={formData.pricing.currency}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pricing: { ...prev.pricing, currency: e.target.value },
                  }))
                }
                placeholder="MWK"
              />
            </div>
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.pricing.includeTransactionFee || false}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        includeTransactionFee: e.target.checked,
                      },
                    }))
                  }
                  className="w-5 h-5 rounded border-border"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Include Transaction Fee in Selling Price
                  </span>
                  <p className="text-xs text-text-secondary mt-1">
                    When enabled, the selling price will automatically include the payment provider&apos;s transaction fee (3% by default) so the business doesn&apos;t lose money. The displayed price will be calculated as: Base Price ÷ (1 - Fee Rate).
                  </p>
                </div>
              </label>
              {formData.pricing.includeTransactionFee && (
                <div className="ml-8">
                  <Input
                    label="Transaction Fee Rate"
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={formData.pricing.transactionFeeRate || 0.03}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pricing: {
                          ...prev.pricing,
                          transactionFeeRate: parseFloat(e.target.value) || 0.03,
                        },
                      }))
                    }
                    placeholder="0.03"
                    helpText="Enter as decimal (e.g., 0.03 for 3%)"
                  />
                  {formData.pricing.basePrice > 0 && (
                    <div className="mt-2 p-3 bg-background-secondary rounded-lg">
                      <p className="text-xs text-text-secondary">
                        <strong>Price Preview:</strong>
                      </p>
                      <p className="text-sm text-foreground mt-1">
                        Base Price: {formData.pricing.currency} {formData.pricing.basePrice.toFixed(2)}
                      </p>
                      <p className="text-sm text-foreground">
                        Selling Price (with fee): {formData.pricing.currency}{' '}
                        {(
                          formData.pricing.basePrice /
                          (1 - (formData.pricing.transactionFeeRate || 0.03))
                        ).toFixed(2)}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        After {((formData.pricing.transactionFeeRate || 0.03) * 100).toFixed(1)}% fee, you&apos;ll receive:{' '}
                        {formData.pricing.currency} {formData.pricing.basePrice.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Inventory */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Inventory</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.inventory.trackInventory}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        inventory: { ...prev.inventory, trackInventory: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm text-foreground">Track Inventory</span>
                </label>
              </div>
              {formData.inventory.trackInventory && (
                <>
                  <Input
                    label="Quantity"
                    type="number"
                    min="0"
                    value={formData.inventory.quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        inventory: {
                          ...prev.inventory,
                          quantity: parseInt(e.target.value) || 0,
                          available: parseInt(e.target.value) || 0 - prev.inventory.reserved,
                        },
                      }))
                    }
                    placeholder="100"
                  />
                  <Input
                    label="Low Stock Threshold"
                    type="number"
                    min="0"
                    value={formData.inventory.lowStockThreshold}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        inventory: { ...prev.inventory, lowStockThreshold: parseInt(e.target.value) || 0 },
                      }))
                    }
                    placeholder="10"
                  />
                </>
              )}
            </div>
          </div>

          {/* Return Policy */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Return Policy</h2>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isReturnable}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isReturnable: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm text-foreground">This product is returnable</span>
              </label>
              <p className="text-xs text-text-secondary mt-1 ml-6">
                Uncheck if this product cannot be returned (e.g., perishable items, custom-made products, etc.)
              </p>
            </div>
          </div>

          {/* Images */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Images</h2>
            <p className="text-xs text-text-muted mb-3">
              Recommended: {IMAGE_VARIANTS.productGallery.minWidth}x{IMAGE_VARIANTS.productGallery.minHeight}px (square)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Existing Images */}
              {formData.images.map((img, idx) => (
                <div key={idx} className="relative aspect-square border border-border rounded-lg overflow-hidden bg-background-secondary">
                  <OptimizedImage 
                    src={img.url} 
                    alt={img.alt || ''} 
                    fill 
                    context="detail"
                    aspectRatio="square"
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive-hover"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <ImageUploadWithCrop
                variant="productGallery"
                onImageUpload={handleAddImage}
                disabled={isSubmitting || isUploadingImage}
                className="aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:bg-background-secondary transition-colors"
              >
                <Plus className="w-8 h-8 text-text-muted" />
              </ImageUploadWithCrop>
            </div>
            {errors.images && <p className="mt-2 text-sm text-destructive">{errors.images}</p>}
          </div>

          {/* What's Included (Tags) */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">What&apos;s Included (Tags)</h2>
            <p className="text-sm text-text-secondary mb-3">
              Add tags that will be displayed in the &quot;What&apos;s Included&quot; section
            </p>
            <div className="space-y-3">
              {formData.tags.map((tag, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Tag (e.g., Free shipping)"
                    value={tag}
                    onChange={(e) => {
                      const newTags = [...formData.tags];
                      newTags[index] = e.target.value;
                      setFormData((prev) => ({ ...prev, tags: newTags }));
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        tags: prev.tags.filter((_, i) => i !== index),
                      }));
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    tags: [...prev.tags, ''],
                  }));
                }}
              >
                + Add Tag
              </Button>
            </div>
          </div>

           {/* Product Specifications */}
           <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Product Specifications</h2>
            <p className="text-sm text-text-secondary mb-3">
              Add key-value pairs for product specifications (e.g., &quot;RAM: 4GB&quot;)
            </p>
            <div className="space-y-3">
              {Object.entries(formData.specifications).map(([key, value], index) => (
                <div key={index} className="grid grid-cols-[1fr,2fr,auto] gap-2 items-center">
                  <Input
                    placeholder="Key (e.g., RAM)"
                    value={key}
                    onChange={(e) => {
                      const newSpecs = { ...formData.specifications };
                      delete newSpecs[key];
                      newSpecs[e.target.value] = value;
                      setFormData((prev) => ({ ...prev, specifications: newSpecs }));
                    }}
                  />
                  <Input
                    placeholder="Value (e.g., 4GB)"
                    value={value}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        specifications: { ...prev.specifications, [key]: e.target.value },
                      }));
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newSpecs = { ...formData.specifications };
                      delete newSpecs[key];
                      setFormData((prev) => ({ ...prev, specifications: newSpecs }));
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    specifications: { ...prev.specifications, ['']: '' },
                  }));
                }}
              >
                + Add Specification
              </Button>
            </div>
          </div>

          {errors.submit && (
            <div className="p-4 bg-destructive/20 text-destructive rounded-lg">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-border">
            <Link href="/admin/products" className="w-full sm:w-auto">
              <Button type="button" variant="outline" disabled={isSubmitting || isUploadingImage} className="w-full sm:w-auto">
                Cancel
              </Button>
            </Link>
            <Button type="submit" isLoading={isSubmitting || isUploadingImage} disabled={isUploadingImage} className="w-full sm:w-auto">
              Create Product
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

