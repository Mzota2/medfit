/**
 * Share button component with Web Share API and fallback
 */

'use client';

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from './Button';

export interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  url,
  title,
  description,
  className,
  variant = 'ghost',
  size = 'sm',
  color = 'text-black',
}) => {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsSharing(true);

    const shareData: ShareData = {
      title,
      text: description || title,
      url: url,
    };

    try {
      // Try Web Share API first (mobile-friendly)
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(url);
        
        // Show a brief feedback (you could use a toast here)
        if (window) {
          const originalText = document.title;
          document.title = 'Link copied!';
          setTimeout(() => {
            document.title = originalText;
          }, 2000);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to share. Please try again.';
      // User cancelled or error occurred
      const errorName = error instanceof Error ? error.name : 'Unknown error';
      if (errorName !== 'AbortError') {
        console.error('Error sharing:', errorMessage);
        
        // Fallback: Copy to clipboard
        try {
          await navigator.clipboard.writeText(url);
        } catch (clipboardError) {
          console.error('Error copying to clipboard:', clipboardError);
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={className}
      disabled={isSharing}
      aria-label={`Share ${title}`}
    >
      <Share2 className={`w-4 h-4 !text-black dark:!text-warning`} />
      {size !== 'sm' && <span className="ml-2">Share</span>}
    </Button>
  );
};

