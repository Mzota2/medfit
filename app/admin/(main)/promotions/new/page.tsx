/**
 * New Promotion Page
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useCreatePromotion, useProducts, useServices } from '@/hooks';
import { Promotion, PromotionStatus, DiscountType } from '@/types/promotion';
import { Item } from '@/types/item';
import { Button, Input, Textarea, Loading } from '@/components/ui';
import { uploadImage } from '@/lib/cloudinary/utils';
import { isCloudinaryConfigured } from '@/lib/cloudinary/config';
import { ArrowLeft } from 'lucide-react';
import { ImageUploadWithCrop } from '@/components/admin/ImageUploadWithCrop';
import Link from 'next/link';
import { IMAGE_VARIANTS } from '@/lib/images/variants';
import { getUserFriendlyMessage } from '@/lib/utils/user-messages';

export default function NewPromotionPage() {
  const router = useRouter();
  const { currentBusiness } = useApp();
  const createPromotion = useCreatePromotion();
  const { data: productsData } = useProducts({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id,
  });
  const { data: servicesData } = useServices({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id,
  });
  const products = (productsData ?? []) as Item[];
  const services = (servicesData ?? []) as Item[];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    discount: 0,
    discountType: DiscountType.PERCENTAGE as DiscountType,
    startDate: '',
    endDate: '',
    status: PromotionStatus.INACTIVE as PromotionStatus,
    productsIds: [] as string[],
    servicesIds: [] as string[],
    image: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

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
      slug: slugManuallyEdited ? prev.slug : generateSlug(name),
    }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setFormData((prev) => ({ ...prev, slug: e.target.value }));
  };

  const handleImageUpload = async (file: File): Promise<void> => {
    setImageFile(file);
    setImageError('');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, image: '' }));
  };
  
  const handleImageError = (error: string) => {
    setImageError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Promotion name is required';
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required';
    if (formData.discount <= 0) newErrors.discount = 'Discount must be greater than 0';
    if (formData.discountType === DiscountType.PERCENTAGE && formData.discount > 100) {
      newErrors.discount = 'Discount percentage cannot exceed 100%';
    }
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      let imageUrl = formData.image;

      // Upload image if a new file was selected
      if (imageFile) {
        if (!isCloudinaryConfigured()) {
          setErrors({ image: 'Cloudinary is not properly configured' });
          setIsSubmitting(false);
          return;
        }

        setUploadingImage(true);
        try {
          const result = await uploadImage(imageFile, 'promotions');
          imageUrl = result.url;
        } catch (error) {
          console.error('Error uploading image:', error);
          setErrors({ image: 'Failed to upload image. Please try again.' });
          setIsSubmitting(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const promotionData: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        description: formData.description,
        slug: formData.slug,
        discount: formData.discount,
        discountType: formData.discountType,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        status: formData.status,
        productsIds: formData.productsIds,
        servicesIds: formData.servicesIds,
        businessId: currentBusiness?.id,
        image: imageUrl,
      };

      await createPromotion.mutateAsync({
        promotionData,
        businessId: currentBusiness?.id,
      });
      router.push('/admin/promotions');
    } catch (error) {
      console.error('Error creating promotion:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create promotion';
      setErrors({ submit: getUserFriendlyMessage(errorMessage, 'Failed to create promotion. Please try again.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createPromotion.status === 'pending' || isSubmitting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Link
          href="/admin/promotions"
          className="p-1.5 sm:p-2 text-text-secondary hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Create New Promotion</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Add a new promotional offer or discount
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {errors.submit && (
          <div className="p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-sm sm:text-base">
            {errors.submit}
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6 space-y-4 sm:space-y-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Basic Information</h2>
          <div className="space-y-4">
            <Input
              label="Promotion Name"
              value={formData.name}
              onChange={handleNameChange}
              error={errors.name}
              required
              placeholder="Summer Sale 2024"
            />

            <Input
              label="Slug"
              value={formData.slug}
              onChange={handleSlugChange}
              error={errors.slug}
              required
              placeholder="summer-sale-2024"
            />

            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Promotion description..."
            />
          </div>
        </div>

        {/* Discount Settings */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Discount Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Discount Type
              </label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={DiscountType.PERCENTAGE}>Percentage</option>
                <option value={DiscountType.FIXED}>Fixed Amount</option>
              </select>
            </div>

            <Input
              label={formData.discountType === DiscountType.PERCENTAGE ? 'Discount (%)' : 'Discount Amount (MWK)'}
              type="number"
              step={formData.discountType === DiscountType.PERCENTAGE ? '1' : '0.01'}
              min="0"
              max={formData.discountType === DiscountType.PERCENTAGE ? '100' : undefined}
              value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
              error={errors.discount}
              required
              placeholder={formData.discountType === DiscountType.PERCENTAGE ? '25' : '5000.00'}
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Date Range</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              error={errors.startDate}
              required
            />

            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              error={errors.endDate}
              required
            />
          </div>
        </div>

        {/* Status */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Status</h2>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Promotion Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as PromotionStatus })}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={PromotionStatus.ACTIVE}>Active</option>
              <option value={PromotionStatus.INACTIVE}>Inactive</option>
              <option value={PromotionStatus.EXPIRED}>Expired</option>
            </select>
          </div>
        </div>

        {/* Image Upload */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">Promotion Banner</h2>
          <p className="text-[10px] sm:text-xs text-text-muted mb-2 sm:mb-3">
            Recommended: {IMAGE_VARIANTS.promotionBanner.minWidth}x{IMAGE_VARIANTS.promotionBanner.minHeight}px (wide banner)
          </p>
          
          <div className="w-full">
            <ImageUploadWithCrop
              variant="promotionBanner"
              onImageUpload={handleImageUpload}
              onRemove={handleRemoveImage}
              onError={handleImageError}
              existingImageUrl={imagePreview}
              disabled={uploadingImage}
              className="w-full"
            />
            {imageError && <p className="text-xs sm:text-sm text-destructive mt-2">{imageError}</p>}
          </div>
        </div>

        {/* Product/Service Selection (Optional) */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Apply To (Optional)</h2>
          <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4">
            Leave empty to apply to all products/services, or select specific items
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Products (select multiple)
              </label>
              <select
                multiple
                value={formData.productsIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData({ ...formData, productsIds: selected });
                }}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]"
                size={5}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-secondary mt-1">
                Hold Ctrl/Cmd to select multiple products
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Services (select multiple)
              </label>
              <select
                multiple
                value={formData.servicesIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData({ ...formData, servicesIds: selected });
                }}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]"
                size={5}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-secondary mt-1">
                Hold Ctrl/Cmd to select multiple services
              </p>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
          <Link href="/admin/promotions" className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || uploadingImage} className="w-full sm:w-auto">
            {isSubmitting ? 'Creating...' : 'Create Promotion'}
          </Button>
        </div>
      </form>
    </div>
  );
}

