/**
 * Reviews CRUD operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import type { business } from '@/types/business';
import { Review } from '@/types/reviews';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';
import { isReviewsEnabled } from './utils';

/**
 * Get review by ID
 */
export const getReviewById = async (reviewId: string): Promise<Review> => {
  const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
  const reviewSnap = await getDoc(reviewRef);

  if (!reviewSnap.exists()) {
    throw new NotFoundError('Review');
  }

  const data = reviewSnap.data();
  // Helper function to convert Timestamp to Date
  const convertTimestamp = (ts: unknown): Date | undefined => {
    if (!ts) return undefined;
    if (ts instanceof Date) return ts;
    if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
      return (ts as { toDate: () => Date }).toDate();
    }
    // Try to create Date from timestamp
    try {
      return new Date(String(ts));
    } catch {
      return undefined;
    }
  };
  
  return {
    id: reviewSnap.id,
    ...data,
    // Convert Firestore Timestamps to JavaScript Dates
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  } as Review;
};

/**
 * Get reviews with filters
 */
export const getReviews = async (options?: {
  itemId?: string;
  userId?: string;
  businessId?: string;
  reviewType?: 'item' | 'business';
  limit?: number;
}): Promise<Review[]> => {
  try {
    console.log('Fetching reviews with options:', options);
    const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
    let q = query(reviewsRef);

    if (options?.reviewType) {
      q = query(q, where('reviewType', '==', options.reviewType));
    }

    if (options?.itemId) {
      q = query(q, where('itemId', '==', options.itemId));
    }

    if (options?.userId) {
      q = query(q, where('userId', '==', options.userId));
    }

    if (options?.businessId) {
      q = query(q, where('businessId', '==', options.businessId));
    }

    // Try with orderBy first (requires index), fall back to no ordering if it fails
    let querySnapshot;
    let useOrderBy = true;
    
    try {
      let qWithOrder = query(q, orderBy('createdAt', 'desc'));
      if (options?.limit) {
        qWithOrder = query(qWithOrder, limit(options.limit));
      }
      querySnapshot = await getDocs(qWithOrder);
    } catch (error: unknown) {
      // If error is about missing index, fall back to query without orderBy
      if (error && typeof error === 'object' && 'code' in error && error.code === 'failed-precondition') {
        console.warn('Firestore index missing for reviews query, falling back to in-memory sorting');
        useOrderBy = false;
        if (options?.limit) {
          q = query(q, limit(options.limit));
        }
        querySnapshot = await getDocs(q);
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('index')) {
        console.warn('Firestore index missing for reviews query, falling back to in-memory sorting');
        useOrderBy = false;
        if (options?.limit) {
          q = query(q, limit(options.limit));
        }
        querySnapshot = await getDocs(q);
      } else {
        throw error;
      }
    }

    // Convert Firestore Timestamps to JavaScript Dates
    const reviews = querySnapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      // Helper function to convert Timestamp to Date
      const convertTimestamp = (ts: unknown): Date | undefined => {
        if (!ts) return undefined;
        if (ts instanceof Date) return ts;
        if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
          return (ts as { toDate: () => Date }).toDate();
        }
        // Try to create Date from timestamp
        try {
          return new Date(String(ts));
        } catch {
          return undefined;
        }
      };
      
      return {
        id: docSnapshot.id,
        ...data,
        // Convert Firestore Timestamps to JavaScript Dates
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Review;
    });

    // If orderBy wasn't used, sort in memory
    if (!useOrderBy) {
      reviews.sort((a, b) => {
        const aTime = a.createdAt instanceof Date 
          ? a.createdAt.getTime() 
          : (a.createdAt as { toMillis?: () => number; seconds?: number })?.toMillis?.() || ((a.createdAt as { seconds?: number })?.seconds ?? 0) * 1000 || 0;
        const bTime = b.createdAt instanceof Date 
          ? b.createdAt.getTime() 
          : (b.createdAt as { toMillis?: () => number; seconds?: number })?.toMillis?.() || ((b.createdAt as { seconds?: number })?.seconds ?? 0) * 1000 || 0;
        return bTime - aTime; // Descending order
      });
    }

    console.log(`Fetched ${reviews.length} reviews`);
    return reviews;
  } catch (error) {
    console.error('Error fetching reviews:', error);
    throw error;
  }
};

/**
 * Check if user has already reviewed an item or business
 */
