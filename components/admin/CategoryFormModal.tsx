/**
 * Category Form Modal Component
 * Handles create and edit operations for categories with Cloudinary image upload
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Input, Textarea, Button } from '@/components/ui';
import { Category } from '@/types/category';
import { uploadImage } from '@/lib/cloudinary/utils';
import { isCloudinaryConfigured } from '@/lib/cloudinary/config';
import { ImageUploadWithCrop } from './ImageUploadWithCrop';
import { getUserFriendlyMessage } from '@/lib/utils/user-messages';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  category?: Category | null;
  isLoading?: boolean;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  category,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    icon: '',
    image: '',
    type: 'product' as 'product' | 'service' | 'both',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        slug: category.slug || '',
        icon: category.icon || '',
        image: category.image || '',
        type: category.type || 'product',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        slug: '',
        icon: '',
        image: '',
        type: 'product',
      });
      setImageFile(null);
    }
    setErrors({});
  }, [category, isOpen]);

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
      slug: prev.slug || generateSlug(name),
    }));
  };

  const handleImageUpload = async (file: File) => {
    if (!isCloudinaryConfigured()) {
      setErrors({ image: 'Cloudinary is not properly configured' });
      return;
    }

    try {
      setIsUploading(true);
      const result = await uploadImage(file, 'categories');
      setFormData(prev => ({ ...prev, image: result.url }));
      setErrors(prev => ({ ...prev, image: '' }));
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrors(prev => ({ ...prev, image: 'Failed to upload image. Please try again.' }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: '' }));
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
      let imageUrl = formData.image;

      // Upload image if a new file was selected
      if (imageFile) {
        if (!isCloudinaryConfigured()) {
          setErrors({ image: 'Cloudinary is not properly configured' });
          return;
        }

        setUploadingImage(true);
        try {
          const result = await uploadImage(imageFile, 'categories');
          imageUrl = result.url;
        } catch (error) {
          console.error('Error uploading image:', error);
          setErrors({ image: 'Failed to upload image. Please try again.' });
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      await onSubmit({
        ...formData,
        image: imageUrl,
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        slug: '',
        icon: '',
        image: '',
        type: 'product',
      });
      setImageFile(null);
      onClose();
    } catch (error) {
      console.error('Error submitting category:', error);
      const errorMessage = getUserFriendlyMessage(error instanceof Error ? error.message : 'Failed to save category');
      setErrors({ submit: errorMessage });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Edit Category' : 'Create Category'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <Input
          label="Name"
          value={formData.name}
          onChange={handleNameChange}
          error={errors.name}
          required
          placeholder="Category name"
        />

        {/* Slug */}
        <Input
          label="Slug"
          value={formData.slug}
          onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
          error={errors.slug}
          required
          placeholder="category-slug"
        />

        {/* Type */}
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

        {/* Description */}
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Category description"
          rows={3}
        />

        {/* Icon */}
        <Input
          label="Icon (Emoji)"
          value={formData.icon}
          onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
          placeholder="🎯"
        />

        {/* Image Upload with Crop */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Image
          </label>
          <ImageUploadWithCrop
            variant="category"
            onImageUpload={handleImageUpload}
            onRemove={handleRemoveImage}
            existingImageUrl={formData.image}
            disabled={isLoading || isUploading}
          />
          {errors.image && <p className="mt-1 text-sm text-destructive">{errors.image}</p>}
        </div>

        {errors.submit && (
          <div className="p-3 bg-destructive/20 text-destructive rounded-lg text-sm">
            {errors.submit}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading || uploadingImage}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading || isUploading}
            disabled={isUploading}
          >
            {category ? 'Update Category' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

