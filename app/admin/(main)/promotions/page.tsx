/**
 * Admin Promotions Page
 * Real-time promotions management with Firebase integration
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePromotions, useDeletePromotion } from '@/hooks';
import { PromotionStatus, DiscountType } from '@/types/promotion';
import { Button, Loading, useToast, useConfirmDialog, ConfirmDialog } from '@/components/ui';
import { getUserFriendlyMessage, ERROR_MESSAGES} from '@/lib/utils/user-messages';
import { Plus, Edit, Trash2, Percent, Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDate, formatCurrency } from '@/lib/utils/formatting';
import Link from 'next/link';

export default function AdminPromotionsPage() {
  const toast = useToast();
  const { confirmDialog, showConfirm, hideConfirm } = useConfirmDialog();
  const { currentBusiness } = useApp();
  const [selectedStatus, setSelectedStatus] = useState<PromotionStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch promotions with React Query
  const {
    data: items = [],
    isLoading: loading,
    error,
  } = usePromotions({
    businessId: currentBusiness?.id,
    limit: 1000,
    enabled: !!currentBusiness?.id,
  });

  // Delete mutation
  const deletePromotion = useDeletePromotion();

  const filteredPromotions = useMemo(() => {
    let filtered = items;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((promo) => promo.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (promo) =>
          promo.name.toLowerCase().includes(query) ||
          promo.description?.toLowerCase().includes(query) ||
          promo.slug?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, selectedStatus, searchQuery]);

  const getStatusColor = (status: PromotionStatus) => {
    switch (status) {
      case PromotionStatus.ACTIVE:
        return 'bg-success/20 text-success';
      case PromotionStatus.INACTIVE:
        return 'bg-background-secondary text-text-secondary';
      case PromotionStatus.EXPIRED:
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-background-secondary text-text-secondary';
    }
  };

  const handleDelete = async (promotionId: string) => {
    showConfirm({
      title: 'Delete Promotion',
      message: 'Are you sure you want to delete this promotion? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deletePromotion.mutateAsync(promotionId);
          toast.showSuccess('Promotion deleted successfully');
        } catch (error) {
          console.error('Error deleting promotion:', error);
          toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.DELETE_FAILED));
        }
      },
    });
  };


  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Promotions</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Manage discounts and promotional offers
          </p>
        </div>
        <Link href="/admin/promotions/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Promotion
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1 w-full sm:min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search promotions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setSelectedStatus('all')}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0',
              selectedStatus === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
            )}
          >
            All
          </button>
          <button
            onClick={() => setSelectedStatus(PromotionStatus.ACTIVE)}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0',
              selectedStatus === PromotionStatus.ACTIVE
                ? 'bg-primary text-primary-foreground'
                : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
            )}
          >
            Active
          </button>
          <button
            onClick={() => setSelectedStatus(PromotionStatus.INACTIVE)}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0',
              selectedStatus === PromotionStatus.INACTIVE
                ? 'bg-primary text-primary-foreground'
                : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
            )}
          >
            Inactive
          </button>
          <button
            onClick={() => setSelectedStatus(PromotionStatus.EXPIRED)}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0',
              selectedStatus === PromotionStatus.EXPIRED
                ? 'bg-primary text-primary-foreground'
                : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
            )}
          >
            Expired
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/20 text-destructive rounded-lg">
          {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      {/* Promotions Table - Desktop */}
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-secondary">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Discount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Period</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPromotions.map((promotion) => (
                <tr key={promotion.id} className="hover:bg-background-secondary transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-foreground">{promotion.name}</p>
                      {promotion.description && (
                        <p className="text-sm text-text-secondary">{promotion.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-foreground font-medium">
                      {promotion.discountType === DiscountType.PERCENTAGE 
                        ? `${promotion.discount}%` 
                        : formatCurrency(promotion.discount, 'MWK')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-text-secondary">
                    {formatDate(
                      (promotion.startDate instanceof Date 
                        ? promotion.startDate 
                        : (promotion.startDate as { toDate?: () => Date })?.toDate?.() || new Date(promotion.startDate as string)
                      ).toISOString()
                    )} - {formatDate(
                      (promotion.endDate instanceof Date 
                        ? promotion.endDate 
                        : (promotion.endDate as { toDate?: () => Date })?.toDate?.() || new Date(promotion.endDate as string)
                      ).toISOString()
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(promotion.status))}>
                      {promotion.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/promotions/${promotion.id}/edit`}
                        className="p-1 text-text-secondary hover:text-foreground transition-colors"
                        title="Edit Promotion"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => promotion.id && handleDelete(promotion.id)}
                        className="p-1 text-destructive hover:text-destructive-hover transition-colors"
                        title="Delete Promotion"
                        disabled={!promotion.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promotions Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredPromotions.map((promotion) => (
          <div key={promotion.id} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-foreground text-base mb-1">{promotion.name}</h3>
                {promotion.description && (
                  <p className="text-sm text-text-secondary line-clamp-2">{promotion.description}</p>
                )}
              </div>
              <span className={cn('px-2 py-1 rounded-full text-xs font-medium ml-2 shrink-0', getStatusColor(promotion.status))}>
                {promotion.status}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Discount:</span>
                <span className="text-foreground font-medium">
                  {promotion.discountType === DiscountType.PERCENTAGE 
                    ? `${promotion.discount}%` 
                    : formatCurrency(promotion.discount, 'MWK')}
                </span>
              </div>
              <div className="text-xs text-text-secondary">
                {formatDate(
                  (promotion.startDate instanceof Date 
                    ? promotion.startDate 
                    : (promotion.startDate as { toDate?: () => Date })?.toDate?.() || new Date(promotion.startDate as string)
                  ).toISOString()
                )} - {formatDate(
                  (promotion.endDate instanceof Date 
                    ? promotion.endDate 
                    : (promotion.endDate as { toDate?: () => Date })?.toDate?.() || new Date(promotion.endDate as string)
                  ).toISOString()
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-border">
              <Link
                href={`/admin/promotions/${promotion.id}/edit`}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-foreground transition-colors flex-1 justify-center py-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </Link>
              <button
                onClick={() => promotion.id && handleDelete(promotion.id)}
                className="flex items-center gap-2 text-sm text-destructive hover:text-destructive-hover transition-colors flex-1 justify-center py-2"
                title="Delete Promotion"
                disabled={!promotion.id}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredPromotions.length === 0 && !loading && (
        <div className="text-center py-8 sm:py-12 text-text-secondary">
          <Percent className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
          <p className="text-sm sm:text-base">No promotions found</p>
          {searchQuery && (
            <p className="text-xs sm:text-sm mt-2">Try adjusting your search or filters</p>
          )}
        </div>
      )}

      <ConfirmDialog {...confirmDialog} onClose={hideConfirm} />
    </div>
  );
}

