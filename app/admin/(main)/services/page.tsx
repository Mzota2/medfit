/**
 * Admin Services Management
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Loading, useToast, useConfirmDialog, ConfirmDialog } from '@/components/ui';
import { useApp } from '@/contexts/AppContext';
import { useServices, useRealtimeServices, useDeleteService, useUpdateService } from '@/hooks';
import { ItemStatus } from '@/types/item';
import { cn } from '@/lib/utils/cn';
import { getUserFriendlyMessage, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/utils/user-messages';
import { ProductImage } from '@/components/ui/OptimizedImage';
import { Trash2 } from 'lucide-react';
import { StoreTypeGuard } from '@/components/guards/StoreTypeGuard';

export default function AdminServicesPage() {
  return (
    <StoreTypeGuard requireServices={true} redirectTo="/admin">
      <AdminServicesPageContent />
    </StoreTypeGuard>
  );
}

function AdminServicesPageContent() {
  const toast = useToast();
  const { confirmDialog, showConfirm, hideConfirm } = useConfirmDialog();
  const { currentBusiness } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | 'all'>('all');
  
  // Fetch services with React Query
  const {
    data: items = [],
    isLoading: loading,
    error,
  } = useServices({
    businessId: currentBusiness?.id,
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    enabled: !!currentBusiness?.id,
  });

  // Real-time updates
  useRealtimeServices({
    businessId: currentBusiness?.id,
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    enabled: !!currentBusiness?.id,
  });

  // Delete mutation
  const deleteService = useDeleteService();
  
  // Update mutation for featured status
  const updateService = useUpdateService();

  const filteredServices = Array.isArray(items) ? items.filter((service: { name: string; description?: string }) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        service.name.toLowerCase().includes(query) ||
        service.description?.toLowerCase().includes(query)
      );
    }
    return true;
  }) : [];

  const handleDelete = async (serviceId: string) => {
    showConfirm({
      title: 'Delete Service',
      message: 'Are you sure you want to delete this service? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteService.mutateAsync(serviceId);
          toast.showSuccess(SUCCESS_MESSAGES.SERVICE_DELETED);
        } catch (error) {
          console.error('Error deleting service:', error);
          toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.DELETE_FAILED));
        }
      },
    });
  };

  const handleToggleFeatured = async (serviceId: string, currentFeatured: boolean) => {
    try {
      const updates: Record<string, unknown> = {
        isFeatured: !currentFeatured,
      };
      
      // Only set featuredUntil to null when unfeaturing (removing featured status)
      if (currentFeatured) {
        updates.featuredUntil = null;
      }
      
      await updateService.mutateAsync({
        serviceId,
        updates,
      });
      toast.showSuccess(
        !currentFeatured 
          ? 'Service marked as featured' 
          : 'Service removed from featured'
      );
    } catch (error) {
      console.error('Error updating service featured status:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
    }
  };

  if (loading && (!Array.isArray(items) || items.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Services</h1>
        <Link href="/admin/services/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">+ Add Service</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg p-3 sm:p-4 border border-border mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 w-full sm:min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search services..."
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
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-sm sm:text-base">
          {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      {/* Services List */}
      <div className="bg-card rounded-lg border border-border">
        <div className="divide-y divide-border">
          {filteredServices.length === 0 && !loading ? (
            <div className="p-8 sm:p-12 text-center text-text-secondary">
              <p className="text-sm sm:text-base">No services found</p>
            </div>
          ) : (
            filteredServices.map((service) => {
              const mainImage = service?.images?.[0]?.url;
              const duration = service?.duration ? `${service?.duration} minutes` : 'N/A';
              
              return (
                <div key={service.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-background-secondary transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-background-secondary rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {mainImage ? (
                        <ProductImage
                          src={mainImage}
                          alt={service.name}
                          width={64}
                          height={64}
                          context="thumbnail"
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm sm:text-base truncate">{service.name}</h3>
                      <p className="text-xs sm:text-sm text-text-secondary">Duration: {duration}</p>
                      <p className="text-xs sm:text-sm font-medium text-foreground mt-0.5 sm:mt-1">
                      {service.pricing.currency || 'MWK'}{service.pricing.basePrice} 
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary">
                        Status: <span className="capitalize">{service.status}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2 self-end sm:self-auto">
                    <label className="flex items-center gap-2 cursor-pointer" title="Toggle Featured">
                      <input
                        type="checkbox"
                        checked={service.isFeatured || false}
                        onChange={() => handleToggleFeatured(service.id!, service.isFeatured || false)}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                        disabled={updateService.isPending}
                      />
                      <span className="text-xs sm:text-sm text-text-secondary">Featured</span>
                    </label>
                    <Link href={`/admin/services/${service.id}/edit`}>
                      <button className="p-1.5 sm:p-2 text-text-secondary hover:text-foreground transition-colors" title="Edit">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(service.id!)}
                      className="p-1.5 sm:p-2 text-destructive hover:text-destructive-hover transition-colors"
                      title="Delete"
                      disabled={updateService.isPending}
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {filteredServices.length > 0 && (
          <div className="p-3 sm:p-4 border-t border-border">
            <p className="text-xs sm:text-sm text-text-secondary">
              Showing {filteredServices.length} of {Array.isArray(items) ? items.length : 0} services
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog {...confirmDialog} onClose={hideConfirm} />
    </div>
  );
}

