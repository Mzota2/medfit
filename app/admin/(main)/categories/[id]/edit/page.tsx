/**
 * Edit Category Page
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCategory, useUpdateCategory } from '@/hooks';
import { Button, Input, Textarea, Loading } from '@/components/ui';
import { uploadImage } from '@/lib/cloudinary/utils';
import { isCloudinaryConfigured } from '@/lib/cloudinary/config';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { ImageUploadWithCrop } from '@/components/admin/ImageUploadWithCrop';
import Link from 'next/link';
import { getUserFriendlyMessage } from '@/lib/utils/user-messages';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;
  
  const { data: category, isLoading: categoryLoading } = useCategory(categoryId);
  const updateCategory = useUpdateCategory();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialLoad, setInitialLoad] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    icon: '',
    image: '',
    type: 'product' as 'product' | 'service' | 'both',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string>('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Category is automatically fetched by React Query

  useEffect(() => {
    if (category && initialLoad) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        slug: category.slug || '',
        icon: category.icon || '',
        image: category.image || '',
        type: category.type || 'product',
      });
      setImagePreview(category.image || '');
      setSlugManuallyEdited(!!category.slug); // If slug exists, consider it manually edited
      setInitialLoad(false);
    }
  }, [category, initialLoad]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setFormData((prev) => ({
      ...prev,
      icon: emojiData.emoji,
    }));
    setShowEmojiPicker(false);
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
    setFormData((prev) => ({ ...prev, image: '' }));
    setImageError('');
  };
  
  const handleImageError = (error: string) => {
    setImageError(error);
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
    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      let uploadedImageUrl: string | null = null;

      // Step 1: Update Firebase first (without new image URL if new file)
      // This way we don't waste Cloudinary storage if Firebase fails
      const updatesWithoutImage = {
        ...formData,
        image: imageFile ? formData.image : formData.image, // Keep existing image if no new file
      };

      await updateCategory.mutateAsync({
        categoryId,
        updates: updatesWithoutImage,
      });

      // Step 2: Upload new image to Cloudinary if a new file was selected
      if (imageFile) {
        if (!isCloudinaryConfigured()) {
          setImageError('Cloudinary is not properly configured');
          setIsSubmitting(false);
          return;
        }

        setIsUploadingImage(true);
        try {
          const result = await uploadImage(imageFile, 'categories');
          uploadedImageUrl = result.url;

          // Step 3: Update Firebase record with the new Cloudinary image URL
          if (uploadedImageUrl) {
            await updateCategory.mutateAsync({
              categoryId,
              updates: { image: uploadedImageUrl },
            });
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          // Note: We don't rollback the Firebase update since the category data is already saved
          // The user can retry the image upload later
          setImageError('Failed to upload image. Category was updated but image upload failed. Please try uploading the image again.');
          setIsSubmitting(false);
          setIsUploadingImage(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      router.push('/admin/categories');
    } catch (error) {
      console.error('Error updating category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
      setErrors({ submit: getUserFriendlyMessage(errorMessage, 'Failed to update category') });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (categoryLoading || initialLoad || !category) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-sm sm:text-base text-text-secondary mb-4">Category not found</p>
        <Link href="/admin/categories">
          <Button variant="outline" size="sm" className="sm:size-default">Back to Categories</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Edit Category: {formData.name || category.name}</h1>
        <Link href="/admin/categories" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">Back to Categories</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <Input
                label="Category Name"
                value={formData.name}
                onChange={handleNameChange}
                error={errors.name}
                required
                placeholder="Electronics"
              />
              <Input
                label="Slug"
                value={formData.slug}
                onChange={handleSlugChange}
                error={errors.slug}
                required
                placeholder="electronics"
              />
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Type <span className="text-destructive">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as 'product' | 'service' | 'both' }))}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                >
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                  <option value="both">Both</option>
                </select>
                {errors.type && <p className="mt-1 text-sm text-destructive">{errors.type}</p>}
              </div>
            </div>
            <div className="mt-4">
              <Textarea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Category description here..."
                rows={3}
              />
            </div>
          </div>

          {/* Icon/Emoji */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Icon (Emoji)
            </label>
            <div className="flex items-center gap-4">
              <div className="relative" ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg bg-background hover:bg-background-secondary transition-colors"
                >
                  {formData.icon ? (
                    <span className="text-2xl">{formData.icon}</span>
                  ) : (
                    <>
                      <Smile className="w-5 h-5 text-text-muted" />
                      <span className="text-sm text-text-secondary">Select Emoji</span>
                    </>
                  )}
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-full left-0 mt-2 z-50 shadow-lg">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      autoFocusSearch={false}
                    />
                  </div>
                )}
              </div>
              {formData.icon && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, icon: '' }))}
                  className="px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  Remove Icon
                </button>
              )}
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Category Image
            </label>
            <div className="flex items-center justify-center w-full">
              <ImageUploadWithCrop
                variant="category"
                onImageUpload={handleImageUpload}
                onRemove={handleRemoveImage}
                onError={handleImageError}
                existingImageUrl={imagePreview || formData.image}
                disabled={isUploadingImage}
                className="w-full"
              />
            </div>
            {imageError && (
              <p className="mt-1 text-sm text-destructive">{imageError}</p>
            )}
          </div>

          {errors.submit && (
            <div className="p-4 bg-destructive/20 text-destructive rounded-lg">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-border">
            <Link href="/admin/categories" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || isUploadingImage}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              isLoading={isSubmitting || isUploadingImage}
              disabled={isUploadingImage}
              className="w-full sm:w-auto"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

