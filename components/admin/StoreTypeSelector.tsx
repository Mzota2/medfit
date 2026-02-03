/**
 * Store Type Selector Component
 * Shown prominently when admin first launches dashboard
 * Allows admin to configure store type (products only, services only, or both)
 */

'use client';

import React, { useState } from 'react';
import { StoreType } from '@/types/settings';
import { getSettings, upsertSettings } from '@/lib/settings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Package, Calendar, ShoppingBag, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getUserFriendlyMessage } from '@/lib/utils/user-messages';

interface StoreTypeSelectorProps {
  onComplete?: () => void;
}

export const StoreTypeSelector: React.FC<StoreTypeSelectorProps> = ({ onComplete }) => {
  const [selectedType, setSelectedType] = useState<StoreType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  // If store type is already set, don't show selector
  if (!isLoading && settings?.storeType) {
    return null;
  }

  const handleSave = async () => {
    if (!selectedType) {
      setError('Please select a store type');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const currentSettings = settings || {
        delivery: { enabled: true, cost: 0, currency: 'MWK' },
        payment: { enabled: true, methods: [], currency: 'MWK', taxRate: 0 },
        analytics: { enabled: false, trackingId: '' },
      };

      await upsertSettings({
        ...currentSettings,
        storeType: selectedType,
      });

      // Invalidate settings query to refresh
      await queryClient.invalidateQueries({ queryKey: ['settings'] });

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Error saving store type:', err);
      const errorMessage = getUserFriendlyMessage(err instanceof Error ? err.message : 'Failed to save store type');
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border shadow-xl max-w-2xl w-full p-6 md:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Configure Your Store Type
            </h2>
            <p className="text-text-secondary">
              Select what your business offers. This helps us show you only what you need.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/20 border border-destructive/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Products Only */}
          <button
            onClick={() => setSelectedType(StoreType.PRODUCTS_ONLY)}
            className={cn(
              'p-6 rounded-lg border-2 transition-all text-left',
              'hover:border-primary hover:bg-primary/5',
              selectedType === StoreType.PRODUCTS_ONLY
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background-secondary'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'p-3 rounded-lg',
                selectedType === StoreType.PRODUCTS_ONLY
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background-tertiary text-text-secondary'
              )}>
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Products Only</h3>
                <p className="text-xs text-text-secondary">E-commerce store</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary">
              Sell physical or digital products. Customers can add items to cart and place orders.
            </p>
            {selectedType === StoreType.PRODUCTS_ONLY && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-medium text-primary">
                  ✓ Products pages enabled
                </p>
                <p className="text-xs font-medium text-primary">
                  ✓ Orders management enabled
                </p>
                <p className="text-xs text-text-secondary">
                  ✗ Services pages hidden
                </p>
                <p className="text-xs text-text-secondary">
                  ✗ Bookings management hidden
                </p>
              </div>
            )}
          </button>

          {/* Services Only */}
          <button
            onClick={() => setSelectedType(StoreType.SERVICES_ONLY)}
            className={cn(
              'p-6 rounded-lg border-2 transition-all text-left',
              'hover:border-primary hover:bg-primary/5',
              selectedType === StoreType.SERVICES_ONLY
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background-secondary'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'p-3 rounded-lg',
                selectedType === StoreType.SERVICES_ONLY
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background-tertiary text-text-secondary'
              )}>
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Services Only</h3>
                <p className="text-xs text-text-secondary">Service booking</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary">
              Offer services that customers can book. Manage appointments and service schedules.
            </p>
            {selectedType === StoreType.SERVICES_ONLY && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-medium text-primary">
                  ✓ Services pages enabled
                </p>
                <p className="text-xs font-medium text-primary">
                  ✓ Bookings management enabled
                </p>
                <p className="text-xs text-text-secondary">
                  ✗ Products pages hidden
                </p>
                <p className="text-xs text-text-secondary">
                  ✗ Orders management hidden
                </p>
              </div>
            )}
          </button>

          {/* Both */}
          <button
            onClick={() => setSelectedType(StoreType.BOTH)}
            className={cn(
              'p-6 rounded-lg border-2 transition-all text-left',
              'hover:border-primary hover:bg-primary/5',
              selectedType === StoreType.BOTH
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background-secondary'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'p-3 rounded-lg',
                selectedType === StoreType.BOTH
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background-tertiary text-text-secondary'
              )}>
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Both</h3>
                <p className="text-xs text-text-secondary">Full store</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary">
              Sell both products and services. Full e-commerce and booking capabilities.
            </p>
            {selectedType === StoreType.BOTH && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-medium text-primary">
                  ✓ Products pages enabled
                </p>
                <p className="text-xs font-medium text-primary">
                  ✓ Services pages enabled
                </p>
                <p className="text-xs font-medium text-primary">
                  ✓ Orders management enabled
                </p>
                <p className="text-xs font-medium text-primary">
                  ✓ Bookings management enabled
                </p>
              </div>
            )}
          </button>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                Lean Manufacturing Principle
              </p>
              <p className="text-sm text-text-secondary">
                {`We'll hide pages and features you don't need based on your selection. This keeps your admin dashboard clean and focused. You can change this anytime in Settings.`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button
            onClick={handleSave}
            disabled={!selectedType || isSaving}
            isLoading={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
};

