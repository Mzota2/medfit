/**
 * Cloudinary utility functions for image upload and transformation
 */

import { cloudinaryConfig, isCloudinaryConfigured } from './config';

/**
 * Upload image to Cloudinary
 * Note: This should typically be done server-side via API route
 */
export const uploadImage = async (
  file: File | Blob,
  folder?: string
): Promise<{ url: string; publicId: string }> => {
  // This function is called from client-side, so check for client-side config
  if (!isCloudinaryConfigured(true)) {
    throw new Error(
      'Cloudinary is not properly configured. Please ensure the following environment variables are set:\n' +
      '- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME\n' +
      '- NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET\n\n' +
      'Note: These variables must be prefixed with NEXT_PUBLIC_ to be accessible in the browser.'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  
  const uploadPreset = cloudinaryConfig.uploadPreset;
  if (!uploadPreset) {
    throw new Error('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is not configured');
  }
  
  // Debug logging (remove in production if needed)
  console.log('Upload preset being used:', uploadPreset);
  console.log('Cloud name:', cloudinaryConfig.cloudName);
  
  formData.append('upload_preset', uploadPreset);

  // All uploads go into the 'eshopcure' folder, with subfolders for organization
  const baseFolder = 'eshopcure';
  const fullFolderPath = folder ? `${baseFolder}/${folder}` : baseFolder;
  formData.append('folder', fullFolderPath);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      // Try to get the actual error message from Cloudinary
      let errorMessage = 'Failed to upload image';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
        console.error('Cloudinary upload error details:', {
          error: errorData,
          status: response.status,
          statusText: response.statusText,
          presetUsed: uploadPreset,
          cloudName: cloudinaryConfig.cloudName,
        });
        
        // Provide helpful error message for common issues
        if (errorMessage.toLowerCase().includes('preset') || errorMessage.toLowerCase().includes('not found')) {
          errorMessage = `Upload preset "${uploadPreset}" not found. `
        }
      } catch (parseError) {
        // If we can't parse the error, use the status text
        errorMessage = `Upload failed with status ${response.status}: ${response.statusText}`;
        console.error('Failed to parse error response:', parseError);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while uploading the image');
  }
};

/**
 * Re-export optimization functions for backward compatibility
 * New code should import from './optimization' directly for better type safety
 */
export {
  getOptimizedImageUrl,
  getThumbnailUrl,
  getListingImageUrl,
  getCardImageUrl,
  getDetailImageUrl,
  getFullscreenImageUrl,
  getBannerImageUrl,
  getHeroImageUrl,
  getCustomImageUrl,
  IMAGE_SIZES,
  type ImageContext,
} from './optimization';

