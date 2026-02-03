/**
 * Cloudinary configuration
 */

import { Cloudinary } from '@cloudinary/url-gen';

const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
};

/**
 * Cloudinary instance for URL generation
 */
export const cloudinary = new Cloudinary({
  cloud: {
    cloudName: cloudinaryConfig.cloudName || '',
  },
});

/**
 * Validate Cloudinary configuration
 * For client-side uploads (unsigned), we only need cloudName and uploadPreset
 * For server-side uploads (signed), we need cloudName, apiKey, and apiSecret
 */
export const isCloudinaryConfigured = (forClientSide: boolean = true): boolean => {
  if (forClientSide) {
    // Client-side uploads only need cloud name and upload preset
    return !!(
      cloudinaryConfig.cloudName &&
      cloudinaryConfig.uploadPreset
    );
  } else {
    // Server-side uploads need all credentials
    return !!(
      cloudinaryConfig.cloudName &&
      cloudinaryConfig.apiKey &&
      cloudinaryConfig.apiSecret
    );
  }
};

export { cloudinaryConfig };

