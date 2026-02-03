'use client';

import React, { useState, useCallback, useRef } from 'react';
import Cropper, { type Point, type Area } from 'react-easy-crop';
import { Button } from '@/components/ui/Button';
import { Check, Loader2, RotateCcw, RotateCw, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { IMAGE_VARIANTS, type ImageVariantKey } from '@/lib/images/variants';

interface ImageUploadWithCropProps {
  variant: ImageVariantKey;
  onImageUpload?: (file: File) => Promise<void>;
  onRemove?: () => void;
  onError?: (message: string) => void;
  existingImageUrl?: string;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function ImageUploadWithCrop({
  variant,
  onImageUpload,
  onRemove,
  onError,
  existingImageUrl,
  className,
  disabled = false,
  children,
}: ImageUploadWithCropProps) {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const variantConfig = IMAGE_VARIANTS[variant];
  const aspect = variantConfig.minWidth / variantConfig.minHeight;

  const setErrorState = (message: string | null) => {
    setError(message);
    if (onError) {
      onError(message || '');
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setErrorState('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorState('Image size must be less than 5MB');
      return;
    }

    // Reset state for a new selection
    setErrorState(null);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    setRotation(0);

    const reader = new FileReader();
    reader.addEventListener('load', async () => {
      const src = reader.result?.toString() || '';
      if (!src) {
        setErrorState('Failed to read image. Please try another file.');
        return;
      }

      try {
        // Inspect original image dimensions
        const image = await createImage(src);
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;

        const { minWidth, minHeight, label, aspectRatio } = variantConfig;

        // If the original image is smaller than the recommended size, reject it
        if (width < minWidth || height < minHeight) {
          setErrorState(
            `${label}: Image is too small. Minimum recommended size is ${minWidth}x${minHeight}px.`
          );
          return;
        }

        // Check whether the original image already matches the desired aspect ratio
        const ratio = width / height;
        let matchesAspect = true;
        if (aspectRatio === 'square') {
          matchesAspect = ratio > 0.9 && ratio < 1.1;
        } else if (aspectRatio === 'landscape') {
          matchesAspect = ratio >= 1.3;
        } else if (aspectRatio === 'portrait') {
          matchesAspect = ratio <= 0.77;
        }

        // If size and aspect are already suitable, upload the original image directly
        if (matchesAspect) {
          if (!onImageUpload) {
            setErrorState('No upload handler provided');
            return;
          }

          try {
            setIsLoading(true);
            await onImageUpload(file);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          } catch (err) {
            console.error('Error uploading image:', err);
            setErrorState('Failed to upload image. Please try again.');
          } finally {
            setIsLoading(false);
          }

          return;
        }

        // Otherwise, open the cropper with the loaded image
        setImgSrc(src);
      } catch (error) {
        console.error('Error reading image dimensions:', error);
        setErrorState('Failed to read image. Please try another file.');
      }
    });

    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const handleRemoveImage = () => {
    setImgSrc('');
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    setErrorState(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  const handleUpload = async () => {
    if (!imgSrc || !croppedAreaPixels) return;

    const { minWidth, minHeight, label } = variantConfig;

    // Ensure the selected crop area is at least the recommended size
    if (croppedAreaPixels.width < minWidth || croppedAreaPixels.height < minHeight) {
      setErrorState(
        `${label}: Selected area is too small. Please make the crop at least ${minWidth}x${minHeight}px.`
      );
      return;
    }

    try {
      setIsLoading(true);
      
      // Create image element from the source
      const image = await createImage(imgSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not create canvas context');
      }

      // Target canvas size is the recommended size for this variant.
      // We only downscale larger crops; smaller crops are rejected above.
      const targetWidth = minWidth;
      const targetHeight = minHeight;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw the cropped image scaled into the target canvas
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        targetWidth,
        targetHeight
      );

      // Apply rotation if needed
      if (rotation !== 0) {
        const rotatedCanvas = document.createElement('canvas');
        const rotatedCtx = rotatedCanvas.getContext('2d');
        
        if (!rotatedCtx) {
          throw new Error('Could not create rotated canvas context');
        }

        // Set canvas size to fit the rotated image
        const angle = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(angle));
        const cos = Math.abs(Math.cos(angle));
        const newWidth = Math.floor(
          Math.abs(canvas.width * cos) + Math.abs(canvas.height * sin)
        );
        const newHeight = Math.floor(
          Math.abs(canvas.width * sin) + Math.abs(canvas.height * cos)
        );

        rotatedCanvas.width = newWidth;
        rotatedCanvas.height = newHeight;

        // Rotate the context and draw the image
        rotatedCtx.translate(newWidth / 2, newHeight / 2);
        rotatedCtx.rotate(angle);
        rotatedCtx.drawImage(
          canvas,
          -canvas.width / 2,
          -canvas.height / 2
        );

        // Replace the canvas with the rotated version
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(rotatedCanvas, 0, 0);
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          0.9 // Quality
        );
      });

      if (!blob) {
        throw new Error('Failed to process image');
      }

      // Create a file from the blob
      const croppedFile = new File(
        [blob],
        `cropped-${Date.now()}.jpg`,
        { type: 'image/jpeg' },
      );

      // Upload the file if handler is provided
      if (!onImageUpload) {
        throw new Error('No upload handler provided');
      }
      await onImageUpload(croppedFile);
      
      // Reset after successful upload
      setImgSrc('');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setErrorState('Failed to process image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If we have an existing image URL, just show it
  if (existingImageUrl && !imgSrc) {
    return (
      <div className={cn('relative', className)}>
        <div
          className="relative w-full overflow-hidden rounded-lg bg-gray-100"
          style={{ aspectRatio: `${variantConfig.minWidth} / ${variantConfig.minHeight}` }}
        >
          <img
            src={existingImageUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          {!disabled && onRemove && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive-hover transition-colors"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {!disabled && (
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full"
            >
              Change Image
            </Button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={onSelectFile}
          className="hidden"
          disabled={disabled}
        />
      </div>
    );
  }

  // If we have an image source, show the crop UI in a modal overlay
  if (imgSrc) {
    return (
      <div className={className}>
        {/* Hidden file input for re-selection while cropping */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={onSelectFile}
          accept="image/*"
          className="hidden"
          disabled={disabled}
        />

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-3xl mx-4 max-h-[100vh] overflow-y-auto py-6">
            <div className="space-y-6 bg-background p-4 rounded-xl border border-border/50">
              <div
                className="relative w-full bg-background-secondary/30 rounded-lg overflow-hidden"
                style={{
                  height:
                    variant === 'adminProfile'
                      ? 'min(80vw, 400px)'
                      : variant === 'businessBanner'
                      ? 'min(60vh, 320px) sm:min(70vh, 400px) md:min(90vh, 600px)'
                      : 'min(90vh, 600px)',
                  maxHeight: variant === 'adminProfile' ? '400px' : variant === 'businessBanner' ? 'none' : 'none',
                }}
              >
                <Cropper
                  image={imgSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  rotation={rotation}
                  cropShape={variant === 'adminProfile' ? 'round' : 'rect'}
                  showGrid={true}
                  classes={{
                    containerClassName: 'rounded-lg',
                    mediaClassName: 'object-contain',
                    cropAreaClassName:
                      variant === 'adminProfile'
                        ? 'border-2 border-white/80 shadow-lg rounded-full'
                        : 'border-2 border-white/80 shadow-lg',
                  }}
                  restrictPosition={false}
                  minZoom={0.5}
                  maxZoom={5}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <ZoomIn className="w-4 h-4 text-text-secondary" />
                      <span className="text-text-secondary">Zoom</span>
                    </div>
                    <span className="text-sm font-mono text-text-muted">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ZoomOut className="w-4 h-4 text-text-muted" />
                    <input
                      type="range"
                      value={zoom}
                      min={0.5}
                      max={5}
                      step={0.1}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full h-1.5 bg-background-secondary rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                    />
                    <ZoomIn className="w-4 h-4 text-text-muted" />
                  </div>
                </div>

                {error && (
                  <p className="text-xs sm:text-sm text-destructive">
                    {error}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((prev) => (prev - 90) % 360)}
                    className="gap-1 sm:gap-2 h-10 text-xs sm:text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Rotate Left
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="gap-1 sm:gap-2 h-10 text-xs sm:text-sm"
                  >
                    <RotateCw className="w-4 h-4" />
                    Rotate Right
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveImage}
                    disabled={isLoading}
                    className="flex-1 h-10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUpload}
                    disabled={isLoading}
                    className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span className="whitespace-nowrap">Apply Changes</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default upload state
  return (
    <div className={className}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer',
          'hover:border-primary/50 hover:bg-primary/5 transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-destructive/50',
        )}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          {children ? (
            children
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {`${variantConfig.minWidth}×${variantConfig.minHeight}px ${variantConfig.aspectRatio} (max 5MB)`}
                </p>
              </div>
            </>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={onSelectFile}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  );
}
