/**
 * Client implementation of the Account settings page.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, useToast } from '@/components/ui';
import { Loading } from '@/components/ui/Loading';
import { getUserFriendlyMessage, ERROR_MESSAGES } from '@/lib/utils/user-messages';
import { User } from '@/types';
import { COLLECTIONS } from '@/types/collections';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import { getLoginUrl, getReturnUrl } from '@/lib/utils/redirect';
import { useDeliveryProviders } from '@/hooks/useDeliveryProviders';
import { useApp } from '@/contexts/AppContext';
import { deleteAccount } from '@/lib/auth/delete-account';

export default function SettingsPageClient() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const { currentBusiness } = useApp();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  
  // Fetch delivery providers
  const { data: deliveryProviders = [], isLoading: providersLoading } = useDeliveryProviders({
    businessId: currentBusiness?.id,
    isActive: true,
  });
  
  // Default delivery provider state
  const [selectedDefaultProviderId, setSelectedDefaultProviderId] = useState<string>('');

  // Account Information
  const [accountData, setAccountData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
  });

  // Security
  const [securityData, setSecurityData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  // 2FA disabled - requires paid Firebase tier
  // const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Billing
  const [billingData, setBillingData] = useState({
    billingAddress: '',
    paymentMethod: '',
  });

  // Delete Account
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      const returnUrl = getReturnUrl(pathname, searchParams);
      router.push(getLoginUrl(returnUrl));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, pathname, searchParams]);

  const loadUserData = async () => {
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
        setAccountData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          displayName: userData.displayName || '',
          email: user.email || '',
          phone: userData.phone || '',
        });
        setBillingData({
          billingAddress: userData.addresses?.[0]?.areaOrVillage || '',
          paymentMethod: 'Visa ending *****456', // Placeholder
        });
        
        // Set default delivery provider if available
        if (userData.preferences?.defaultDeliveryProviderId) {
          setSelectedDefaultProviderId(userData.preferences.defaultDeliveryProviderId);
        }
      } else {
        setAccountData({
          firstName: '',
          lastName: '',
          displayName: user.displayName || '',
          email: user.email || '',
          phone: '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccountInfo = async () => {
    if (!userProfile || !user) return;

    if (!userProfile.id) {
      toast.showError('User profile ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      const userRef = doc(db, COLLECTIONS.USERS, userProfile.id);
      
      // Create displayName from firstName and lastName if not provided
      const displayName = accountData.displayName || 
        (accountData.firstName || accountData.lastName 
          ? `${accountData.firstName} ${accountData.lastName}`.trim() 
          : undefined);
      
      await updateDoc(userRef, {
        firstName: accountData.firstName || undefined,
        lastName: accountData.lastName || undefined,
        displayName: displayName,
        phone: accountData.phone || undefined,
        updatedAt: new Date(),
      });

      // Reload user data
      await loadUserData();
      toast.showSuccess('Account information updated successfully!');
    } catch (error) {
      console.error('Error updating account:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
    }
  };

  const handleSaveSecurity = async () => {
    if (!user) return;

    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.showWarning('New passwords do not match');
      return;
    }

    if (securityData.newPassword.length < 6) {
      toast.showWarning('Password must be at least 6 characters');
      return;
    }

    try {
      // Re-authenticate user
      if (user.email) {
        const credential = EmailAuthProvider.credential(user.email, securityData.oldPassword);
        await reauthenticateWithCredential(user, credential);
      }

      // Update password
      await updatePassword(user, securityData.newPassword);

      setSecurityData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      toast.showSuccess('Password updated successfully!');
    } catch (error) {
      console.error('Error updating password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update password. Please check your old password.';
      toast.showError(getUserFriendlyMessage(error, errorMessage));
    }
  };

  const handleSaveBilling = async () => {
    if (!userProfile) return;

    if (!userProfile.id) {
      toast.showError('User profile ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      const userRef = doc(db, COLLECTIONS.USERS, userProfile.id);
      await updateDoc(userRef, {
        updatedAt: new Date(),
      });

      toast.showSuccess('Billing information updated successfully!');
    } catch (error) {
      console.error('Error updating billing:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !deleteAccountPassword) {
      toast.showWarning('Please enter your password to delete your account');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount({ password: deleteAccountPassword });
      
      // Sign out and redirect
      await logout();
      
      toast.showSuccess('Your account has been successfully deleted');
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account. Please try again.';
      toast.showError(errorMessage);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteAccountPassword('');
    }
  };

  const handleSaveDeliveryPreferences = async () => {
    if (!userProfile || !user) return;

    if (!userProfile.id) {
      toast.showError('User profile ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      const userRef = doc(db, COLLECTIONS.USERS, userProfile.id);
      
      // Update preferences with default delivery provider
      const currentPreferences = userProfile.preferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        defaultDeliveryProviderId: selectedDefaultProviderId || undefined,
      };
      
      await updateDoc(userRef, {
        preferences: updatedPreferences,
        updatedAt: new Date(),
      });

      // Reload user data
      await loadUserData();
      toast.showSuccess('Delivery preferences updated successfully!');
    } catch (error) {
      console.error('Error updating delivery preferences:', error);
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

  return (
    <div className="min-h-screen bg-background-secondary py-4 sm:py-6 lg:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6 lg:mb-8">Account Settings</h1>

        {/* Account Information */}
        <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Account Information</h2>
          <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">
            Update your profile details and personal information here.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Input
              label="First Name"
              value={accountData.firstName}
              onChange={(e) => setAccountData({ ...accountData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={accountData.lastName}
              onChange={(e) => setAccountData({ ...accountData, lastName: e.target.value })}
              required
            />
            <Input
              label="Display Name (Optional)"
              value={accountData.displayName}
              onChange={(e) => setAccountData({ ...accountData, displayName: e.target.value })}
              placeholder="Used for UI display"
            />
            <Input
              label="Email Address"
              value={accountData.email}
              disabled
            />
            <Input
              label="Phone Number"
              value={accountData.phone}
              onChange={(e) => setAccountData({ ...accountData, phone: e.target.value })}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveAccountInfo} className="w-full sm:w-auto">Save Changes</Button>
          </div>
        </section>

        {/* Shipping Addresses */}
        <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Shipping Addresses</h2>
              <p className="text-xs sm:text-sm text-text-secondary">
                Manage your delivery addresses for faster checkout
              </p>
            </div>
            <Link href="/settings/addresses" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Manage Addresses
              </Button>
            </Link>
          </div>

          {userProfile?.addresses && userProfile.addresses.length > 0 ? (
            <div className="space-y-3">
              {userProfile.addresses.map((address) => (
                <div
                  key={address.id}
                  className={`p-3 sm:p-4 border-2 rounded-lg ${
                    address.isDefault
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background-secondary'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <h3 className="font-semibold text-sm sm:text-base text-foreground">{address.label}</h3>
                        {address.isDefault && (
                          <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-text-secondary space-y-1">
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
                        {address.phone && <p className="mt-1">Phone: {address.phone}</p>}
                      </div>
                    </div>
                    <Link href={`/settings/addresses?edit=${address.id}`} className="w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-border">
                <Link href="/settings/addresses?add=true">
                  <Button variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Address
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-text-secondary mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base text-text-secondary mb-3 sm:mb-4">No addresses saved</p>
              <Link href="/settings/addresses?add=true">
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Address
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* Security */}
        <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Security</h2>
          <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">
            Manage your password
          </p>

          <div className="space-y-4 mb-6">
            <Input
              label="Old Password"
              type="password"
              value={securityData.oldPassword}
              onChange={(e) => setSecurityData({ ...securityData, oldPassword: e.target.value })}
              placeholder="Password"
            />
            <Input
              label="New Password"
              type="password"
              value={securityData.newPassword}
              onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
              placeholder="Password"
            />
            <Input
              label="Confirm Password"
              type="password"
              value={securityData.confirmPassword}
              onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
              placeholder="Password"
            />
          </div>

          {/* 2FA disabled - requires paid Firebase tier */}
          {/* 2FA toggle UI removed to stay on free tier */}

          <div className="flex justify-end">
            <Button onClick={handleSaveSecurity} className="w-full sm:w-auto">Save Changes</Button>
          </div>
        </section>

        {/* Delivery Preferences */}
        <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Delivery Preferences</h2>
          <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">
            Set your default delivery provider for faster checkout
          </p>

          {providersLoading ? (
            <p className="text-text-secondary">Loading delivery providers...</p>
          ) : deliveryProviders.length === 0 ? (
            <p className="text-text-secondary">No delivery providers available</p>
          ) : (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Default Delivery Provider
                </label>
                <select
                  value={selectedDefaultProviderId}
                  onChange={(e) => setSelectedDefaultProviderId(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">None (select each time)</option>
                  {deliveryProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                      {provider.description && ` - ${provider.description}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-text-secondary mt-2">
                  Your selected provider will be automatically chosen during checkout
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSaveDeliveryPreferences} className="w-full sm:w-auto">Save Changes</Button>
          </div>
        </section>

        {/* Billing Information */}
        <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Billing Information</h2>
          <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">Manage your payment details</p>

          <div className="space-y-4 mb-6">
            <Input
              label="Billing Address"
              value={billingData.billingAddress}
              onChange={(e) => setBillingData({ ...billingData, billingAddress: e.target.value })}
            />
            <Input
              label="Payment Method"
              value={billingData.paymentMethod}
              onChange={(e) => setBillingData({ ...billingData, paymentMethod: e.target.value })}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveBilling} className="w-full sm:w-auto">Save Changes</Button>
          </div>
        </section>

        {/* Delete Account */}
        <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6 border border-destructive/20">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Delete Account
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">
            Once you delete your account, there is no going back. This action cannot be undone. All your data, orders, and bookings will be permanently removed.
          </p>

          {!showDeleteConfirm ? (
            <div className="space-y-4">
              <div className="bg-warning/10 border border-warning/20 text-warning px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
                <strong>Warning:</strong> This action is permanent and cannot be reversed. All your account data, order history, and booking information will be permanently deleted.
              </div>
              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full sm:w-auto"
              >
                Delete My Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
                <strong>Are you absolutely sure?</strong> This action cannot be undone. Type your password to confirm.
              </div>
              <Input
                label="Enter your password to confirm"
                type="password"
                value={deleteAccountPassword}
                onChange={(e) => setDeleteAccountPassword(e.target.value)}
                placeholder="Your password"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="danger"
                  onClick={handleDeleteAccount}
                  isLoading={isDeleting}
                  disabled={!deleteAccountPassword || isDeleting}
                  className="w-full sm:w-auto"
                >
                  {isDeleting ? 'Deleting Account...' : 'Yes, Delete My Account'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteAccountPassword('');
                  }}
                  disabled={isDeleting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


