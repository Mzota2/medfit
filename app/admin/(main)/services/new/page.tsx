/**
 * New Service Page
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useCreateService, useCategories, useDeleteService, useUpdateService } from '@/hooks';
import { Item, ItemStatus, ItemImage } from '@/types/item';
import { Button, Input, Textarea, Loading } from '@/components/ui';
import { uploadImage } from '@/lib/cloudinary/utils';
import { isCloudinaryConfigured } from '@/lib/cloudinary/config';
import { Upload, X } from 'lucide-react';
import Link from 'next/link';
import { validateImageFileForVariant, IMAGE_VARIANTS } from '@/lib/images/variants';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { ImageUploadWithCrop } from '@/components/admin/ImageUploadWithCrop';
import { getUserFriendlyMessage } from '@/lib/utils/user-messages';

export default function NewServicePage() {
  const router = useRouter();
  const { currentBusiness } = useApp();
  const createService = useCreateService();
  const deleteService = useDeleteService();
  const updateService = useUpdateService();
  const { data: categories = [] } = useCategories({
    businessId: currentBusiness?.id,
    type: 'service',
    enabled: !!currentBusiness?.id,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  interface ServiceFormData {
    name: string;
    description: string;
    slug: string;
    status: ItemStatus;
    categoryIds: string[];
    pricing: {
      basePrice: number;
      currency: string;
      taxIncluded: boolean;
      bookingFee: number;
      totalFee: number;
      allowPartialPayment: boolean;
      includeTransactionFee: boolean;
      transactionFeeRate: number;
    };
    duration: number;
    bufferTime: number;
    maxConcurrentBookings: number;
    images: ItemImage[];
    tags: string[];
    specifications: Record<string, string>;
  }

  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    slug: '',
    status: ItemStatus.DRAFT as ItemStatus,
    categoryIds: [] as string[],
    pricing: {
      basePrice: 0,
      currency: 'MWK',
      taxIncluded: false,
      bookingFee: 0,
      totalFee: 0,
      allowPartialPayment: false,
      includeTransactionFee: false,
      transactionFeeRate: 0.03, // Default 3%
    },
    duration: 60, // minutess 
    bufferTime: 0, // minutes
    maxConcurrentBookings: 1,
    images: [] as ItemImage[],
    tags: [], // Made optional - default to empty array
    specifications: {}, // Made optional - default to empty object
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
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
    setFormData((prev: ServiceFormData) => ({
      ...prev,
      name,
      // Only auto-generate slug if it hasn't been manually edited
      slug: slugManuallyEdited ? prev.slug : generateSlug(name),
    }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setFormData((prev: ServiceFormData) => ({
      ...prev,
      slug: e.target.value,
    }));
  };

  const handleCroppedImageUpload = async (file: File): Promise<void> => {
    try {
      const result = await validateImageFileForVariant(file, 'serviceGallery');
      if (!result.valid) {
        const message =
          result.error || 'One or more images do not meet the recommended dimensions';
        setErrors((prev) => ({ ...prev, images: message }));
        throw new Error(message);
      }

      setImageFiles((prev) => [...prev, file]);
      setErrors((prev) => ({ ...prev, images: '' }));
    } catch (error) {
      console.error('Error validating service image dimensions:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Could not read image dimensions. Please try another file.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
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
    if (formData.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      let serviceId: string | null = null;
      const uploadedImages: ItemImage[] = [];

      // Step 1: Save to Firebase first (without new image URLs)
      // This way we don't waste Cloudinary storage if Firebase fails
      const { bookingFee, totalFee, allowPartialPayment, ...pricingWithoutBookingFields } = formData.pricing;
      const serviceDataWithoutNewImages: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'service',
        name: formData.name,
        description: formData.description,
        slug: formData.slug,
        status: formData.status,
        categoryIds: formData.categoryIds,
        images: formData.images, // Only existing images, not new uploads
        pricing: pricingWithoutBookingFields,
        duration: formData.duration,
        bufferTime: formData.bufferTime,
        maxConcurrentBookings: formData.maxConcurrentBookings,
        tags: formData.tags,
        specifications: formData.specifications,
        ...(bookingFee > 0 ? { bookingFee } : {}),
        ...(totalFee > 0 ? { totalFee } : {}),
        ...(allowPartialPayment ? { allowPartialPayment } : {}),
      };

      // Add businessId to the service data
      const serviceDataWithBusiness = {
        ...serviceDataWithoutNewImages,
        businessId: currentBusiness?.id,
      };
      serviceId = await createService.mutateAsync(serviceDataWithBusiness);

      // Step 2: Upload new images to Cloudinary if files were selected
      if (imageFiles.length > 0) {
        if (!isCloudinaryConfigured()) {
          // Cleanup: Delete the Firebase record if Cloudinary is not configured
          if (serviceId) {
            try {
              await deleteService.mutateAsync(serviceId);
            } catch (cleanupError) {
              console.error('Failed to cleanup Firebase record:', cleanupError);
            }
          }
          setErrors({ images: 'Cloudinary is not properly configured' });
          setIsSubmitting(false);
          return;
        }

        setUploadingImages(true);
        try {
          for (let i = 0; i < imageFiles.length; i++) {
            try {
              const result = await uploadImage(imageFiles[i], 'services');
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
          if (serviceId && uploadedImages.length > 0) {
            const allImages = [...formData.images, ...uploadedImages].map((img, idx) => ({
              ...img,
              order: idx,
            }));
            await updateService.mutateAsync({
              serviceId: serviceId,
              updates: { images: allImages },
            });
          }
        } catch (error) {
          console.error('Error uploading images:', error);
          
          // Cleanup: Delete the Firebase record if image upload fails
          if (serviceId) {
            try {
              await deleteService.mutateAsync(serviceId);
              console.log('Cleaned up Firebase record after failed image upload');
            } catch (cleanupError) {
              console.error('Failed to cleanup Firebase record:', cleanupError);
            }
          }
          
          setErrors({ 
            images: 'Failed to upload images. The service was not created. Please try again.' 
          });
          setIsSubmitting(false);
          setUploadingImages(false);
          return;
        } finally {
          setUploadingImages(false);
        }
      }

      router.push(`/admin/services/`);
    } catch (error) {
      console.error('Error creating service:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create service';
      setErrors({ submit: getUserFriendlyMessage(errorMessage, 'Failed to create service. Please try again.')});
    } finally {
      setIsSubmitting(false);
      setUploadingImages(false);
    }
  };

  if (createService.isPending || isSubmitting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Create New Service</h1>
        <Link href="/admin/services" className="w-full sm:w-auto sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto">
            <span className="hidden sm:inline">Back to Services</span>
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
                label="Service Name"
                value={formData.name}
                onChange={handleNameChange}
                error={errors.name}
                required
                placeholder="Haircut & Styling"
              />
              <Input
                label="Slug"
                value={formData.slug}
                onChange={handleSlugChange}
                error={errors.slug}
                required
                placeholder="haircut-styling"
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
                placeholder="Service description here..."
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
              <Input
                label="Booking Fee (Optional)"
                type="number"
                step="0.01"
                min="0"
                value={formData.pricing.bookingFee || 0}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pricing: { ...prev.pricing, bookingFee: parseFloat(e.target.value) || 0 },
                  }))
                }
                placeholder="0.00"
                helpText="Amount customer can pay upfront to secure booking"
              />
              <Input
                label="Total Fee (Optional)"
                type="number"
                step="0.01"
                min="0"
                value={formData.pricing.totalFee || 0}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pricing: { ...prev.pricing, totalFee: parseFloat(e.target.value) || 0 },
                  }))
                }
                placeholder="0.00"
                helpText="Total service fee (if different from base price)"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowPartialPayment"
                  checked={formData.pricing.allowPartialPayment || false}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pricing: { ...prev.pricing, allowPartialPayment: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="allowPartialPayment" className="text-sm text-foreground">
                  Allow Partial Payment (customer can pay booking fee only)
                </label>
              </div>
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

          {/* Service Details */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Service Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Duration (minutes)"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    duration: parseInt(e.target.value) || 0,
                  }))
                }
                error={errors.duration}
                required
                placeholder="60"
              />
              <Input
                label="Buffer Time (minutes)"
                type="number"
                min="0"
                value={formData.bufferTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bufferTime: parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="15"
              />
              <Input
                label="Max Concurrent Bookings"
                type="number"
                min="1"
                value={formData.maxConcurrentBookings}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxConcurrentBookings: parseInt(e.target.value) || 1,
                  }))
                }
                placeholder="1"
              />
            </div>
          </div>

          {/* Images */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Images</h2>
            <p className="text-xs text-text-muted mb-3">
              Recommended: {IMAGE_VARIANTS.serviceGallery.minWidth}x{IMAGE_VARIANTS.serviceGallery.minHeight}px (square)
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

              {/* New Image Uploads (cropped) */}
              {imageFiles.map((file, idx) => {
                const preview = URL.createObjectURL(file);
                return (
                  <div
                    key={`new-${idx}`}
                    className="relative aspect-square border border-border rounded-lg overflow-hidden bg-background-secondary"
                  >
                    <OptimizedImage
                      src={preview}
                      alt="Preview"
                      fill
                      context="detail"
                      aspectRatio="square"
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFiles((prev) => prev.filter((_, i) => i !== idx));
                        URL.revokeObjectURL(preview);
                      }}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive-hover"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              {/* Cropped Upload Button */}
              <ImageUploadWithCrop
                variant="serviceGallery"
                onImageUpload={handleCroppedImageUpload}
                onError={(message) =>
                  setErrors((prev) => ({
                    ...prev,
                    images: message,
                  }))
                }
                disabled={isSubmitting || uploadingImages}
                className="aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:bg-background-secondary transition-colors"
              >
                <Upload className="w-8 h-8 mb-2 text-text-muted" />
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
                    placeholder="Tag (e.g., Full service)"
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

          {/* Service Specifications */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Service Specifications</h2>
            <p className="text-sm text-text-secondary mb-3">
              Add key-value pairs for service specifications (e.g., &quot;RAM: 4GB&quot;)
            </p>
            <div className="space-y-3">
              {Object.entries(formData.specifications || {}).map(([key, value], index) => (
                <div key={index} className="grid grid-cols-[1fr,2fr,auto] gap-2 items-center">
                  <Input
                    placeholder="Key (e.g., RAM)"
                    value={key}
                    onChange={(e) => {
                      const newSpecs = { ...formData.specifications };
                      delete newSpecs[key];
                      newSpecs[e.target.value] = value as string;
                      setFormData((prev: ServiceFormData) => ({
                        ...prev,
                        specifications: { ...newSpecs }
                      }));
                    }}
                  />
                  <Input
                    placeholder="Value (e.g., 4GB)"
                    value={value}
                    onChange={(e) => {
                      setFormData((prev: ServiceFormData) => ({
                        ...prev,
                        specifications: {
                          ...prev.specifications,
                          [key]: e.target.value
                        }
                      }));
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newSpecs = { ...formData.specifications };
                      delete newSpecs[key];
                      setFormData((prev: ServiceFormData) => ({
                        ...prev,
                        specifications: { ...newSpecs }
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
            <Link href="/admin/services" className="w-full sm:w-auto">
              <Button type="button" variant="outline" disabled={isSubmitting || uploadingImages} className="w-full sm:w-auto">
                Cancel
              </Button>
            </Link>
            <Button type="submit" isLoading={isSubmitting || uploadingImages} disabled={uploadingImages} className="w-full sm:w-auto">
              Create Service
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

