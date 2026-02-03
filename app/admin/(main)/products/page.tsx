/**
 * Admin Products Management
 */

'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Button, Loading, useToast, useConfirmDialog, ConfirmDialog, Badge } from '@/components/ui';
import { Download } from 'lucide-react';
import { exportHtmlElement } from '@/lib/exports/htmlExport';
import { useApp } from '@/contexts/AppContext';
import { useProducts, useRealtimeProducts, useDeleteProduct, useUpdateProduct } from '@/hooks';
import { ItemStatus } from '@/types/item';
import { cn } from '@/lib/utils/cn';
import { ProductImage } from '@/components/ui/OptimizedImage';
import { Trash2 } from 'lucide-react';
import { getUserFriendlyMessage, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/utils/user-messages';

export default function AdminProductsPage() {
  const toast = useToast();
  const { confirmDialog, showConfirm, hideConfirm } = useConfirmDialog();
  const { currentBusiness } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | 'all' | 'out_of_stock'>('all');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'image'>('pdf');
  const tableExportRef = useRef<HTMLDivElement>(null);
  
  // Fetch products with React Query
  // Filter out 'out_of_stock' from the status filter for the API call
  const apiStatusFilter = selectedStatus === 'all' || selectedStatus === 'out_of_stock' 
    ? undefined 
    : selectedStatus;

  const {
    data: items = [],
    isLoading: loading,
    error,
  } = useProducts({
    businessId: currentBusiness?.id,
    status: apiStatusFilter,
    enabled: !!currentBusiness?.id,
  });

  // Real-time updates for admin (critical - admin needs immediate updates when managing products)
  useRealtimeProducts({
    businessId: currentBusiness?.id,
    status: apiStatusFilter,
    enabled: !!currentBusiness?.id,
  });

  // Delete mutation
  const deleteProduct = useDeleteProduct();
  
  // Update mutation for featured status
  const updateProduct = useUpdateProduct();

  // Handle export
  const handleExport = async () => {
    if (!tableExportRef.current) return;
    const fileName = `products-${selectedStatus === 'all' ? 'all' : selectedStatus}`;
    await exportHtmlElement(tableExportRef.current, {
      format: exportFormat,
      fileName,
    });
  };

  const filteredProducts = items.filter((product) => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!(
        product.name.toLowerCase().includes(query) ||
        (product.sku && product.sku.toLowerCase().includes(query)) ||
        (product.description && product.description.toLowerCase().includes(query))
      )) {
        return false;
      }
    }
    
    // Apply status filter
    if (selectedStatus === 'out_of_stock') {
      const available = product.inventory?.available ?? 0;
      return available <= 0;
    } else if (selectedStatus !== 'all') {
      return product.status === selectedStatus;
    }
    
    return true;
  });

  const handleDelete = async (productId: string | undefined) => {
    if (!productId) return;
    
    showConfirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
      try {
        await deleteProduct.mutateAsync(productId);
          toast.showSuccess(SUCCESS_MESSAGES.PRODUCT_DELETED);
      } catch (error) {
        console.error('Error deleting product:', error);
          toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.DELETE_FAILED));
      }
      },
    });
  };

  const handleToggleFeatured = async (productId: string, currentFeatured: boolean) => {
    try {
      const updates: Record<string, unknown> = {
        isFeatured: !currentFeatured,
      };
      
      // Only set featuredUntil to null when unfeaturing (removing featured status)
      if (currentFeatured) {
        updates.featuredUntil = null;
      }
      
      await updateProduct.mutateAsync({
        productId,
        updates,
      });
      toast.showSuccess(
        !currentFeatured 
          ? 'Product marked as featured' 
          : 'Product removed from featured'
      );
    } catch (error) {
      console.error('Error updating product featured status:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
    }
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
      <div className="flex flex-col gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Products</h1>
        <Link href="/admin/products/new" className="w-full sm:w-auto sm:justify-end">
          <Button className="w-full sm:w-auto">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg p-3 sm:p-4 border border-border mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 w-full sm:min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setSelectedStatus('all')}
              className={cn(
                'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                selectedStatus === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
              )}
            >
              All Status
            </button>
            <button
              onClick={() => setSelectedStatus(ItemStatus.ACTIVE)}
              className={cn(
                'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                selectedStatus === ItemStatus.ACTIVE
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
              )}
            >
              Active
            </button>
            <button
              onClick={() => setSelectedStatus(ItemStatus.INACTIVE)}
              className={cn(
                'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                selectedStatus === ItemStatus.INACTIVE
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
              )}
            >
              Inactive
            </button>
            <button
              onClick={() => setSelectedStatus('out_of_stock')}
              className={cn(
                'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                selectedStatus === 'out_of_stock'
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
              )}
            >
              Out of Stock
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-sm sm:text-base">
          {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      {/* Products List */}
      <div className="bg-card rounded-lg border border-border" ref={tableExportRef}>
        <div className="divide-y divide-border">
          {filteredProducts.length === 0 && !loading ? (
            <div className="p-8 sm:p-12 text-center text-text-secondary">
              <p className="text-sm sm:text-base">No products found</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const mainImage = product.images?.[0]?.url;
              const stock = product.inventory?.available || 0;
              
              return (
                <div key={product.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-background-secondary transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-background-secondary rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {mainImage ? (
                        <ProductImage
                          src={mainImage}
                          alt={product.name}
                          width={64}
                          height={64}
                          context="thumbnail"
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm sm:text-base truncate">{product.name}</h3>
                      {product.sku && (
                        <p className="text-xs sm:text-sm text-text-secondary truncate">SKU: {product.sku}</p>
                      )}
                      <p className="text-xs sm:text-sm font-medium text-foreground mt-0.5 sm:mt-1">
                      {product.pricing.currency || 'MWK'}{product.pricing.basePrice} 
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            'w-2 h-2 rounded-full',
                            stock > 10 ? 'bg-success' : stock > 0 ? 'bg-warning' : 'bg-destructive'
                          )} />
                          <p className={cn(
                            'text-xs sm:text-sm',
                            stock > 10 ? 'text-text-secondary' : 
                            stock > 0 ? 'text-warning font-medium' : 'text-destructive font-medium'
                          )}>
                            {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                          </p>
                        </div>
                        <span className="text-text-muted hidden sm:inline">|</span>
                        <div className="text-xs sm:text-sm">
                          <Badge 
                            variant={product.status === ItemStatus.ACTIVE ? 'success' : 'default'}
                            className="capitalize"
                          >
                            {product.status.toLowerCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2 self-end sm:self-auto">
                    <label className="flex items-center gap-2 cursor-pointer" title="Toggle Featured">
                      <input
                        type="checkbox"
                        checked={product.isFeatured || false}
                        onChange={() => handleToggleFeatured(product.id!, product.isFeatured || false)}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                        disabled={updateProduct.isPending}
                      />
                      <span className="text-xs sm:text-sm text-text-secondary">Featured</span>
                    </label>
                    <Link href={`/admin/products/${product.id}/edit`}>
                      <button className="p-1.5 sm:p-2 text-text-secondary hover:text-foreground transition-colors" title="Edit">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-1.5 sm:p-2 text-destructive hover:text-destructive-hover transition-colors"
                      title="Delete"
                      disabled={!product.id || updateProduct.isPending}
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {filteredProducts.length > 0 && (
          <div className="p-3 sm:p-4 border-t border-border">
            <p className="text-xs sm:text-sm text-text-secondary">
              Showing {filteredProducts.length} of {items.length} products
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog {...confirmDialog} onClose={hideConfirm} />
    </div>
  );
}

