/**
 * Admin Categories Page
 */

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { useCategories, useRealtimeCategories, useDeleteCategory } from '@/hooks';
import { Category } from '@/types/category';
import { Button, Modal, useToast, useConfirmDialog, ConfirmDialog } from '@/components/ui';
import { Loading } from '@/components/ui/Loading';
import { getUserFriendlyMessage, ERROR_MESSAGES} from '@/lib/utils/user-messages';
import { Plus, Edit, Trash2, Tag, Eye } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { CategoryImage } from '@/components/ui/OptimizedImage';

export default function AdminCategoriesPage() {
  const toast = useToast();
  const { confirmDialog, showConfirm, hideConfirm } = useConfirmDialog();
  const { currentBusiness } = useApp();
  const [selectedType, setSelectedType] = useState<'product' | 'service' | 'both' | 'all'>('all');
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  
  // Fetch categories with React Query
  const {
    data: items = [],
    isLoading: loading,
    error,
  } = useCategories({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id,
  });

  // Real-time updates
  useRealtimeCategories({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id,
  });

  // Delete mutation
  const deleteCategory = useDeleteCategory();

  const filteredCategories = useMemo(() => {
    return selectedType === 'all' 
      ? items 
      : items.filter(cat => cat.type === selectedType);
  }, [items, selectedType]);

  const handleDelete = async (categoryId: string) => {
    showConfirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteCategory.mutateAsync(categoryId);
          toast.showSuccess('Category deleted successfully');
        } catch (error) {
          console.error('Error deleting category:', error);
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
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Categories</h1>
        <Link href="/admin/categories/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6 overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setSelectedType('all')}
          className={cn(
            'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0',
            selectedType === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
          )}
        >
          All
        </button>
        <button
          onClick={() => setSelectedType('product')}
          className={cn(
            'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0',
            selectedType === 'product'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
          )}
        >
          Products
        </button>
        <button
          onClick={() => setSelectedType('service')}
          className={cn(
            'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0',
            selectedType === 'service'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
          )}
        >
          Services
        </button>
        <button
          onClick={() => setSelectedType('both')}
          className={cn(
            'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0',
            selectedType === 'both'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
          )}
        >
          Both
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/20 text-destructive rounded-lg">
          {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredCategories.map((category, index) => (
          <div
            key={category.id}
            className="bg-card border border-border rounded-lg p-4 sm:p-5 md:p-6 hover:shadow-md transition-shadow"
          >
            {/* Image */}
            {category.image && (
              <div className="relative w-full aspect-square mb-3 sm:mb-4 rounded-lg overflow-hidden bg-background-secondary">
                <CategoryImage
                  src={category.image}
                  alt={category.name}
                  fill
                  context="listing"
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  priority={index < 6} // Priority for first 6 images (likely above the fold)
                />
              </div>
            )}
            
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                {category.icon ? (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xl sm:text-2xl">{category.icon}</span>
                  </div>
                ) : (
                  <Tag className="w-8 h-8 sm:w-10 sm:h-10 text-primary shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{category.name}</h3>
                  <span className="text-[10px] sm:text-xs text-text-secondary capitalize">{category.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  onClick={() => setViewingCategory(category)}
                  className="p-1.5 sm:p-2 text-text-secondary hover:text-foreground transition-colors"
                  title="View"
                >
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                {category.id && (
                  <Link href={`/admin/categories/${category.id}/edit`}>
                    <button
                      className="p-1.5 sm:p-2 text-text-secondary hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </Link>
                )}
                <button
                  onClick={() => category.id && handleDelete(category.id)}
                  className="p-1.5 sm:p-2 text-destructive hover:text-destructive-hover transition-colors"
                  title="Delete"
                  disabled={!category.id}
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
            {category.description && (
              <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4 line-clamp-2">{category.description}</p>
            )}
            <div className="text-[10px] sm:text-xs text-text-muted">
              Slug: <code className="bg-background-secondary px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs break-all">{category.slug}</code>
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && !loading && (
        <div className="text-center py-8 sm:py-12 text-text-secondary">
          <Tag className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
          <p className="text-sm sm:text-base">No categories found</p>
        </div>
      )}

      {/* View Modal */}
      <Modal
        isOpen={!!viewingCategory}
        onClose={() => setViewingCategory(null)}
        title={viewingCategory?.name}
        size="lg"
      >
        {viewingCategory && (
          <div className="space-y-3 sm:space-y-4">
            {viewingCategory.image && (
              <div className="relative w-full h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden bg-background-secondary">
                <CategoryImage
                  src={viewingCategory.image}
                  alt={viewingCategory.name}
                  fill
                  context="detail"
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 800px"
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary">Type</label>
                <p className="text-foreground capitalize">{viewingCategory.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Slug</label>
                <p className="text-foreground font-mono text-sm">{viewingCategory.slug}</p>
              </div>
            </div>

            {viewingCategory.icon && (
              <div>
                <label className="text-sm font-medium text-text-secondary">Icon</label>
                <p className="text-2xl">{viewingCategory.icon}</p>
              </div>
            )}

            {viewingCategory.description && (
              <div>
                <label className="text-sm font-medium text-text-secondary">Description</label>
                <p className="text-foreground">{viewingCategory.description}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Link href={`/admin/categories/${viewingCategory.id}/edit`}>
                <Button
                  variant="outline"
                  onClick={() => setViewingCategory(null)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button onClick={() => setViewingCategory(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog {...confirmDialog} onClose={hideConfirm} />
    </div>
  );
}

