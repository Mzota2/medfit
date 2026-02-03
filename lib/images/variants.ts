export type ImageVariantKey =
  | 'category'
  | 'productGallery'
  | 'serviceGallery'
  | 'businessLogo'
  | 'businessBanner'
  | 'promotionBanner'
  | 'adminProfile';

type ImageVariantDefinition = {
  label: string;
  minWidth: number;
  minHeight: number;
  aspectRatio: 'square' | 'portrait' | 'landscape';
};

export const IMAGE_VARIANTS: Record<ImageVariantKey, ImageVariantDefinition> = {
  category: {
    label: 'Category image',
    minWidth: 250,
    minHeight: 250,
    aspectRatio: 'square',
  },
  productGallery: {
    label: 'Product image',
    minWidth: 400,
    minHeight: 400,
    aspectRatio: 'square',
  },
  serviceGallery: {
    label: 'Service image',
    minWidth: 400,
    minHeight: 400,
    aspectRatio: 'square',
  },
  businessLogo: {
    label: 'Logo image',
    minWidth: 250,
    minHeight: 250,
    aspectRatio: 'square',
  },
  businessBanner: {
    label: 'Banner image',
    minWidth: 1920,
    // Increase recommended minHeight so banners have better visible height on mobile
    minHeight: 600,
    aspectRatio: 'landscape',
  },
  promotionBanner: {
    label: 'Promotion image',
    minWidth: 1600,
    // Use a taller recommended height for promotions to avoid extremely short banners on phones
    minHeight: 900,
    aspectRatio: 'landscape',
  },
  adminProfile: {
    label: 'Profile image',
    minWidth: 250,
    minHeight: 250,
    aspectRatio: 'square',
  },
};

type ValidationResult = {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
};

export async function validateImageFileForVariant(
  file: File,
  variant: ImageVariantKey
): Promise<ValidationResult> {
  const definition = IMAGE_VARIANTS[variant];
  if (!definition) {
    return { valid: true };
  }

  const url = URL.createObjectURL(file);

  try {
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        resolve({ width, height });
      };
      image.onerror = () => {
        reject(new Error('Failed to read image dimensions'));
      };
      image.src = url;
    });

    const width = size.width;
    const height = size.height;
    const messages: string[] = [];

    if (width < definition.minWidth || height < definition.minHeight) {
      messages.push(
        `Image is too small. Minimum recommended size is ${definition.minWidth}x${definition.minHeight}px.`
      );
    }

    const ratio = width / height;
    let matchesAspect = true;

    if (definition.aspectRatio === 'square') {
      matchesAspect = ratio > 0.9 && ratio < 1.1;
    } else if (definition.aspectRatio === 'landscape') {
      matchesAspect = ratio >= 1.3;
    } else if (definition.aspectRatio === 'portrait') {
      matchesAspect = ratio <= 0.77;
    }

    if (!matchesAspect) {
      let aspectText = '';
      if (definition.aspectRatio === 'square') {
        aspectText = '1:1 (square)';
      } else if (definition.aspectRatio === 'landscape') {
        aspectText = 'wide (landscape)';
      } else {
        aspectText = 'tall (portrait)';
      }
      messages.push(`Image has an unexpected aspect ratio. Recommended aspect ratio is ${aspectText}.`);
    }

    if (messages.length > 0) {
      return {
        valid: false,
        error: `${definition.label}: ${messages.join(' ')}`,
        width,
        height,
      };
    }

    return { valid: true, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
