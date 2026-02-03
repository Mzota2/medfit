/**
 * Admin/Staff Profile Page
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Loading, useToast } from '@/components/ui';
import {getUserFriendlyMessage, SUCCESS_MESSAGES } from '@/lib/utils/user-messages';
import { uploadImage } from '@/lib/cloudinary/utils';
import { isCloudinaryConfigured } from '@/lib/cloudinary/config';
import {Save } from 'lucide-react';
import { ImageUploadWithCrop } from '@/components/admin/ImageUploadWithCrop';
import { getUserByUid, updateUserByUid } from '@/lib/users';
import { User } from '@/types/user';
import { IMAGE_VARIANTS } from '@/lib/images/variants';

export default function AdminProfilePage() {
  const toast = useToast();
  const { user: firebaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userData, setUserData] = useState<User | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    phone: '',
    position: '',
    image: '',
  });

  useEffect(() => {
    const loadUserData = async () => {
      if (!firebaseUser?.uid) {
        setLoading(false);
        return;
      }

      try {
        const user = await getUserByUid(firebaseUser.uid);
        if (user) {
          setUserData(user);
          setFormData({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            displayName: user.displayName || '',
            phone: user.phone || '',
            position: user.position || '',
            image: user.image || user.photoURL || '',
          });
          if (user.image || user.photoURL) {
            setImagePreview(user.image || user.photoURL || '');
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setErrors({ general: 'Failed to load profile data' });
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [firebaseUser]);

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
    setSubmitting(true);

    try {
      if (!firebaseUser?.uid) {
        throw new Error('User not authenticated');
      }

      let imageUrl = formData.image;

      // Upload image if a new file was selected
      if (imageFile) {
        if (!isCloudinaryConfigured()) {
          setErrors({ image: 'Cloudinary is not properly configured' });
          setSubmitting(false);
          return;
        }

        setUploadingImage(true);
        try {
          const result = await uploadImage(imageFile, 'users');
          imageUrl = result.url;
        } catch (error) {
          console.error('Error uploading image:', error);
          setErrors({ image: 'Failed to upload image. Please try again.' });
          setSubmitting(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      // Build update object, only including fields with values (Firestore doesn't accept undefined)
      const updates: Partial<User> = {};
      
      if (formData.firstName.trim()) updates.firstName = formData.firstName.trim();
      if (formData.lastName.trim()) updates.lastName = formData.lastName.trim();
      if (formData.displayName.trim()) updates.displayName = formData.displayName.trim();
      if (formData.phone.trim()) updates.phone = formData.phone.trim();
      if (formData.position.trim()) updates.position = formData.position.trim();
      if (imageUrl) {
        updates.image = imageUrl;
        updates.photoURL = imageUrl; // Also update photoURL for backwards compatibility
      }
      
      // Update user profile
      await updateUserByUid(firebaseUser.uid, updates);

      // Reload user data
      const updatedUser = await getUserByUid(firebaseUser.uid);
      if (updatedUser) {
        setUserData(updatedUser);
        setFormData(prev => ({ ...prev, image: imageUrl }));
        setImageFile(null);
      }

      // Show success message (you could add a toast notification here)
      toast.showSuccess(SUCCESS_MESSAGES.PROFILE_UPDATED);
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setErrors({
        general: getUserFriendlyMessage(errorMessage, 'Failed to update profile. Please try again.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  if (!firebaseUser || !userData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-text-secondary">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1 sm:mt-2">
          Manage your profile information and team display settings.
        </p>
      </div>

      {errors.general && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-xs sm:text-sm text-destructive">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Profile Image */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Profile Image</h2>
          <div className="flex flex-col items-start gap-4">
             <ImageUploadWithCrop
                  variant="adminProfile"
                  onImageUpload={handleImageUpload}
                  onRemove={handleRemoveImage}
                  onError={handleImageError}
                  existingImageUrl={imagePreview}
                  disabled={uploadingImage}
                  className="w-full h-full"
              />
            <div className="flex-1 w-full">
              <p className="text-xs text-text-secondary">
                This image will be displayed on the About page. Recommended size: {IMAGE_VARIANTS.adminProfile.minWidth}x{IMAGE_VARIANTS.adminProfile.minHeight}px.
              </p>
              {imageError && (
                <p className="text-xs text-destructive mt-1">{imageError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="John"
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Doe"
            />
            <div>
              <Input
                label="Display Name"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="John Doe"
              />
              <p className="text-xs text-text-secondary mt-1">Name displayed in the admin interface</p>
            </div>
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+265 999 999 999"
            />
            <div className="md:col-span-2">
              <Input
                label="Position / Job Title"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="e.g., CEO, Manager, Developer, Customer Support"
              />
              <p className="text-xs text-text-secondary mt-1">Your position will be displayed on the About page</p>
            </div>
          </div>
        </div>

        {/* Account Information (Read-only) */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">Email</label>
              <input
                type="email"
                value={userData.email}
                disabled
                className="w-full px-3 sm:px-4 py-2 text-sm border border-border rounded-lg bg-background-secondary text-text-secondary cursor-not-allowed"
              />
              <p className="text-xs text-text-secondary mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">Role</label>
              <input
                type="text"
                value={userData.role === 'admin' ? 'Administrator' : 'Staff Member'}
                disabled
                className="w-full px-3 sm:px-4 py-2 text-sm border border-border rounded-lg bg-background-secondary text-text-secondary cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
          <Button
            type="submit"
            disabled={submitting || uploadingImage}
            isLoading={submitting}
            className="w-full sm:w-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

