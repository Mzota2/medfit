/**
 * Reviews section component for displaying reviews and ratings
 */

'use client';

import React, { useMemo, useState } from 'react';
import { Star, User, MessageSquare } from 'lucide-react';
import { useReviews } from '@/hooks/useReviews';
import { Review } from '@/types/reviews';
import { formatDate } from '@/lib/utils/formatting';
import { Button } from '@/components/ui';
import { ReviewFormModal } from './ReviewFormModal';
import { useSettings } from '@/hooks/useSettings';

interface ReviewFormButtonProps {
  itemId?: string;
  businessId?: string;
  reviewType: 'item' | 'business';
  variant?: 'primary' | 'outline';
}

const ReviewFormButton: React.FC<ReviewFormButtonProps> = ({
  itemId,
  businessId,
  reviewType,
  variant = 'outline',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2"
      >
        <MessageSquare className="w-4 h-4" />
        Write a Review
      </Button>
      <ReviewFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemId={itemId}
        businessId={businessId}
        reviewType={reviewType}
      />
    </>
  );
};

interface ReviewsSectionProps {
  itemId?: string; // Optional - not needed for business reviews
  businessId?: string;
  reviewType?: 'item' | 'business'; // Default to 'item' for backward compatibility
  showWriteReview?: boolean; // Whether to show write review button
  title?: string; // Custom title - if not provided, will use defaults based on reviewType
  itemName?: string; // Name of the product/service (for item reviews)
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ 
  itemId, 
  businessId, 
  reviewType = 'item',
  showWriteReview = true,
  title,
  itemName
}) => {
  const { data: settings } = useSettings();
  const reviewsEnabled = settings?.documentCreation?.enableReviews ?? false;

  // Call all hooks before any conditional returns (Rules of Hooks)
  const { data: reviews = [], isLoading } = useReviews({
    itemId,
    businessId,
    reviewType,
    limit: 50,
    enabled: reviewsEnabled, // Conditionally enable the query instead of conditionally calling the hook
  });

  // Calculate average rating and rating distribution (must be before conditional return)
  const ratingStats = useMemo(() => {
    if (reviews.length === 0) {
      return {
        average: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / reviews.length;
    const distribution = reviews.reduce(
      (acc, review) => {
        acc[review.rating as keyof typeof acc] = (acc[review.rating as keyof typeof acc] || 0) + 1;
        return acc;
      },
      { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    );

    return {
      average: Math.round(average * 10) / 10,
      total: reviews.length,
      distribution,
    };
  }, [reviews]);

  // If reviews are disabled, don't render anything (after all hooks)
  if (!reviewsEnabled) {
    return null;
  }

  // Set default titles based on review type
  const defaultTitle = title || (reviewType === 'business' 
    ? 'Business Reviews' 
    : 'Customer Reviews');
  
  const description = reviewType === 'business'
    ? 'Reviews and ratings about our business overall, including customer service, experience, and quality.'
    : itemName
      ? `Reviews and ratings specifically for "${itemName}" from customers who have purchased or used this product/service.`
      : 'Reviews and ratings for this product/service from customers who have purchased or used it.';

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'text-warning fill-warning'
                : 'text-border'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-2 text-foreground">{defaultTitle}</h2>
        <p className="text-sm text-text-secondary mb-6">{description}</p>
        <p className="text-text-secondary">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="bg-card dark:bg-background-tertiary rounded-lg shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{defaultTitle}</h2>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
        {showWriteReview && (
          <div className="shrink-0">
            <ReviewFormButton 
              itemId={itemId} 
              businessId={businessId} 
              reviewType={reviewType}
            />
          </div>
        )}
      </div>

      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pb-8 border-b border-border">
        {/* Average Rating */}
        <div className="text-center md:text-left">
          <div className="text-5xl font-bold text-foreground mb-2">
            {ratingStats.average > 0 ? ratingStats.average.toFixed(1) : '0.0'}
          </div>
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            {renderStars(Math.round(ratingStats.average), 'lg')}
          </div>
          <p className="text-sm text-text-secondary">
            Based on {ratingStats.total} {ratingStats.total === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="md:col-span-2 space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingStats.distribution[rating as keyof typeof ratingStats.distribution];
            const percentage = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0;

            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-20">
                  <span className="text-sm font-medium text-foreground">{rating}</span>
                  <Star className="w-4 h-4 text-warning fill-warning" />
                </div>
                <div className="grow h-2 bg-background-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-text-secondary w-12 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <Star className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <p className="text-lg text-foreground mb-2">No reviews yet</p>
          <p className="text-text-secondary mb-4">
            {reviewType === 'business' 
              ? 'Be the first to share your experience with our business!' 
              : itemName
                ? `Be the first to review "${itemName}"!`
                : 'Be the first to review this product/service!'}
          </p>
          {showWriteReview && (
            <ReviewFormButton 
              itemId={itemId} 
              businessId={businessId} 
              reviewType={reviewType}
              variant="primary"
            />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
};

interface ReviewItemProps {
  review: Review;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review }) => {
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-warning fill-warning'
                : 'text-border'
            }`}
          />
        ))}
      </div>
    );
  };

  const displayName = review.userName || review.userEmail?.split('@')[0] || 'Anonymous';

  return (
    <div className="border-b border-border last:border-0 pb-6 last:pb-0">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{displayName}</p>
            <div className="flex items-center gap-2 mt-1">
              {renderStars(review.rating)}
              <span className="text-sm text-text-secondary">
                {review.createdAt && (() => {
                  try {
                    // createdAt should already be a Date from getReviews, but handle edge cases
                    const date = review.createdAt instanceof Date 
                      ? review.createdAt 
                      : (review.createdAt as { toDate?: () => Date })?.toDate 
                        ? (review.createdAt as { toDate: () => Date }).toDate() 
                        : new Date(String(review.createdAt));
                    // Validate the date before formatting
                    if (isNaN(date.getTime())) {
                      console.error('Invalid date:', review.createdAt);
                      return '';
                    }
                    return formatDate(date);
                  } catch (error) {
                    console.error('Error formatting date:', error, review.createdAt);
                    return '';
                  }
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-foreground leading-relaxed">{review.comment}</p>
    </div>
  );
};

