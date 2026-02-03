/**
 * Review Form Modal Component
 * Non-intrusive modal for submitting reviews
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Button, Input, Textarea, useToast } from '@/components/ui';
import { Star, AlertCircle } from 'lucide-react';
import { useCreateReview } from '@/hooks/useReviews';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Review, ReviewType } from '@/types/reviews';
import { getReviews, hasUserReviewed } from '@/lib/reviews';
import { getUserFriendlyMessage } from '@/lib/utils/user-messages';

interface ReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  businessId?: string;
  reviewType: ReviewType;
  orderId?: string;
  bookingId?: string;
  onSuccess?: () => void;
}

export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({
  isOpen,
  onClose,
  itemId,
  businessId,
  reviewType,
  orderId,
  bookingId,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { currentBusiness } = useApp();
  const createReview = useCreateReview();
  const toast = useToast();

  const finalBusinessId = useMemo(() => businessId || currentBusiness?.id || '', [businessId, currentBusiness]);

  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [userName, setUserName] = useState(user?.displayName || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [errors, setErrors] = useState<{ comment?: string; userName?: string; userEmail?: string }>({});
  const [isCheckingReview, setIsCheckingReview] = useState(true);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkExistingReview = useCallback(async (): Promise<void> => {
    if (!finalBusinessId) {
      setIsCheckingReview(false);
      return;
    }

    // Only check for authenticated users or when we have email
    if (!user && !userEmail) {
      setHasExistingReview(false);
      setIsCheckingReview(false);
      return;
    }

    setIsCheckingReview(true);
    try {
      // Normalize email to lowercase for consistent duplicate checking
      const emailToCheck = (user?.email || userEmail)?.toLowerCase().trim();

      if (!emailToCheck && !user?.uid) {
        setHasExistingReview(false);
        return;
      }

      // Check if user has already reviewed
      const alreadyReviewed = await hasUserReviewed({
        userId: user?.uid,
        userEmail: emailToCheck,
        itemId,
        businessId: finalBusinessId,
        reviewType,
      });

      // If user has reviewed, try to fetch the existing review
      if (alreadyReviewed) {
        try {
          if (!user?.uid) {
            return;
          }

          const reviews = await getReviews({
            userId: user.uid,
            ...(itemId && { itemId }),
            ...(finalBusinessId && { businessId: finalBusinessId }),
            reviewType,
            limit: 1,
          });
          if (reviews.length > 0) {
            setExistingReview(reviews[0]);
          }
        } catch (error) {
          console.error('Error fetching existing review:', error);
        }
      }

      setHasExistingReview(!!alreadyReviewed);
    } catch (error) {
      console.error('Error checking existing review:', error);
      setHasExistingReview(false);
    } finally {
      setIsCheckingReview(false);
    }
  }, [user, userEmail, itemId, finalBusinessId, reviewType]);

  useEffect(() => {
    checkExistingReview();
  }, [checkExistingReview]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      // Prevent submission if user has already reviewed
      if (hasExistingReview) {
        toast.showWarning('Review Already Submitted', 'You have already submitted a review for this item. Each customer can only submit one review.');
        return;
      }

      // Validation
      const newErrors: { comment?: string; userName?: string; userEmail?: string } = {};
      if (!comment.trim()) {
        newErrors.comment = 'Please write a review comment';
      }
      if (!user && !userName.trim()) {
        newErrors.userName = 'Name is required for guest reviews';
      }
      if (!user && !userEmail.trim()) {
        newErrors.userEmail = 'Email is required for guest reviews';
      } else if (!user && userEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
        newErrors.userEmail = 'Please enter a valid email address';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Create review data without the id, createdAt, and updatedAt fields
      const reviewData = {
        reviewType,
        rating,
        comment: comment.trim(),
        businessId: finalBusinessId,
        ...(itemId && { itemId }),
        ...(user?.uid && { userId: user.uid }),
        // Normalize email to lowercase for consistent duplicate checking
        ...(!user && {
          userName: userName.trim(),
          userEmail: userEmail.trim().toLowerCase(),
        }),
        ...(orderId && { orderId }),
        ...(bookingId && { bookingId }),
        // These will be added by the server
        // createdAt: new Date(),
        // updatedAt: new Date(),
      };

      await createReview.mutateAsync({ reviewData, businessId: finalBusinessId });

      // Reset form
      setRating(5);
      setComment('');
      if (!user) {
        setUserName('');
        setUserEmail('');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      const errorMessage = getUserFriendlyMessage(
        error instanceof Error ? error.message : 'Failed to submit review. Please try again.',
        'Failed to submit review. Please try again.'
      );
      console.error('Error submitting review:', errorMessage, error);
      toast.showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (displayRating: number, interactive = true): React.ReactNode => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoveredRating(star)}
            onMouseLeave={() => interactive && setHoveredRating(0)}
            className={`transition-colors ${
              interactive ? 'cursor-pointer hover:scale-110' : ''
            }`}
            disabled={!interactive}
          >
            <Star
              className={`w-8 h-8 ${
                star <= (hoveredRating || rating)
                  ? 'text-warning fill-warning'
                  : 'text-border'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;
  
  // Helper function to safely convert Firestore Timestamp to Date
  const getReviewDate = (date: Date | { toDate: () => Date } | undefined): Date => {
    if (!date) return new Date();
    if (typeof date === 'object' && 'toDate' in date) {
      return date.toDate();
    }
    return date as Date;
  };

  if (isCheckingReview) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Loading...">
        <div className="p-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
          </div>
        </div>
      </Modal>
    );
  }

  if (hasExistingReview && existingReview) {
    const reviewDate = getReviewDate(existingReview.createdAt);

    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Your Review">
        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-center mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < (existingReview.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-2 text-sm text-gray-500">
                {reviewDate.toLocaleDateString()}
              </span>
            </div>
            <p className="text-gray-700">{existingReview.comment}</p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    );
  } else if (hasExistingReview) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Review Already Submitted">
        <div className="p-4">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-yellow-500" />
          </div>
          <p className="text-center mb-4">
            You have already submitted a review for this {reviewType}. Thank you for your feedback!
          </p>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={reviewType === 'business' ? 'Write a Business Review' : 'Write a Review'}
      size="lg"
      aria-label={reviewType === 'business' ? 'Business Review Form' : 'Product Review Form'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Your Rating *
          </label>
          {renderStars(rating)}
          <p className="text-sm text-text-secondary mt-2">
            Click stars to rate ({rating} out of 5)
          </p>
        </div>

        {/* Comment */}
        <div>
          <Textarea
            label="Your Review *"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (errors.comment) setErrors((prev) => ({ ...prev, comment: undefined }));
            }}
            error={errors.comment}
            placeholder={
              reviewType === 'business'
                ? 'Share your experience with our business...'
                : 'Tell others about your experience with this product/service...'
            }
            rows={5}
            required
          />
        </div>

        {/* Guest User Info */}
        {!user && (
          <>
            <div>
              <Input
                label="Your Name *"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  if (errors.userName) setErrors((prev) => ({ ...prev, userName: undefined }));
                }}
                error={errors.userName}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <Input
                label="Your Email *"
                type="email"
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value);
                  if (errors.userEmail) setErrors((prev) => ({ ...prev, userEmail: undefined }));
                }}
                error={errors.userEmail}
                placeholder="john@example.com"
                required
              />
            </div>
          </>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 justify-end pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            isLoading={isSubmitting || createReview.isPending}
            disabled={hasExistingReview || isCheckingReview}
          >
            {hasExistingReview ? 'Already Reviewed' : 'Submit Review'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