export const hasUserReviewed = async (options: {
  userId?: string;
  userEmail?: string;
  itemId?: string;
  businessId: string;
  reviewType: 'item' | 'business';
}): Promise<boolean> => {
  try {
    const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
    let q = query(reviewsRef);

    // Filter by review type
    q = query(q, where('reviewType', '==', options.reviewType));
    q = query(q, where('businessId', '==', options.businessId));

    // For item reviews, filter by itemId
    if (options.reviewType === 'item' && options.itemId) {
      q = query(q, where('itemId', '==', options.itemId));
    }

    // Filter by userId for authenticated users, or userEmail for guests
    if (options.userId) {
      q = query(q, where('userId', '==', options.userId));
    } else if (options.userEmail) {
      q = query(q, where('userEmail', '==', options.userEmail.toLowerCase().trim()));
    } else {
      // No user identifier provided
      return false;
    }

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking existing review:', error);
    // If there's an error, allow the review to proceed (fail open)
    return false;
  }
};

/**
 * Create review
 * Checks settings to ensure reviews feature is enabled
 */
export const createReview = async (
  review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>,
  businessId?: string
): Promise<string> => {
  // Check if reviews feature is enabled
  const enabled = await isReviewsEnabled();
  if (!enabled) {
    throw new ValidationError('Reviews feature is currently disabled');
  }

  if (!review.rating || !review.comment) {
    throw new ValidationError('Rating and comment are required');
  }

  if (!review.reviewType) {
    throw new ValidationError('Review type is required');
  }

  // Validate itemId for item reviews
  if (review.reviewType === 'item' && !review.itemId) {
    throw new ValidationError('itemId is required for item reviews');
  }

  // Automatically get businessId if not provided
  let finalBusinessId: string | undefined = businessId || review.businessId;
  if (!finalBusinessId) {
    const { getBusinessId } = await import('@/lib/businesses/utils');
    const fetchedBusinessId = await getBusinessId();
    finalBusinessId = fetchedBusinessId || undefined;
  }

  if (!finalBusinessId) {
    throw new ValidationError('Business ID is required');
  }

  // Check if reviews are enabled for this business
  if (finalBusinessId) {
    const businessRef = doc(db, COLLECTIONS.BUSINESS, finalBusinessId);
    const businessSnap = await getDoc(businessRef);
    
    if (!businessSnap.exists()) {
      throw new ValidationError('Business not found');
    }
    
    // Check if reviews are enabled for this business
    if (!isReviewsEnabled()) {
      throw new ValidationError('Reviews are not enabled for this business');
    }
    
    // Check if the user has already reviewed this item/business
    // This is a critical check to prevent duplicate reviews
    const hasReviewed = await hasUserReviewed({
      userId: review.userId,
      userEmail: review.userEmail?.toLowerCase().trim(),
      itemId: review.itemId,
      businessId: finalBusinessId,
      reviewType: review.reviewType,
    });
    
    if (hasReviewed) {
      throw new ValidationError('You have already reviewed this item/business. Only one review per customer is allowed.');
    }
  }

  // If userId is provided, fetch user profile to get name
  let userName = review.userName;
  let userEmail = review.userEmail;
  
  if (review.userId && !userName) {
    try {
      const { getUserByUid } = await import('@/lib/users');
      const userProfile = await getUserByUid(review.userId);
      if (userProfile) {
        // Construct userName from firstName and lastName, or use displayName as fallback
        if (userProfile.firstName || userProfile.lastName) {
          userName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ').trim();
        } else if (userProfile.displayName) {
          userName = userProfile.displayName;
        }
        // Use user email if not already provided
        if (!userEmail && userProfile.email) {
          userEmail = userProfile.email;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch user profile for review, continuing without userName:', error);
    }
  }

  const reviewData: Omit<Review, 'id'> = {
    ...review,
    businessId: finalBusinessId,
    ...(userName && { userName }),
    // Normalize email to lowercase for consistent duplicate checking
    ...(userEmail && { userEmail: userEmail.toLowerCase().trim() }),
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };

  console.log('Creating review with data:', {
    reviewType: reviewData.reviewType,
    itemId: reviewData.itemId,
    businessId: reviewData.businessId,
    rating: reviewData.rating,
    hasComment: !!reviewData.comment,
    userId: reviewData.userId,
    userName: reviewData.userName,
  });

  try {
    const reviewRef = await addDoc(collection(db, COLLECTIONS.REVIEWS), reviewData);
    console.log('Review created successfully with ID:', reviewRef.id);
    return reviewRef.id;
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
};

/**
 * Update review
 */
export const updateReview = async (
  reviewId: string,
  updates: Partial<Review>
): Promise<void> => {
  const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
  const reviewSnap = await getDoc(reviewRef);

  if (!reviewSnap.exists()) {
    throw new NotFoundError('Review');
  }

  await updateDoc(reviewRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete review
 */
export const deleteReview = async (reviewId: string): Promise<void> => {
  const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
  const reviewSnap = await getDoc(reviewRef);

  if (!reviewSnap.exists()) {
    throw new NotFoundError('Review');
  }

  await deleteDoc(reviewRef);
};
