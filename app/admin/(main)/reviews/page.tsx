/**
 * Admin Reviews Page
 * Real-time reviews management with Firebase integration
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useReviews, useRealtimeReviews, useDeleteReview, useProducts, useServices } from '@/hooks';
import { Button, Modal, Loading, useToast, useConfirmDialog, ConfirmDialog } from '@/components/ui';
import { getUserFriendlyMessage, ERROR_MESSAGES } from '@/lib/utils/user-messages';
import { Star, Trash2, Eye, Search, Package, Calendar, Building2, Tag } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/formatting';
import Link from 'next/link';
import { useSettings } from '@/hooks/useSettings';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';

// Helper to convert date safely
const getDate = (date: Date | string | Timestamp | { toDate?: () => Date } | undefined): Date => {
  if (!date) return new Date(0);
  if (date instanceof Date) return date;
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'object' && date !== null && 'toDate' in date && typeof (date as { toDate: () => Date }).toDate === 'function') {
    return (date as { toDate: () => Date }).toDate();
  }
  return new Date(date as string);
};

export default function AdminReviewsPage() {
  const { currentBusiness } = useApp();
  const { data: settings } = useSettings();
  const reviewsEnabled = settings?.documentCreation?.enableReviews ?? false;
  const router = useRouter();
  const toast = useToast();
  const { confirmDialog, showConfirm, hideConfirm } = useConfirmDialog();

  // All hooks must be called before any early returns
  const [selectedRating, setSelectedRating] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingReview, setViewingReview] = useState<string | null>(null);

  // Fetch reviews with React Query
  const {
    data: items = [],
    isLoading: loading,
    error,
  } = useReviews({
    businessId: currentBusiness?.id,
    limit: 1000,
    enabled: !!currentBusiness?.id && reviewsEnabled,
  });

  // Real-time updates
  useRealtimeReviews({
    businessId: currentBusiness?.id,
    limit: 1000,
    enabled: !!currentBusiness?.id && reviewsEnabled,
  });

  // Fetch products and services for reference
  const { data: products = [] } = useProducts({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id && reviewsEnabled,
  });

  const { data: services = [] } = useServices({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id && reviewsEnabled,
  });

  // Delete mutation
  const deleteReview = useDeleteReview();

  // Get item name helper
  const getItemName = (itemId?: string) => {
    if (!itemId) return null;
    if (Array.isArray(products) && products.length > 0) {
      const product = (products as Array<{ id?: string; name: string }>).find((p) => p.id === itemId);
      if (product && 'name' in product) return product.name;
    }
    if (Array.isArray(services) && services.length > 0) {
      const service = (services as Array<{ id?: string; name: string }>).find((s) => s.id === itemId);
      if (service && 'name' in service) return service.name;
    }
    return 'Unknown Item';
  };

  // Determine if review is for business or item
  const isBusinessReview = (review: { reviewType?: string; itemId?: string }) => {
    return review.reviewType === 'business' || !review.itemId;
  };

  const filteredReviews = useMemo(() => {
    let filtered = items;

    // Filter by rating
    if (selectedRating !== 'all') {
      filtered = filtered.filter((review) => review.rating === selectedRating);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (review) =>
          review.comment?.toLowerCase().includes(query) ||
          review.userName?.toLowerCase().includes(query) ||
          review.userEmail?.toLowerCase().includes(query) ||
          getItemName(review.itemId)?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, selectedRating, searchQuery, products, services, getItemName]);

  // Redirect if reviews are disabled
  React.useEffect(() => {
    if (settings && !reviewsEnabled) {
      router.replace('/admin');
    }
  }, [settings, reviewsEnabled, router]);

  if (!reviewsEnabled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="text-center">
          <p className="text-base sm:text-lg text-foreground mb-2">Reviews feature is disabled</p>
          <p className="text-sm sm:text-base text-text-secondary mb-4">Enable reviews in Settings → Cost Control → Document Creation</p>
          <Button onClick={() => router.push('/admin/settings?tab=cost-control')} className="w-full sm:w-auto">
            Go to Settings
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = async (reviewId: string) => {
    showConfirm({
      title: 'Delete Review',
      message: 'Are you sure you want to delete this review? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteReview.mutateAsync(reviewId);
          toast.showSuccess('Review deleted successfully');
        } catch (error) {
          console.error('Error deleting review:', error);
          toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES?.DELETE_FAILED));
        }
      },
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          'w-4 h-4',
          i < rating ? 'fill-warning text-warning' : 'text-text-muted'
        )}
      />
    ));
  };

  const selectedReview = viewingReview ? items.find((r) => r.id === viewingReview) : null;

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reviews</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Manage customer reviews and ratings
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="w-full sm:flex-1 sm:min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedRating('all')}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
              selectedRating === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
            )}
          >
            All ({items.length})
          </button>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = items.filter((r) => r.rating === rating).length;
            return (
              <button
                key={rating}
                onClick={() => setSelectedRating(rating)}
                className={cn(
                  'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0',
                  selectedRating === rating
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
                )}
              >
                <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                {rating} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-sm sm:text-base">
          {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review) => {
          const isBusiness = isBusinessReview(review);
          const itemName = getItemName(review.itemId);
          const reviewDate = getDate(review.createdAt);

          return (
            <div
              key={review.id}
              className="bg-card border border-border rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {renderStars(review.rating)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                        <p className="font-medium text-sm sm:text-base text-foreground truncate">
                          {review.userName || review.userEmail || 'Anonymous'}
                        </p>
                        {/* Review Type Badge */}
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit',
                          isBusiness
                            ? 'bg-primary/20 text-primary'
                            : 'bg-warning/20 text-warning'
                        )}>
                          {isBusiness ? (
                            <>
                              <Building2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Business Review</span>
                              <span className="sm:hidden">Business</span>
                            </>
                          ) : (
                            <>
                              <Tag className="w-3 h-3" />
                              <span className="hidden sm:inline">Item Review</span>
                              <span className="sm:hidden">Item</span>
                            </>
                          )}
                        </span>
                      </div>
                      {review.userEmail && review.userName && (
                        <p className="text-xs text-text-secondary truncate">
                          {review.userEmail}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-2 sm:mb-3">
                    {isBusiness ? (
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-text-secondary mb-1">
                        <Building2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="font-medium text-foreground">Business Review</span>
                        <span className="text-text-muted hidden sm:inline">- Review for the entire business</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-text-secondary mb-1">
                        <Package className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="text-text-secondary">Item:</span>
                        <Link
                          href={`/admin/${products.find((p) => p.id === review.itemId) ? 'products' : 'services'}/${review.itemId}`}
                          className="text-primary hover:text-primary-hover font-medium truncate"
                        >
                          {itemName || 'Unknown Item'}
                        </Link>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      {formatDate(reviewDate.toISOString())}
                    </div>
                  </div>

                  {review.comment && (
                    <p className="text-sm sm:text-base text-text-secondary mb-2 whitespace-pre-wrap break-words">{review.comment}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={() => setViewingReview(review.id!)}
                    className="p-2 text-text-secondary hover:text-foreground transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => review.id && handleDelete(review.id)}
                    className="p-2 text-destructive hover:text-destructive-hover transition-colors"
                    title="Delete Review"
                    disabled={!review.id}
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredReviews.length === 0 && !loading && (
        <div className="text-center py-8 sm:py-12 text-text-secondary">
          <Star className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
          <p className="text-sm sm:text-base">No reviews found</p>
          {searchQuery && (
            <p className="text-xs sm:text-sm mt-2">Try adjusting your search or filters</p>
          )}
        </div>
      )}

      {/* View Review Modal */}
      <Modal
        isOpen={!!viewingReview && !!selectedReview}
        onClose={() => setViewingReview(null)}
        title="Review Details"
        size="md"
      >
        {selectedReview && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 flex-shrink-0">
                {renderStars(selectedReview.rating)}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm sm:text-base text-foreground">
                  {selectedReview.userName || selectedReview.userEmail || 'Anonymous'}
                </p>
                {selectedReview.userEmail && selectedReview.userName && (
                  <p className="text-xs sm:text-sm text-text-secondary truncate">
                    {selectedReview.userEmail}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Review Type</label>
              <div className="mt-1">
                {isBusinessReview(selectedReview) ? (
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm sm:text-base text-foreground font-medium">Business Review</span>
                    <span className="text-xs sm:text-sm text-text-muted hidden sm:inline">- Review for the entire business</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="w-4 h-4 text-warning flex-shrink-0" />
                      <span className="text-sm sm:text-base text-foreground font-medium">Item Review</span>
                    </div>
                    <Link
                      href={`/admin/${products.find((p) => p.id === selectedReview.itemId) ? 'products' : 'services'}/${selectedReview.itemId}`}
                      className="block text-sm sm:text-base text-primary hover:text-primary-hover mt-1 break-words"
                    >
                      {getItemName(selectedReview.itemId) || 'Unknown Item'}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Rating</label>
              <div className="flex items-center gap-1 mt-1">
                {renderStars(selectedReview.rating)}
                <span className="text-xs sm:text-sm text-text-secondary ml-2">
                  {selectedReview.rating} out of 5
                </span>
              </div>
            </div>

            {selectedReview.comment && (
              <div>
                <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Comment</label>
                <p className="text-sm sm:text-base text-foreground mt-1 whitespace-pre-wrap break-words">{selectedReview.comment}</p>
              </div>
            )}

            <div>
              <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Date</label>
              <p className="text-sm sm:text-base text-foreground mt-1">
                {formatDate(
                  getDate(selectedReview.createdAt).toISOString()
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => selectedReview.id && handleDelete(selectedReview.id)}
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Review
              </Button>
              <Button onClick={() => setViewingReview(null)} className="w-full sm:w-auto">Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog {...confirmDialog} onClose={hideConfirm} />
    </div>
  );
}
