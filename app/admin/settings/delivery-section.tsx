/**
 * Delivery Settings Section Component
 * Handles delivery providers with Malawi region/district pricing
 */

'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useDeliveryProviders, useRealtimeDeliveryProviders, useCreateDeliveryProvider, useUpdateDeliveryProvider, useDeleteDeliveryProvider } from '@/hooks';
import { DeliveryProvider, MalawiRegion, MALAWI_DISTRICTS } from '@/types/delivery';
import { Button, Input, Modal, Loading } from '@/components/ui';
import { Plus, Edit, Trash2, Save } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import { cn } from '@/lib/utils/cn';

interface DeliverySectionProps {
  businessId?: string;
}

export function DeliverySection({ businessId }: DeliverySectionProps) {
  const { currentBusiness } = useApp();
  const finalBusinessId = businessId || currentBusiness?.id;
  const { data: providers = [], isLoading: loading } = useDeliveryProviders({
    businessId: finalBusinessId,
    limit: 100,
    enabled: !!finalBusinessId,
  });
  const createProvider = useCreateDeliveryProvider();
  const updateProvider = useUpdateDeliveryProvider();
  const deleteProvider = useDeleteDeliveryProvider();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<DeliveryProvider | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    contactInfo: {
      phone: '',
      email: '',
      website: '',
    },
    pricing: {
      generalPrice: 0,
      regionPricing: {} as Record<MalawiRegion, number>,
      districtPricing: {} as Record<string, number>,
    },
    currency: 'MWK',
    estimatedDays: {
      min: 1,
      max: 7,
    },
    trackingAvailable: false,
  });

  // Real-time updates
  useRealtimeDeliveryProviders({
    businessId: finalBusinessId,
    limit: 100,
    enabled: !!finalBusinessId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProvider?.id) {
        await updateProvider.mutateAsync({
          providerId: editingProvider.id,
          updates: formData,
        });
      } else {
        await createProvider.mutateAsync({
          providerData: formData,
          businessId: finalBusinessId,
        });
      }
      setEditingProvider(null);
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving provider:', error);
    }
  };

  const handleEdit = (provider: DeliveryProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      description: provider.description || '',
      isActive: provider.isActive,
      contactInfo: {
        phone: provider?.contactInfo?.phone || '',
        email: provider?.contactInfo?.email || '',
        website: provider?.contactInfo?.website || '',
      },
      pricing: {
        generalPrice: provider.pricing?.generalPrice || 0,
        regionPricing: provider.pricing?.regionPricing || ({} as Record<MalawiRegion, number>),
        districtPricing: provider.pricing?.districtPricing || ({} as Record<string, number>),
      },
      currency: provider.currency,
      estimatedDays: provider.estimatedDays || { min: 1, max: 7 },
      trackingAvailable: provider.trackingAvailable || false,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (providerId: string) => {
    if (confirm('Are you sure you want to delete this delivery provider?')) {
      try {
        await deleteProvider.mutateAsync(providerId);
      } catch (error) {
        console.error('Error deleting provider:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isActive: true,
      contactInfo: { phone: '', email: '', website: '' },
      pricing: { generalPrice: 0, regionPricing: {} as Record<MalawiRegion, number>, districtPricing: {} as Record<string, number> },
      currency: 'MWK',
      estimatedDays: { min: 1, max: 7 },
      trackingAvailable: false,
    });
    setEditingProvider(null);
  };

  if (loading) {
    return <Loading size="lg" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Delivery Providers</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Manage delivery providers and set pricing by region/district
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </Button>
      </div>

      {/* Providers List */}
      <div className="bg-card rounded-lg border border-border divide-y divide-border">
        {providers.length === 0 ? (
          <div className="p-6 sm:p-12 text-center text-text-secondary">
            <p className="text-sm sm:text-base">No delivery providers configured</p>
            <p className="text-xs sm:text-sm mt-2">Add a provider to get started</p>
          </div>
        ) : (
          providers.map((provider) => (
            <div key={provider.id} className="p-3 sm:p-4 hover:bg-background-secondary transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-bold text-foreground text-sm sm:text-base">{provider.name}</h3>
                    <span className={cn('px-2 py-0.5 sm:py-1 rounded text-xs', provider.isActive ? 'bg-success/20 text-success' : 'bg-background-secondary text-text-secondary')}>
                      {provider.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {provider.description && (
                    <p className="text-xs sm:text-sm text-text-secondary mb-2 line-clamp-2">{provider.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-text-secondary">
                    <span>General: {formatCurrency(provider.pricing.generalPrice || 0, provider.currency)}</span>
                    {provider.estimatedDays && (
                      <span>{provider.estimatedDays.min}-{provider.estimatedDays.max} days</span>
                    )}
                    {provider.trackingAvailable && (
                      <span className="text-primary">Tracking Available</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(provider)}
                    className="p-1.5 sm:p-1 text-text-secondary hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4 sm:w-4" />
                  </button>
                  <button
                    onClick={() => provider.id && handleDelete(provider.id)}
                    className="p-1.5 sm:p-1 text-text-secondary hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 sm:w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        title={editingProvider ? 'Edit Delivery Provider' : 'Add Delivery Provider'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <Input
            label="Provider Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Speed Courier"
          />

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Provider description..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Phone"
              value={formData.contactInfo.phone}
              onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, phone: e.target.value } })}
              placeholder="+265 XXX XXX XXX"
            />
            <Input
              label="Email"
              type="email"
              value={formData.contactInfo.email}
              onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, email: e.target.value } })}
              placeholder="contact@provider.com"
            />
          </div>

          <Input
            label="Website"
            type="url"
            value={formData.contactInfo.website}
            onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, website: e.target.value } })}
            placeholder="https://provider.com"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="General Price (MWK)"
              type="number"
              step="0.01"
              min="0"
              value={formData.pricing.generalPrice}
              onChange={(e) => setFormData({ ...formData, pricing: { ...formData.pricing, generalPrice: parseFloat(e.target.value) || 0 } })}
              placeholder="5000.00"
            />
            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm text-foreground">Active</span>
              </label>
            </div>
          </div>

          {/* Region Pricing */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">Region Pricing (MWK)</label>
            <div className="space-y-2">
              {Object.values(MalawiRegion).map((region) => (
                <div key={region} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="w-full sm:w-24 text-xs sm:text-sm text-text-secondary shrink-0">{region}:</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pricing.regionPricing?.[region] || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      pricing: {
                        ...formData.pricing,
                        regionPricing: {
                          ...formData.pricing.regionPricing,
                          [region]: parseFloat(e.target.value) || 0,
                        },
                      },
                    })}
                    placeholder="Optional"
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* District Pricing */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">District Pricing (MWK) - Optional</label>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {Object.entries(MALAWI_DISTRICTS).map(([region, districts]) => (
                <div key={region} className="border border-border rounded p-2 sm:p-3">
                  <p className="text-xs font-medium text-text-secondary mb-1.5 sm:mb-2">{region}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {districts.map((district) => (
                      <div key={district} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="text-xs text-text-secondary w-full sm:w-20 truncate shrink-0">{district}:</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.pricing.districtPricing?.[district] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            pricing: {
                              ...formData.pricing,
                              districtPricing: {
                                ...formData.pricing.districtPricing,
                                [district]: parseFloat(e.target.value) || 0,
                              },
                            },
                          })}
                          placeholder="Optional"
                          className="flex-1 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-secondary mt-2">
              District pricing overrides region pricing. Leave empty to use region or general price.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Min Days"
              type="number"
              min="1"
              value={formData.estimatedDays.min}
              onChange={(e) => setFormData({ ...formData, estimatedDays: { ...formData.estimatedDays, min: parseInt(e.target.value) || 1 } })}
            />
            <Input
              label="Max Days"
              type="number"
              min="1"
              value={formData.estimatedDays.max}
              onChange={(e) => setFormData({ ...formData, estimatedDays: { ...formData.estimatedDays, max: parseInt(e.target.value) || 7 } })}
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.trackingAvailable}
                onChange={(e) => setFormData({ ...formData, trackingAvailable: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm text-foreground">Tracking Available</span>
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              {editingProvider ? 'Update' : 'Create'} Provider
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

