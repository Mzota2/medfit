/**
 * New Category Page
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useCreateCategory, useDeleteCategory, useUpdateCategory } from '@/hooks';
import { Button, Input, Textarea, Loading } from '@/components/ui';
import { uploadImage } from '@/lib/cloudinary/utils';
import { isCloudinaryConfigured } from '@/lib/cloudinary/config';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {Smile } from 'lucide-react';
import { ImageUploadWithCrop } from '@/components/admin/ImageUploadWithCrop';
import Link from 'next/link';
import { getUserFriendlyMessage } from '@/lib/utils/user-messages';

export default function NewCategoryPage() {
  const router = useRouter();
  const { currentBusiness } = useApp();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const updateCategory = useUpdateCategory();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
      let categoryId: string | null = null;
      let uploadedImageUrl: string | null = null;

      // Step 1: Save to Firebase first (without image URL if new file)
      // This way we don't waste Cloudinary storage if Firebase fails
      const categoryDataWithoutImage = {
        ...formData,
        image: imageFile ? '' : formData.image, // Only use existing image URL, not new uploads
      };

      categoryId = await createCategory.mutateAsync({
        categoryData: categoryDataWithoutImage,
        businessId: currentBusiness?.id,
      });

      // Step 2: Upload image to Cloudinary if a new file was selected
      if (imageFile) {
        if (!isCloudinaryConfigured()) {
          // Cleanup: Delete the Firebase record if Cloudinary is not configured
          if (categoryId) {
            try {
              await deleteCategory.mutateAsync(categoryId);
            } catch (cleanupError) {
              console.error('Failed to cleanup Firebase record:', cleanupError);
            }
          }
          setImageError('Cloudinary is not properly configured');
          setIsSubmitting(false);
          return;
        }

        setIsUploadingImage(true);
        try {
          const result = await uploadImage(imageFile, 'categories');
          uploadedImageUrl = result.url;

          // Step 3: Update Firebase record with the Cloudinary image URL
          if (categoryId && uploadedImageUrl) {
            await updateCategory.mutateAsync({
              categoryId,
              updates: { image: uploadedImageUrl },
            });
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          setImageError('Failed to upload image. Please try again.');
        } finally {
          setIsUploadingImage(false);
        }
      }

      router.push('/admin/categories');
    } catch (error) {
      console.error('Error creating category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
      setErrors({ submit:getUserFriendlyMessage(errorMessage, 'Failed to create category') });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createCategory.isPending || isSubmitting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Create New Category</h1>
        <Link href="/admin/categories" className="w-full sm:w-auto sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto">
            <span className="hidden sm:inline">Back to Categories</span>
            <span className="sm:hidden">Back</span>
          </Button>
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
                existingImageUrl={imagePreview}
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
              Create Category
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

