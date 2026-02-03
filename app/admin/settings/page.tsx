/**
 * Admin Settings Page - Business CRUD
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useBusinesses, useCreateBusiness, useUpdateBusiness } from '@/hooks';
import { Button, Input, Textarea, Loading } from '@/components/ui';
import { uploadImage } from '@/lib/cloudinary/utils';
import { isCloudinaryConfigured } from '@/lib/cloudinary/config';
import { cn } from '@/lib/utils/cn';
import { business, OpeningHours, DayOfWeek } from '@/types/business';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { X, Building2, Save, Settings as SettingsIcon, ArrowLeft, Menu, Upload } from 'lucide-react';
import { ImageUploadWithCrop } from '@/components/admin/ImageUploadWithCrop';
import Link from 'next/link';
import { getSettings, upsertSettings } from '@/lib/settings';
import { Settings as SettingsType, DeliveryOptions, PaymentOptions, AnalyticsOptions, StoreType } from '@/types/settings';
import { useStoreType } from '@/hooks/useStoreType';
import { DeliverySection } from './delivery-section';
import { StaffSection } from './staff-section';
import { CostControlSection } from './cost-control-section';
import { Switch } from '@/components/ui/Switch';
import { CreditCard, BarChart3, AlertCircle, Package, Calendar, ShoppingBag, Trash2, RotateCcw } from 'lucide-react';
import { resetBusinessData } from '@/lib/admin/reset-business-data';
import { useToast } from '@/components/ui';
import { getUserFriendlyMessage } from '@/lib/utils/user-messages';

export default function AdminSettingsPage() {
  const toast = useToast();
  const { currentBusiness } = useApp();
  const { data: businesses = [], isLoading: businessLoading } = useBusinesses({ limit: 1 });
  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness();
  const [activeTab, setActiveTab] = useState('business');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Settings state
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Reset data state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [appSettings, setAppSettings] = useState<Omit<SettingsType, 'id' | 'createdAt' | 'updatedAt'>>({
    delivery: {
      enabled: true,
      cost: 0,
      currency: 'MWK',
    },
    payment: {
      enabled: true,
      methods: [],
      currency: 'MWK',
      taxRate: 0,
    },
    analytics: {
      enabled: false,
      trackingId: '',
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tpin: '', // TPIN field
    // Address fields
    address: {
      id: 'main',
      label: 'Main Address',
      phone: '',
      areaOrVillage: '',
      traditionalAuthority: '',
      district: '',
      nearestTownOrTradingCentre: '',
      region: 'Central' as 'Northern' | 'Central' | 'Southern',
      country: 'Malawi' as const,
      directions: '',
      coordinates: {
        latitude: 0,
        longitude: 0,
      },
      isDefault: true,
    },
    // Contact info
    contactInfo: {
      email: '',
      phone: '',
      website: '',
      socialMedia: [] as Array<{ platform: string; url: string; icon?: string }>,
    },
    logo: '',
    banner: '',
    openingHours: {
      defaultHours: {
        openTime: '07:00',
        closeTime: '18:00',
      },
      days: {},
      holidayClosures: [],
    } as OpeningHours,
    // Refund and return policy fields
    returnDuration: 7, // Default 7 days
    // Map fields
    googleMap: '',
    mapImage: '',
    refundDuration: 3, // Default 3 days
    cancellationTime: 24, // Default 24 hours
    returnShippingPayer: 'customer' as 'customer' | 'business',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploadingMapImage, setUploadingMapImage] = useState(false);

  // Social media fields
  const [socialMedia, setSocialMedia] = useState({
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
  });

  // Sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track if we've loaded the business to prevent infinite loops
  const businessLoadedRef = useRef<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Get the current business ID
  const currentBusinessId = businesses.length > 0 ? businesses[0]?.id : currentBusiness?.id;

  // Load existing business
  const loadBusiness = useCallback(async () => {
    try {
      // Get the single business document
      const business = businesses.length > 0 ? businesses[0] : currentBusiness;
      
      if (!business) {
        setInitialLoad(false);
        return;
      }

      // Prevent reloading if we've already loaded this business
      const businessIdToLoad = business.id || null;
      if (businessLoadedRef.current === businessIdToLoad && hasLoadedRef.current) {
        setInitialLoad(false);
        return;
      }

      setInitialLoad(true);
      businessLoadedRef.current = businessIdToLoad;
      hasLoadedRef.current = true;
      setBusinessId(businessIdToLoad);
      
      // Populate form with existing data
      setFormData((prev) => ({
        name: business.name || '',
        description: business.description || '',
        tpin: business.tpin || '',
        address: business.address ? {
          ...prev.address,
          ...business.address,
          phone: business.address.phone || prev.address.phone,
        } : prev.address,
        contactInfo: business.contactInfo ? {
          ...prev.contactInfo,
          ...business.contactInfo,
          phone: business.contactInfo.phone || prev.contactInfo.phone,
        } : prev.contactInfo,
        logo: business.logo || '',
        banner: business.banner || '',
        openingHours: business.openingHours || {
          defaultHours: {
            openTime: '07:00',
            closeTime: '18:00',
          },
          days: {},
          holidayClosures: [],
        },
        returnDuration: business.returnDuration ?? 7,
        refundDuration: business.refundDuration ?? 3,
        cancellationTime: business.cancellationTime ?? 24,
        returnShippingPayer: business.returnShippingPayer || 'customer',
        googleMap: business.googleMap || '',
        mapImage: business.mapImage || '',
      }));


      // Extract social media links
      if (business.contactInfo?.socialMedia) {
        const social: { facebook: string; instagram: string; twitter: string; linkedin: string } = {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: '',
        };
        business.contactInfo.socialMedia.forEach((sm) => {
          const platform = sm.platform.toLowerCase();
          if (platform === 'facebook' || platform === 'instagram' || platform === 'twitter' || platform === 'linkedin') {
            social[platform as keyof typeof social] = sm.url;
          }
        });
        setSocialMedia(social);
      }
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setInitialLoad(false);
    }
  }, [businesses, currentBusiness]);

  // Load business only once when data is available and business ID changes
  useEffect(() => {
    if (!businessLoading && currentBusinessId && businessLoadedRef.current !== currentBusinessId) {
      loadBusiness();
    } else if (!businessLoading && !currentBusinessId && !hasLoadedRef.current) {
      setInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessLoading, currentBusinessId]);

  // Logo upload handler
  const handleLogoUpload = async (file: File): Promise<void> => {
    setUploadingLogo(true);
    try {
      const result = await uploadImage(file, 'business-logos');
      setFormData((prev) => ({ ...prev, logo: result.url }));
      setErrors((prev) => ({ ...prev, logo: '' }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      setErrors((prev) => ({ ...prev, logo: 'Failed to upload logo. Please try again.' }));
      throw error; // Re-throw the error to be handled by the ImageUploadWithCrop component
    } finally {
      setUploadingLogo(false);
    }
  };

  // Banner upload handler
  const handleBannerUpload = async (file: File): Promise<void> => {
    setUploadingBanner(true);
    try {
      const result = await uploadImage(file, 'business-banners');
      setFormData((prev) => ({ ...prev, banner: result.url }));
      setErrors((prev) => ({ ...prev, banner: '' }));
    } catch (error) {
      console.error('Error uploading banner:', error);
      setErrors((prev) => ({ ...prev, banner: 'Failed to upload banner. Please try again.' }));
      throw error; // Re-throw the error to be handled by the ImageUploadWithCrop component
    } finally {
      setUploadingBanner(false);
    }
  };

  const removeLogo = () => {
    setFormData((prev) => ({ ...prev, logo: '' }));
  };

  const removeBanner = () => {
    setFormData((prev) => ({ ...prev, banner: '' }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Business name is required';
    }
    if (!formData.contactInfo.email.trim()) {
      newErrors.email = 'Email is required';
    }
    if (!formData.address.district.trim()) {
      newErrors.district = 'District is required';
    }
    if (!formData.address.areaOrVillage.trim()) {
      newErrors.areaOrVillage = 'Area or Village is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      let logoUrl = formData.logo;
      let bannerUrl = formData.banner;

      // Upload logo if a new file was selected
      if (logoFile) {
        if (!isCloudinaryConfigured()) {
          setErrors({ logo: 'Cloudinary is not properly configured' });
          setIsSubmitting(false);
          return;
        }

        setUploadingLogo(true);
        try {
          const result = await uploadImage(logoFile, 'business');
          logoUrl = result.url;
        } catch (error) {
          console.error('Error uploading logo:', error);
          setErrors({ logo: 'Failed to upload logo. Please try again.' });
          setIsSubmitting(false);
          setUploadingLogo(false);
          return;
        } finally {
          setUploadingLogo(false);
        }
      }

      // Upload banner if a new file was selected
      if (bannerFile) {
        if (!isCloudinaryConfigured()) {
          setErrors({ banner: 'Cloudinary is not properly configured' });
          setIsSubmitting(false);
          return;
        }

        setUploadingBanner(true);
        try {
          const result = await uploadImage(bannerFile, 'business');
          bannerUrl = result.url;
        } catch (error) {
          console.error('Error uploading banner:', error);
          setErrors({ banner: 'Failed to upload banner. Please try again.' });
          setIsSubmitting(false);
          setUploadingBanner(false);
          return;
        } finally {
          setUploadingBanner(false);
        }
      }

      // Build social media array
      const socialMediaArray = [];
      if (socialMedia.facebook) {
        socialMediaArray.push({ platform: 'Facebook', url: socialMedia.facebook, icon: 'facebook' });
      }
      if (socialMedia.instagram) {
        socialMediaArray.push({ platform: 'Instagram', url: socialMedia.instagram, icon: 'instagram' });
      }
      if (socialMedia.twitter) {
        socialMediaArray.push({ platform: 'Twitter', url: socialMedia.twitter, icon: 'twitter' });
      }
      if (socialMedia.linkedin) {
        socialMediaArray.push({ platform: 'LinkedIn', url: socialMedia.linkedin, icon: 'linkedin' });
      }

      // Clean up openingHours data - remove empty days and undefined values
      const cleanedOpeningHours: OpeningHours | undefined = formData.openingHours ? {
        ...(formData.openingHours.defaultHours && {
          defaultHours: {
            openTime: formData.openingHours.defaultHours.openTime || '07:00',
            closeTime: formData.openingHours.defaultHours.closeTime || '18:00',
          },
        }),
        days: formData.openingHours.days ? Object.fromEntries(
          Object.entries(formData.openingHours.days).filter(([, dayHours]) => 
            dayHours && (dayHours.isOpen !== undefined || dayHours.openTime || dayHours.closeTime)
          )
        ) : {},
        holidayClosures: formData.openingHours.holidayClosures?.filter(date => date && date.trim() !== '') || [],
      } : undefined;

      const businessData: Omit<business, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        description: formData.description,
        tpin: formData.tpin,
        address: formData.address,
        contactInfo: {
          ...formData.contactInfo,
          socialMedia: socialMediaArray,
        },
        logo: logoUrl,
        banner: bannerUrl,
        ...(cleanedOpeningHours && { openingHours: cleanedOpeningHours }),
        returnDuration: formData.returnDuration,
        refundDuration: formData.refundDuration,
        cancellationTime: formData.cancellationTime,
        returnShippingPayer: formData.returnShippingPayer,
        googleMap: formData.googleMap || '',
        mapImage: formData.mapImage || '',
      };

      if (businessId) {
        // Update existing business
        await updateBusiness.mutateAsync({
          businessId,
          updates: businessData,
        });
        // Reset the loaded ref so we can reload if needed
        businessLoadedRef.current = null;
        hasLoadedRef.current = false;
      } else {
        // Create new business
        const id = await createBusiness.mutateAsync(businessData);
        setBusinessId(id);
        businessLoadedRef.current = id;
        hasLoadedRef.current = true;
      }

      // Reset file inputs
      setLogoFile(null);
      setBannerFile(null);
    } catch (error) {
      console.error('Error saving business:', error);
      console.error('Error details:', error instanceof Error ? error.stack : error);
      //submit: error instanceof Error ? error.message : 'Failed to save business'
      setErrors({submit:'Failed to save business' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'business', label: 'Business Information', icon: 'ℹ️' },
    { id: 'store-type', label: 'Store Type', icon: '🏪' },
    { id: 'branding', label: 'Branding', icon: '🎨' },
    { id: 'delivery', label: 'Delivery & Fees', icon: '🚚' },
    { id: 'payment', label: 'Payment Configuration', icon: '💳' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'cost-control', label: 'Cost Control', icon: '💰' },
    { id: 'staff', label: 'Staff Roles Management', icon: '👥' },
    { id: 'reset-data', label: 'Reset Data', icon: '🔄' },
  ];

  const { storeType: currentStoreType } = useStoreType();
  const [storeType, setStoreType] = useState<StoreType>(currentStoreType || StoreType.BOTH);

  // Load settings
  useEffect(() => {
    const loadAppSettings = async () => {
      try {
        setSettingsError(null);
        const existingSettings = await getSettings();
        if (existingSettings) {
          setAppSettings({
            delivery: existingSettings.delivery,
            payment: existingSettings.payment,
            analytics: existingSettings.analytics,
          });
          if (existingSettings.storeType) {
            setStoreType(existingSettings.storeType);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setSettingsError('Failed to load settings. Please try again.');
      }
    };

    loadAppSettings();
  }, []);

  const handleSaveStoreType = async () => {
    try {
      setSettingsSaving(true);
      setSettingsError(null);
      setSettingsSuccess(false);
      
      const currentSettings = await getSettings();
      const settingsToSave = currentSettings || {
        delivery: appSettings.delivery,
        payment: appSettings.payment,
        analytics: appSettings.analytics,
      };

      await upsertSettings({
        ...settingsToSave,
        storeType,
      });
      
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving store type:', error);
      const errorMessage = getUserFriendlyMessage(error instanceof Error ? error.message :' Failed to save store type. Please try again.')
      setSettingsError(errorMessage);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSettingsSaving(true);
      setSettingsError(null);
      setSettingsSuccess(false);
      await upsertSettings(appSettings);
      
      // Initialize analytics if enabled
      if (appSettings.analytics.enabled && appSettings.analytics.trackingId) {
        const { setTrackingId } = await import('@/lib/analytics/tracking');
        setTrackingId(appSettings.analytics.trackingId);
      }
      
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMessage = getUserFriendlyMessage(error instanceof Error ? error.message :' Failed to save settings. Please try again.')
      setSettingsError(errorMessage);
    } finally {
      setSettingsSaving(false);
    }
  };

  const updateDelivery = (updates: Partial<DeliveryOptions>) => {
    setAppSettings((prev) => ({
      ...prev,
      delivery: { ...prev.delivery, ...updates },
    }));
  };

  const updatePayment = (updates: Partial<PaymentOptions>) => {
    setAppSettings((prev) => ({
      ...prev,
      payment: { ...prev.payment, ...updates },
    }));
  };

  const updateAnalytics = (updates: Partial<AnalyticsOptions>) => {
    setAppSettings((prev) => ({
      ...prev,
      analytics: { ...prev.analytics, ...updates },
    }));
  };

  const handlePaymentMethodToggle = (method: string) => {
    const methods = appSettings.payment.methods || [];
    if (methods.includes(method)) {
      updatePayment({ methods: methods.filter((m) => m !== method) });
    } else {
      updatePayment({ methods: [...methods, method] });
    }
  };

  if (initialLoad || businessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "lg:col-span-1 z-50",
        sidebarOpen ? "fixed lg:relative inset-y-0 left-0 w-64 lg:w-auto" : "hidden lg:block"
      )}>
        <div className="bg-card border-r border-border p-3 sm:p-4 sticky lg:sticky overflow-y-auto top-0 h-screen flex flex-col">
          {/* GO BACK TO DASHBOARD */}
          <Link href="/admin" className="text-xs sm:text-sm flex items-center gap-2 font-bold text-text-secondary uppercase mb-3 sm:mb-4">
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-xs sm:text-sm font-bold text-text-secondary uppercase">SETTINGS</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-text-secondary hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <nav className="space-y-1 sm:space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-left transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-text-secondary hover:bg-background-secondary hover:text-foreground'
                )}
              >
                <span className="text-base sm:text-lg">{tab.icon}</span>
                <span className="text-xs sm:text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 px-4 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-text-secondary hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary hidden sm:block" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Business Settings</h1>
            </div>
          </div>
          {businessId && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-text-secondary">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="break-all">ID: {businessId}</span>
            </div>
          )}
        </div>

        {/* Store Type */}
        {activeTab === 'store-type' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Store Type Configuration</h2>
              </div>
              <Button onClick={handleSaveStoreType} disabled={settingsSaving} isLoading={settingsSaving} className="w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Store Type
              </Button>
            </div>

            {settingsError && (
              <div className="p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-sm sm:text-base">
                {settingsError}
              </div>
            )}

            {settingsSuccess && (
              <div className="p-3 sm:p-4 bg-success/20 text-success rounded-lg text-sm sm:text-base">
                Store type saved successfully! Pages will update automatically.
              </div>
            )}

            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3 sm:mb-4">
                    What does your business offer?
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    <button
                      onClick={() => setStoreType(StoreType.PRODUCTS_ONLY)}
                      className={cn(
                        'p-4 sm:p-5 md:p-6 rounded-lg border-2 transition-all text-left',
                        'hover:border-primary hover:bg-primary/5',
                        storeType === StoreType.PRODUCTS_ONLY
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background-secondary'
                      )}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                        <div>
                          <h3 className="font-semibold text-foreground text-sm sm:text-base">Products Only</h3>
                          <p className="text-[10px] sm:text-xs text-text-secondary">E-commerce store</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-text-secondary">
                        Sell physical or digital products. Products pages and orders management will be shown.
                      </p>
                    </button>

                    <button
                      onClick={() => setStoreType(StoreType.SERVICES_ONLY)}
                      className={cn(
                        'p-4 sm:p-5 md:p-6 rounded-lg border-2 transition-all text-left',
                        'hover:border-primary hover:bg-primary/5',
                        storeType === StoreType.SERVICES_ONLY
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background-secondary'
                      )}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                        <div>
                          <h3 className="font-semibold text-foreground text-sm sm:text-base">Services Only</h3>
                          <p className="text-[10px] sm:text-xs text-text-secondary">Service booking</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-text-secondary">
                        Offer services that customers can book. Services pages and bookings management will be shown.
                      </p>
                    </button>

                    <button
                      onClick={() => setStoreType(StoreType.BOTH)}
                      className={cn(
                        'p-4 sm:p-5 md:p-6 rounded-lg border-2 transition-all text-left',
                        'hover:border-primary hover:bg-primary/5',
                        storeType === StoreType.BOTH
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background-secondary'
                      )}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                        <div>
                          <h3 className="font-semibold text-foreground text-sm sm:text-base">Both</h3>
                          <p className="text-[10px] sm:text-xs text-text-secondary">Full store</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-text-secondary">
                        Sell both products and services. All pages and features will be available.
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-medium text-foreground mb-1.5 sm:mb-2 text-sm sm:text-base">Lean Manufacturing Principle</h3>
                    <p className="text-xs sm:text-sm text-text-secondary">
                     {` Based on your selection, we'll automatically hide pages and features you don't need. 
                      This keeps your admin dashboard and customer-facing site clean and focused. 
                      You can change this setting anytime.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Business Information */}
        {activeTab === 'business' && (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 md:space-y-8">
            {/* General Information */}
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 sm:mb-2">General Business Details</h2>
              <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">Update your business name, description, and contact information.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="md:col-span-2">
                  <Input
                    label="Business Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={errors.name}
                    required
                    placeholder="Your Business Name"
                  />
                </div>
                <div className="md:col-span-2">
                  <Textarea
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Describe your business"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 sm:mb-2">Contact Information</h2>
              <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">Update your business contact details.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <Input
                  label="Email"
                  type="email"
                  value={formData.contactInfo.email}
                  onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, email: e.target.value } })}
                  error={errors.email}
                  required
                  placeholder="business@example.com"
                />
                <Input
                  label="Phone"
                  value={formData.contactInfo.phone || ''}
                  onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, phone: e.target.value } })}
                  placeholder="+265 XXX XXX XXX"
                />
                <div className="md:col-span-2">
                  <Input
                    label="Website"
                    type="url"
                    value={formData.contactInfo.website || ''}
                    onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, website: e.target.value } })}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="TPIN (Taxpayer Identification Number) - Optional"
                    value={formData.tpin || ''}
                    onChange={(e) => setFormData({ ...formData, tpin: e.target.value })}
                    placeholder="Enter TPIN if applicable"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 sm:mb-2">Address Information</h2>
              <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">Update your business address details.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <Input
                  label="Area or Village"
                  value={formData.address.areaOrVillage}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, areaOrVillage: e.target.value } })}
                  error={errors.areaOrVillage}
                  required
                  placeholder="Area 25, Chilinde, etc."
                />
                <Input
                  label="District"
                  value={formData.address.district}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, district: e.target.value } })}
                  error={errors.district}
                  required
                  placeholder="Lilongwe, Blantyre, etc."
                />
                <Input
                  label="Traditional Authority (Optional)"
                  value={formData.address.traditionalAuthority || ''}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, traditionalAuthority: e.target.value } })}
                  placeholder="TA Kabudula"
                />
                <Input
                  label="Nearest Town or Trading Centre"
                  value={formData.address.nearestTownOrTradingCentre || ''}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, nearestTownOrTradingCentre: e.target.value } })}
                  placeholder="Lilongwe, Ntcheu"
                />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Region</label>
                  <select
                    value={formData.address.region}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, region: e.target.value as 'Northern' | 'Central' | 'Southern' } })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="Northern">Northern</option>
                    <option value="Central">Central</option>
                    <option value="Southern">Southern</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Textarea
                    label="Directions (Optional)"
                    value={formData.address.directions || ''}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, directions: e.target.value } })}
                    rows={3}
                    placeholder="Near TA's office, behind the market, etc."
                  />
                </div>
              </div>
            </div>

            {/* Opening Hours */}
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 sm:mb-2">Opening Hours</h2>
              <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">Configure your business operating hours. Set default hours that apply to all days, or customize hours for specific days.</p>
              
              {/* Default Hours */}
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-background-secondary rounded-lg">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">Default Hours (Applies to all days unless overridden)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <Input
                    label="Opening Time"
                    type="time"
                    value={formData.openingHours?.defaultHours?.openTime || '07:00'}
                    onChange={(e) => setFormData({
                      ...formData,
                      openingHours: {
                        ...formData.openingHours,
                        defaultHours: {
                          ...formData.openingHours?.defaultHours,
                          openTime: e.target.value,
                          closeTime: formData.openingHours?.defaultHours?.closeTime || '18:00',
                        },
                      },
                    })}
                    placeholder="07:00"
                  />
                  <Input
                    label="Closing Time"
                    type="time"
                    value={formData.openingHours?.defaultHours?.closeTime || '18:00'}
                    onChange={(e) => setFormData({
                      ...formData,
                      openingHours: {
                        ...formData.openingHours,
                        defaultHours: {
                          ...formData.openingHours?.defaultHours,
                          openTime: formData.openingHours?.defaultHours?.openTime || '07:00',
                          closeTime: e.target.value,
                        },
                      },
                    })}
                    placeholder="18:00"
                  />
                </div>
              </div>

              {/* Per-Day Configuration */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">Customize Hours by Day (Optional)</h3>
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map((day) => {
                  const dayHours = formData.openingHours?.days?.[day];
                  const isOpen = dayHours?.isOpen ?? true;
                  const openTime = dayHours?.openTime || formData.openingHours?.defaultHours?.openTime || '07:00';
                  const closeTime = dayHours?.closeTime || formData.openingHours?.defaultHours?.closeTime || '18:00';
                  const isHalfDay = dayHours?.isHalfDay || false;
                  
                  return (
                    <div key={day} className="p-3 sm:p-4 border border-border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={isOpen}
                            onChange={(checked) => {
                              const newDays = { ...formData.openingHours?.days };
                              if (checked) {
                                newDays[day] = {
                                  isOpen: true,
                                  openTime: newDays[day]?.openTime || formData.openingHours?.defaultHours?.openTime || '07:00',
                                  closeTime: newDays[day]?.closeTime || formData.openingHours?.defaultHours?.closeTime || '18:00',
                                  isHalfDay: newDays[day]?.isHalfDay || false,
                                };
                              } else {
                                newDays[day] = { isOpen: false };
                              }
                              setFormData({
                                ...formData,
                                openingHours: {
                                  ...formData.openingHours,
                                  days: newDays,
                                },
                              });
                            }}
                            label={`${day.charAt(0).toUpperCase()}${day.slice(1)}`}
                          />
                        </div>
                        {isOpen && (
                          <Switch
                            checked={isHalfDay}
                            onChange={(checked) => {
                              const newDays = { ...formData.openingHours?.days };
                              newDays[day] = {
                                ...newDays[day],
                                isOpen: true,
                                isHalfDay: checked,
                              };
                              setFormData({
                                ...formData,
                                openingHours: {
                                  ...formData.openingHours,
                                  days: newDays,
                                },
                              });
                            }}
                            label="Half Day"
                          />
                        )}
                      </div>
                      {isOpen && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-2 sm:mt-3">
                          <Input
                            label="Open Time"
                            type="time"
                            value={openTime}
                            onChange={(e) => {
                              const newDays = { ...formData.openingHours?.days };
                              newDays[day] = {
                                ...newDays[day],
                                isOpen: true,
                                openTime: e.target.value,
                                closeTime: newDays[day]?.closeTime || closeTime,
                                isHalfDay: newDays[day]?.isHalfDay || false,
                              };
                              setFormData({
                                ...formData,
                                openingHours: {
                                  ...formData.openingHours,
                                  days: newDays,
                                },
                              });
                            }}
                            disabled={!isOpen}
                          />
                          <Input
                            label="Close Time"
                            type="time"
                            value={closeTime}
                            onChange={(e) => {
                              const newDays = { ...formData.openingHours?.days };
                              newDays[day] = {
                                ...newDays[day],
                                isOpen: true,
                                openTime: newDays[day]?.openTime || openTime,
                                closeTime: e.target.value,
                                isHalfDay: newDays[day]?.isHalfDay || false,
                              };
                              setFormData({
                                ...formData,
                                openingHours: {
                                  ...formData.openingHours,
                                  days: newDays,
                                },
                              });
                            }}
                            disabled={!isOpen}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Holiday Closures */}
              <div className="mt-6 p-4 bg-background-secondary rounded-lg">
                <h3 className="text-sm font-semibold text-foreground mb-4">Holiday Closures</h3>
                <p className="text-xs text-text-secondary mb-3">Add dates when your business will be closed (format: YYYY-MM-DD)</p>
                <div className="space-y-2">
                  {(formData.openingHours?.holidayClosures || []).map((date, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => {
                          const newClosures = [...(formData.openingHours?.holidayClosures || [])];
                          newClosures[index] = e.target.value;
                          setFormData({
                            ...formData,
                            openingHours: {
                              ...formData.openingHours,
                              holidayClosures: newClosures,
                            },
                          });
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newClosures = (formData.openingHours?.holidayClosures || []).filter((_, i) => i !== index);
                          setFormData({
                            ...formData,
                            openingHours: {
                              ...formData.openingHours,
                              holidayClosures: newClosures,
                            },
                          });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        openingHours: {
                          ...formData.openingHours,
                          holidayClosures: [...(formData.openingHours?.holidayClosures || []), ''],
                        },
                      });
                    }}
                  >
                    + Add Holiday Closure
                  </Button>
                </div>
              </div>
            </div>

            {/* Refund & Return Policy Settings */}
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 sm:mb-2">Refund & Return Policy Settings</h2>
              <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">Configure return, refund, and cancellation policies for your business.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Input
                    label="Return Duration (Days)"
                    type="number"
                    value={formData.returnDuration}
                    onChange={(e) => setFormData({ ...formData, returnDuration: parseInt(e.target.value) || 7 })}
                    min={1}
                    placeholder="7"
                    helpText="Number of days customers have to return items after purchase"
                  />
                </div>
                <div>
                  <Input
                    label="Refund Processing Duration (Days)"
                    type="number"
                    value={formData.refundDuration}
                    onChange={(e) => setFormData({ ...formData, refundDuration: parseInt(e.target.value) || 3 })}
                    min={1}
                    placeholder="3"
                    helpText="Number of days it takes to process refunds"
                  />
                </div>
                <div>
                  <Input
                    label="Cancellation Time (Hours)"
                    type="number"
                    value={formData.cancellationTime}
                    onChange={(e) => setFormData({ ...formData, cancellationTime: parseInt(e.target.value) || 24 })}
                    min={1}
                    placeholder="24"
                    helpText="Hours before service/booking that cancellation is allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Who Pays for Return Shipping</label>
                  <select
                    value={formData.returnShippingPayer}
                    onChange={(e) => setFormData({ ...formData, returnShippingPayer: e.target.value as 'customer' | 'business' })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="customer">Customer</option>
                    <option value="business">Business</option>
                  </select>
                  <p className="text-xs text-text-secondary mt-1">
                    Select who is responsible for return shipping costs
                  </p>
                </div>
              </div>
            </div>

            {/* Map Settings */}
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 sm:mb-2">Map Settings</h2>
              <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">Configure map display for your contact page. You can add a Google Maps embed or upload a map image.</p>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <Textarea
                    label="Google Maps Embed Code"
                    value={formData.googleMap || ''}
                    onChange={(e) => setFormData({ ...formData, googleMap: e.target.value })}
                    rows={6}
                    placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Map Image (Alternative)</label>
                  <p className="text-xs text-text-secondary mb-2">
                    Upload a map image as an alternative if Google Maps embed is not available
                  </p>
                  <div className="flex items-center gap-4">
                    {formData.mapImage ? (
                      <div className="relative">
                        <OptimizedImage
                          src={formData.mapImage}
                          alt="Map preview"
                          width={400}
                          height={300}
                          context="detail"
                          className="rounded-lg border border-border object-cover max-w-md"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, mapImage: '' })}
                          className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (!isCloudinaryConfigured()) {
                                setErrors({ mapImage: 'Cloudinary is not properly configured' });
                                return;
                              }
                              setUploadingMapImage(true);
                              try {
                                const result = await uploadImage(file, 'business');
                                setFormData({ ...formData, mapImage: result.url });
                                setErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors.mapImage;
                                  return newErrors;
                                });
                              } catch (error) {
                                console.error('Error uploading map image:', error);
                                setErrors({ mapImage: 'Failed to upload map image. Please try again.' });
                              } finally {
                                setUploadingMapImage(false);
                              }
                            }
                          }}
                          className="hidden"
                          id="map-image-upload"
                          disabled={uploadingMapImage}
                        />
                        <label
                          htmlFor="map-image-upload"
                          className={`flex items-center gap-2 px-4 py-2 border border-border rounded-lg transition-colors ${
                            uploadingMapImage 
                              ? 'cursor-not-allowed opacity-50' 
                              : 'cursor-pointer hover:bg-background-secondary'
                          }`}
                        >
                          <Upload className="w-4 h-4" />
                          <span className="text-sm text-foreground">
                            {uploadingMapImage ? 'Uploading...' : 'Upload Map Image'}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                  {errors.mapImage && (
                    <p className="text-xs text-destructive mt-1">{errors.mapImage}</p>
                  )}
                </div>
                <div className="bg-background-secondary p-4 rounded-lg">
                  <p className="text-sm text-text-secondary">
                    <strong>Note:</strong> The contact page will display in this order:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-text-secondary mt-2 space-y-1">
                    <li>Google Maps embed (if provided)</li>
                    <li>Map image (if Google Maps is not available)</li>
                    <li>Address directions (if neither map option is available)</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
              <Button
                type="submit"
                disabled={isSubmitting || uploadingLogo || uploadingBanner}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? 'Saving...' : businessId ? 'Update Business' : 'Create Business'}
              </Button>
            </div>

            {errors.submit && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-destructive">{errors.submit}</p>
              </div>
            )}
          </form>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 sm:mb-2">Branding</h2>
              <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">Upload your business logo and banner image.</p>
              
              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Logo
                </label>
                <div className="w-32 flex flex-col items-start gap-2">
                  {typeof handleLogoUpload === 'function' && (
                  <ImageUploadWithCrop
                    variant="businessLogo"
                    onImageUpload={handleLogoUpload}
                    onRemove={removeLogo}
                    existingImageUrl={formData.logo}
                    disabled={uploadingLogo}
                    className="w-32"
                  />
                )}
                </div>
                <p className="text-xs text-text-muted">Recommended: 300x300px, PNG</p>
                {errors.logo && <p className="text-xs text-destructive">{errors.logo}</p>}
              </div>

              {/* Banner Upload */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Banner
                </label>
                <div className="w-full flex flex-col items-start gap-2">
                  {typeof handleBannerUpload === 'function' && (
                    <ImageUploadWithCrop
                      variant="businessBanner"
                      onImageUpload={handleBannerUpload}
                      onRemove={removeBanner}
                      existingImageUrl={formData.banner}
                      disabled={uploadingBanner}
                      className="w-full"
                    />
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1">Recommended: 1920x400px, PNG (landscape)</p>
                {errors.banner && <p className="text-xs text-destructive mt-1">{errors.banner}</p>}
                {uploadingBanner && <p className="text-xs text-text-secondary mt-1">Uploading banner...</p>}
              </div>
            </div>

            {/* Social Media Links */}
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1.5 sm:mb-2">Social Media Links</h2>
              <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">Connect your social media profiles to your business.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <Input
                  label="Facebook URL"
                  type="url"
                  value={socialMedia.facebook}
                  onChange={(e) => setSocialMedia({ ...socialMedia, facebook: e.target.value })}
                  placeholder="https://facebook.com/yourpage"
                />
                <Input
                  label="Instagram URL"
                  type="url"
                  value={socialMedia.instagram}
                  onChange={(e) => setSocialMedia({ ...socialMedia, instagram: e.target.value })}
                  placeholder="https://instagram.com/yourpage"
                />
                <Input
                  label="Twitter URL"
                  type="url"
                  value={socialMedia.twitter}
                  onChange={(e) => setSocialMedia({ ...socialMedia, twitter: e.target.value })}
                  placeholder="https://twitter.com/yourpage"
                />
                <Input
                  label="LinkedIn URL"
                  type="url"
                  value={socialMedia.linkedin}
                  onChange={(e) => setSocialMedia({ ...socialMedia, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/company/yourpage"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
              <Button
                type="submit"
                disabled={isSubmitting || uploadingLogo || uploadingBanner}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? 'Saving...' : 'Save Branding'}
              </Button>
            </div>

            {errors.submit && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-destructive">{errors.submit}</p>
              </div>
            )}
          </form>
        )}

        {activeTab === 'delivery' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Delivery Settings</h2>
              </div>
              <Button onClick={handleSaveSettings} disabled={settingsSaving} isLoading={settingsSaving} className="w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>

            {settingsError && (
              <div className="p-4 bg-destructive/20 text-destructive rounded-lg">
                {settingsError}
              </div>
            )}

            {settingsSuccess && (
              <div className="p-3 sm:p-4 bg-success/20 text-success rounded-lg text-sm sm:text-base">
                Settings saved successfully!
              </div>
            )}

            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6">
              <div className="space-y-3 sm:space-y-4">
                <Switch
                  checked={appSettings.delivery.enabled}
                  onChange={(checked) => updateDelivery({ enabled: checked })}
                  label="Enable Delivery"
                />
                <p className="text-xs sm:text-sm text-text-secondary">
                  When enabled, customers can select delivery options during checkout. Configure delivery providers below to set pricing by region and district.
                </p>
              </div>
            </div>

            <DeliverySection businessId={businessId || undefined} />
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Payment Settings</h2>
              </div>
              <Button onClick={handleSaveSettings} disabled={settingsSaving} isLoading={settingsSaving} className="w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>

            {settingsError && (
              <div className="p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-sm sm:text-base">
                {settingsError}
              </div>
            )}

            {settingsSuccess && (
              <div className="p-3 sm:p-4 bg-success/20 text-success rounded-lg text-sm sm:text-base">
                Settings saved successfully!
              </div>
            )}

            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <Switch
                  checked={appSettings.payment.enabled}
                  onChange={(checked) => updatePayment({ enabled: checked })}
                  label="Enable Payment Processing"
                />

                {appSettings.payment.enabled && (
                  <>
                    <Input
                      label="Currency"
                      value={appSettings.payment.currency}
                      onChange={(e) => updatePayment({ currency: e.target.value })}
                      placeholder="MWK"
                    />
                    <Input
                      label="Tax Rate (%)"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={appSettings.payment.taxRate}
                      onChange={(e) => updatePayment({ taxRate: parseFloat(e.target.value) || 0 })}
                      placeholder="16.5"
                    />

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Available Payment Methods
                      </label>
                      <div className="space-y-2">
                        {['Paychangu', 'Mobile Money', 'Bank Transfer', 'Cash on Delivery'].map((method) => (
                          <label key={method} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={appSettings.payment.methods?.includes(method) || false}
                              onChange={() => handlePaymentMethodToggle(method)}
                              className="w-4 h-4 rounded border-border"
                            />
                            <span className="text-sm text-foreground">{method}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground mb-1.5 sm:mb-2 text-sm sm:text-base">How Payment Configuration Works</h3>
                    <div className="text-xs sm:text-sm text-text-secondary space-y-1.5 sm:space-y-2">
                      <p>
                        The payment configuration controls how payments are processed throughout the application:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><strong>Currency:</strong> Sets the default currency for all transactions (default: MWK - Malawi Kwacha)</li>
                        <li><strong>Tax Rate:</strong> Automatically calculates and adds tax to order totals during checkout</li>
                        <li><strong>Payment Methods:</strong> Select which payment methods are available to customers at checkout</li>
                      </ul>
                      <div className="mt-3 space-y-2">
                        <p className="font-medium text-foreground">Payment Method Details:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li><strong>Paychangu:</strong> Integrated payment gateway supporting cards, mobile money, and bank transfers. Requires Paychangu API credentials in environment variables.</li>
                          <li><strong>Mobile Money:</strong> Direct mobile money integration (Airtel Money, TNM Mpamba)</li>
                          <li><strong>Bank Transfer:</strong> Manual bank transfer option - orders are marked as pending until payment confirmation</li>
                          <li><strong>Cash on Delivery:</strong> Payment upon delivery - available for select delivery providers</li>
                        </ul>
                      </div>
                      <div className="mt-3 p-3 bg-background rounded border border-border">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
                          <p className="text-xs">
                            <strong>Note:</strong> Paychangu requires API credentials configured in your environment variables. 
                            Other payment methods may require additional setup and integration.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Analytics Settings</h2>
              </div>
              <Button onClick={handleSaveSettings} disabled={settingsSaving} isLoading={settingsSaving} className="w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>

            {settingsError && (
              <div className="p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-sm sm:text-base">
                {settingsError}
              </div>
            )}

            {settingsSuccess && (
              <div className="p-3 sm:p-4 bg-success/20 text-success rounded-lg text-sm sm:text-base">
                Settings saved successfully!
              </div>
            )}

            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <Switch
                  checked={appSettings.analytics.enabled}
                  onChange={(checked) => updateAnalytics({ enabled: checked })}
                  label="Enable Analytics Tracking"
                />

                {appSettings.analytics.enabled && (
                  <>
                    <Input
                      label="Google Analytics Tracking ID"
                      value={appSettings.analytics.trackingId}
                      onChange={(e) => updateAnalytics({ trackingId: e.target.value })}
                      placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
                    />
                    <p className="text-xs text-text-secondary">
                      Enter your Google Analytics 4 (GA4) Measurement ID (format: G-XXXXXXXXXX) or Universal Analytics ID (format: UA-XXXXXXXXX-X)
                    </p>
                  </>
                )}
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground mb-1.5 sm:mb-2 text-sm sm:text-base">How Analytics Tracking Works</h3>
                    <div className="text-xs sm:text-sm text-text-secondary space-y-1.5 sm:space-y-2">
                      <p>
                        When enabled, the application will automatically track the following events and user interactions:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><strong>Page Views:</strong> Every page visit is tracked with page path and title</li>
                        <li><strong>E-commerce Events:</strong> Product views, add to cart, checkout initiation, and purchases</li>
                        <li><strong>User Actions:</strong> Search queries, filter usage, and category navigation</li>
                        <li><strong>Conversion Tracking:</strong> Order completions, booking confirmations, and payment success</li>
                        <li><strong>User Engagement:</strong> Time on page, scroll depth, and interaction events</li>
                      </ul>
                      <p className="mt-2">
                        All tracking is done in compliance with privacy regulations. No personally identifiable information (PII) is sent to Google Analytics. 
                        The tracking code is automatically injected into all pages when enabled.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cost-control' && (
          <CostControlSection />
        )}

        {activeTab === 'staff' && (
          <StaffSection businessId={businessId || undefined} />
        )}

        {activeTab === 'reset-data' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Reset Business Data</h2>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-destructive/20 p-4 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Warning: This Action Cannot Be Undone</h3>
                  <p className="text-xs sm:text-sm text-text-secondary mb-4">
                    Resetting business data will permanently delete all products, services, categories, and promotions from your store.
                  </p>
                </div>
              </div>

              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 sm:p-4 mb-4">
                <h4 className="font-semibold text-foreground mb-2 text-sm sm:text-base">What will be deleted:</h4>
                <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-text-secondary">
                  <li>All products/items</li>
                  <li>All services</li>
                  <li>All categories</li>
                  <li>All promotions</li>
                </ul>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4 mb-4">
                <h4 className="font-semibold text-foreground mb-2 text-sm sm:text-base">What will NOT be deleted:</h4>
                <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-text-secondary">
                  <li>Orders (transaction history)</li>
                  <li>Bookings (booking history)</li>
                  <li>Payments (financial records)</li>
                  <li>Customer accounts</li>
                  <li>Business settings and configuration</li>
                  <li>Staff/admin accounts</li>
                </ul>
              </div>

              {!showResetConfirm ? (
                <div className="space-y-4">
                  <Button
                    variant="danger"
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset Business Data
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
                    <strong>Are you absolutely sure?</strong> This will permanently delete all products, services, categories, and promotions. This action cannot be undone.
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="danger"
                      onClick={async () => {
                        setIsResetting(true);
                        try {
                          const results = await resetBusinessData();
                          toast.showSuccess(
                            `Business data reset successfully! Deleted: ${results.items} items, ${results.services} services, ${results.categories} categories, ${results.promotions} promotions.`
                          );
                          setShowResetConfirm(false);
                        } catch (error) {
                          console.error('Error resetting business data:', error);
                          const errorMessage = error instanceof Error ? error.message : 'Failed to reset business data. Please try again.';
                          toast.showError(errorMessage);
                        } finally {
                          setIsResetting(false);
                        }
                      }}
                      isLoading={isResetting}
                      disabled={isResetting}
                      className="w-full sm:w-auto"
                    >
                      {isResetting ? 'Resetting...' : 'Yes, Reset All Data'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowResetConfirm(false);
                      }}
                      disabled={isResetting}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
