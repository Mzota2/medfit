/**
 * Client-side implementation of the Addresses page.
 * Contains all hooks and browser-dependent logic.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Textarea, Loading, useToast } from '@/components/ui';
import { MapPin, Plus, Edit, Trash2, StarOff, ArrowLeft } from 'lucide-react';
import { getUserFriendlyMessage, ERROR_MESSAGES } from '@/lib/utils/user-messages';
import { CustomerAddress } from '@/types/user';
import { COLLECTIONS } from '@/types/collections';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User } from '@/types';
import { MALAWI_DISTRICTS, MalawiRegion } from '@/types/delivery';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getLoginUrl, getReturnUrl } from '@/lib/utils/redirect';

interface AddressFormData {
  label: string;
  recipientName?: string;
  phone?: string;
  addressType: 'physical' | 'post_office_box';
  // Physical address fields
  areaOrVillage?: string;
  traditionalAuthority?: string;
  district: string;
  nearestTownOrTradingCentre?: string;
  region: 'Northern' | 'Central' | 'Southern';
  country: 'Malawi';
  directions?: string;
  // Post Office Box fields
  postOfficeBox?: string;
  postOfficeName?: string;
  isDefault?: boolean;
}

export default function AddressesPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    label: '',
    recipientName: '',
    phone: '',
    addressType: 'physical',
    areaOrVillage: '',
    traditionalAuthority: '',
    district: '',
    nearestTownOrTradingCentre: '',
    region: 'Central',
    country: 'Malawi',
    directions: '',
    postOfficeBox: '',
    postOfficeName: '',
    isDefault: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});

  const loadUserData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userQuery = query(
        collection(db, COLLECTIONS.USERS),
        where('uid', '==', user.uid)
      );
      const userSnap = await getDocs(userQuery);
      
      if (!userSnap.empty) {
        const userData = { id: userSnap.docs[0].id, ...userSnap.docs[0].data() } as User;
        setUserProfile(userData);
        setAddresses(userData.addresses || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      const returnUrl = getReturnUrl(pathname, searchParams);
      router.push(getLoginUrl(returnUrl));
    }
  }, [user, router, pathname, searchParams, loadUserData]);

  // Check URL params for add/edit mode
  useEffect(() => {
    const addParam = searchParams?.get('add');
    const editParam = searchParams?.get('edit');
    
    if (addParam === 'true') {
      setIsAdding(true);
      setEditingAddressId(null);
      resetForm();
    } else if (editParam) {
      setIsAdding(false);
      setEditingAddressId(editParam);
      // Load address data when editing
      if (addresses.length > 0) {
        const addressToEdit = addresses.find(addr => addr.id === editParam);
        if (addressToEdit) {
          setFormData({
            label: addressToEdit.label,
            recipientName: addressToEdit.recipientName || '',
            phone: addressToEdit.phone || '',
            addressType: addressToEdit.addressType || 'physical',
            areaOrVillage: addressToEdit.areaOrVillage || '',
            traditionalAuthority: addressToEdit.traditionalAuthority || '',
            district: addressToEdit.district,
            nearestTownOrTradingCentre: addressToEdit.nearestTownOrTradingCentre || '',
            region: addressToEdit.region,
            country: addressToEdit.country,
            directions: addressToEdit.directions || '',
            postOfficeBox: addressToEdit.postOfficeBox || '',
            postOfficeName: addressToEdit.postOfficeName || '',
            isDefault: addressToEdit.isDefault || false,
          });
        }
      }
    } else {
      setIsAdding(false);
      setEditingAddressId(null);
      resetForm();
    }
  }, [searchParams, addresses]);

  const getAvailableDistricts = (region: 'Northern' | 'Central' | 'Southern') => {
    return MALAWI_DISTRICTS[region as MalawiRegion] || [];
  };

  const handleInputChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    
    // Reset district when region changes
    if (field === 'region') {
      setFormData((prev) => ({ ...prev, district: '' }));
    }
    // Reset address-type specific fields when addressType changes
    if (field === 'addressType') {
      if (value === 'physical') {
        setFormData((prev) => ({ ...prev, postOfficeBox: '', postOfficeName: '' }));
      } else {
        setFormData((prev) => ({ ...prev, areaOrVillage: '', traditionalAuthority: '', directions: '' }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddressFormData, string>> = {};

    if (!formData.label.trim()) newErrors.label = 'Label is required';
    if (!formData.district.trim()) newErrors.district = 'District is required';
    if (!formData.region) newErrors.region = 'Region is required';

    if (formData.addressType === 'physical') {
      if (!formData.areaOrVillage?.trim()) newErrors.areaOrVillage = 'Area or Village is required for physical address';
    } else { // post_office_box
      if (!formData.postOfficeBox?.trim()) newErrors.postOfficeBox = 'Post Office Box number is required';
      if (!formData.postOfficeName?.trim()) newErrors.postOfficeName = 'Post Office Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      label: '',
      recipientName: '',
      phone: '',
      addressType: 'physical',
      areaOrVillage: '',
      traditionalAuthority: '',
      district: '',
      nearestTownOrTradingCentre: '',
      region: 'Central',
      country: 'Malawi',
      directions: '',
      postOfficeBox: '',
      postOfficeName: '',
      isDefault: false,
    });
    setErrors({});
  };

  const handleSave = async () => {
    if (!validateForm() || !userProfile || !user) return;

    if (!userProfile.id) {
      toast.showError('User profile ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      const userRef = doc(db, COLLECTIONS.USERS, userProfile.id);
      
      if (editingAddressId) {
        // Update existing address
        const updatedAddresses = addresses.map((addr) => {
          if (addr.id === editingAddressId) {
            return {
              ...formData,
              id: editingAddressId,
            } as CustomerAddress;
          }
          // If setting this as default, unset others
          if (formData.isDefault && addr.isDefault) {
            return { ...addr, isDefault: false };
          }
          return addr;
        });
        
        await updateDoc(userRef, {
          addresses: updatedAddresses,
          defaultAddressId: formData.isDefault ? editingAddressId : (userProfile.defaultAddressId === editingAddressId ? null : userProfile.defaultAddressId),
          updatedAt: new Date(),
        });
      } else {
        // Add new address
        const newAddress: CustomerAddress = {
          ...formData,
          id: `addr_${Date.now()}`,
        };
        
        // If setting as default, unset others first
        if (formData.isDefault && addresses.length > 0) {
          const addressesWithoutDefault = addresses.map((addr) => ({ ...addr, isDefault: false }));
          await updateDoc(userRef, {
            addresses: addressesWithoutDefault,
            updatedAt: new Date(),
          });
        }
        
        await updateDoc(userRef, {
          addresses: arrayUnion(newAddress),
          defaultAddressId: formData.isDefault ? newAddress.id : userProfile.defaultAddressId,
          updatedAt: new Date(),
        });
      }

      await loadUserData();
      // Navigate back to list view
      router.push('/settings/addresses');
      toast.showSuccess('Address saved successfully!');
    } catch (error) {
      console.error('Error saving address:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.SAVE_FAILED));
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!userProfile || !user) return;
    
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const addressToDelete = addresses.find((addr) => addr.id === addressId);
      if (!addressToDelete) return;

      const userRef = doc(db, COLLECTIONS.USERS, userProfile.id!);
      const updatedAddresses = addresses.filter((addr) => addr.id !== addressId);
      
      await updateDoc(userRef, {
        addresses: updatedAddresses,
        defaultAddressId: addressToDelete.isDefault ? null : userProfile.defaultAddressId,
        updatedAt: new Date(),
      });

      await loadUserData();
      toast.showSuccess('Address deleted successfully!');
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.DELETE_FAILED));
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!userProfile || !user) return;

    try {
      const userRef = doc(db, COLLECTIONS.USERS, userProfile.id!);
      const updatedAddresses = addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === addressId,
      }));
      
      await updateDoc(userRef, {
        addresses: updatedAddresses,
        defaultAddressId: addressId,
        updatedAt: new Date(),
      });

      await loadUserData();
      toast.showSuccess('Default address updated!');
    } catch (error) {
      console.error('Error setting default address:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show form view when adding or editing
  if (isAdding || editingAddressId) {
    return (
      <div className="min-h-screen bg-background-secondary py-4 sm:py-6 lg:py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 sm:mb-6">
            <Link href="/settings/addresses" className="inline-flex items-center text-sm sm:text-base text-text-secondary hover:text-foreground mb-3 sm:mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Addresses
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {editingAddressId ? 'Edit Address' : 'Add New Address'}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-2">
              {editingAddressId ? 'Update your address information' : 'Add a new delivery address'}
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <Input
                label="Label (e.g., Home, Work) *"
                value={formData.label}
                onChange={(e) => handleInputChange('label', e.target.value)}
                error={errors.label}
                placeholder="Home"
                required
              />
              
              <Input
                label="Recipient Name (Optional)"
                value={formData.recipientName || ''}
                onChange={(e) => handleInputChange('recipientName', e.target.value)}
                placeholder="Full name"
              />
              
              <Input
                label="Phone Number (Optional)"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+265..."
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Address Type *
                </label>
                <select
                  value={formData.addressType}
                  onChange={(e) => handleInputChange('addressType', e.target.value as 'physical' | 'post_office_box')}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="physical">Physical Address</option>
                  <option value="post_office_box">Post Office Box</option>
                </select>
              </div>
              
              {formData.addressType === 'physical' ? (
                <>
                  <Input
                    label="Area or Village *"
                    value={formData.areaOrVillage || ''}
                    onChange={(e) => handleInputChange('areaOrVillage', e.target.value)}
                    error={errors.areaOrVillage}
                    placeholder="Area 25, Chilinde, etc."
                    required
                  />
                  <Input
                    label="Traditional Authority (Optional)"
                    value={formData.traditionalAuthority || ''}
                    onChange={(e) => handleInputChange('traditionalAuthority', e.target.value)}
                    placeholder="TA Kabudula"
                  />
                </>
              ) : (
                <>
                  <Input
                    label="Post Office Box Number *"
                    value={formData.postOfficeBox || ''}
                    onChange={(e) => handleInputChange('postOfficeBox', e.target.value)}
                    error={errors.postOfficeBox}
                    placeholder="123"
                    required
                  />
                  <Input
                    label="Post Office Name *"
                    value={formData.postOfficeName || ''}
                    onChange={(e) => handleInputChange('postOfficeName', e.target.value)}
                    error={errors.postOfficeName}
                    placeholder="Lilongwe Post Office"
                    required
                  />
                </>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">
                    Region *
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) => handleInputChange('region', e.target.value as 'Northern' | 'Central' | 'Southern')}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Northern">Northern</option>
                    <option value="Central">Central</option>
                    <option value="Southern">Southern</option>
                  </select>
                  {errors.region && (
                    <p className="text-xs text-destructive mt-1">{errors.region}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">
                    District *
                  </label>
                  <select
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select District</option>
                    {getAvailableDistricts(formData.region).map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                  {errors.district && (
                    <p className="text-xs text-destructive mt-1">{errors.district}</p>
                  )}
                </div>
              </div>
              
              <Input
                label="Nearest Town or Trading Centre (Optional)"
                value={formData.nearestTownOrTradingCentre || ''}
                onChange={(e) => handleInputChange('nearestTownOrTradingCentre', e.target.value)}
                placeholder="Lilongwe, Ntcheu, etc."
              />
              
              {formData.addressType === 'physical' && (
                <Textarea
                  label="Directions (Optional)"
                  value={formData.directions || ''}
                  onChange={(e) => handleInputChange('directions', e.target.value)}
                  rows={3}
                  placeholder="e.g., near TA's office, behind the market"
                />
              )}
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                  className="w-4 h-4 text-primary border-border rounded"
                />
                <label htmlFor="isDefault" className="text-sm text-foreground">
                  Set as default address
                </label>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-border">
                <Link href="/settings/addresses" className="w-full sm:w-auto">
                  <Button variant="outline" type="button" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="w-full sm:w-auto">
                  {editingAddressId ? 'Update Address' : 'Add Address'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Show list view
  return (
    <div className="min-h-screen bg-background-secondary py-4 sm:py-6 lg:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">My Addresses</h1>
            <p className="text-xs sm:text-sm text-text-secondary">Manage your delivery addresses</p>
          </div>
          <Link href="/settings/addresses?add=true" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Button>
          </Link>
        </div>

        {addresses.length === 0 ? (
          <div className="bg-card rounded-lg shadow-sm p-6 sm:p-8 lg:p-12 text-center">
            <MapPin className="w-12 h-12 sm:w-16 sm:h-16 text-text-secondary mx-auto mb-3 sm:mb-4 opacity-50" />
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">No addresses saved</h2>
            <p className="text-sm sm:text-base text-text-secondary mb-4 sm:mb-6">Add your first delivery address to get started</p>
            <Link href="/settings/addresses?add=true">
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Address
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`bg-card rounded-lg shadow-sm p-4 sm:p-6 border-2 ${
                  address.isDefault ? 'border-primary' : 'border-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    <h3 className="font-semibold text-sm sm:text-base text-foreground">{address.label}</h3>
                    {address.isDefault && (
                      <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        className="p-1 text-text-secondary hover:text-primary transition-colors"
                        title="Set as default"
                      >
                        <StarOff className="w-4 h-4" />
                      </button>
                    )}
                    <Link href={`/settings/addresses?edit=${address.id}`}>
                      <button
                        className="p-1 text-text-secondary hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="p-1 text-text-secondary hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1 text-xs sm:text-sm text-text-secondary">
                  {address.recipientName && (
                    <p className="font-medium text-foreground">{address.recipientName}</p>
                  )}
                  {address.addressType === 'post_office_box' ? (
                    <>
                      <p>P.O. Box {address.postOfficeBox}</p>
                      {address.postOfficeName && <p>{address.postOfficeName}</p>}
                    </>
                  ) : (
                    <>
                      {address.areaOrVillage && <p>{address.areaOrVillage}</p>}
                      {address.traditionalAuthority && <p>{address.traditionalAuthority}</p>}
                    </>
                  )}
                  <p>{address.district}</p>
                  {address.nearestTownOrTradingCentre && (
                    <p>{address.nearestTownOrTradingCentre}</p>
                  )}
                  <p>{address.region}, {address.country}</p>
                  {address.phone && <p className="mt-2">Phone: {address.phone}</p>}
                  {address.directions && address.addressType === 'physical' && (
                    <p className="mt-2 italic text-xs">Directions: {address.directions}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


