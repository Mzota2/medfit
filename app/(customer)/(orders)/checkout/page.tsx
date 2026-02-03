/**
 * Checkout page with guest checkout, delivery/pickup, contact info, shipping, and Paychangu integration
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Home } from 'lucide-react';
import { Button, Input, Loading, Textarea, useToast } from '@/components/ui';
import { useCart, CartItem } from '@/contexts/CartContext';
import { useProduct } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { reserveInventory } from '@/lib/orders/inventory';
import { getUserFriendlyMessage, ERROR_MESSAGES } from '@/lib/utils/user-messages';
import { formatCurrency } from '@/lib/utils/formatting';
import { FulfillmentMethod } from '@/types/order';
import { COLLECTIONS } from '@/types/collections';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { generateOrderNumber } from '@/lib/utils/formatting';
import { OrderStatus } from '@/types/order';
import { Address } from '@/types/common';
import { useDeliveryProviders } from '@/hooks/useDeliveryProviders';
import { useSettings } from '@/hooks/useSettings';
import { usePromotions } from '@/hooks/usePromotions';
import { PromotionStatus } from '@/types/promotion';
import { findItemPromotion, getItemEffectivePrice } from '@/lib/promotions/cartUtils';
import { MalawiRegion, MALAWI_DISTRICTS } from '@/types/delivery';
import { extractNameFromDisplayName } from '@/lib/utils/nameExtraction';
import { getUserByUid, updateUserByUid } from '@/lib/users';
import type { User as UserType, CustomerAddress } from '@/types/user';
import Link from 'next/link';
import { signInWithGoogle } from '@/lib/auth';
import { FcGoogle } from 'react-icons/fc';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ProductImage } from '@/components/ui/OptimizedImage';


interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  // Address fields matching Address interface
  areaOrVillage: string;
  traditionalAuthority?: string;
  district: string;
  nearestTownOrTradingCentre?: string;
  region: 'Northern' | 'Central' | 'Southern';
  country: 'Malawi';
  directions?: string;
  notes?: string;
}

export default function CheckoutPage() {
  const toast = useToast();
  const router = useRouter();
  const { items, clearCart, setDirectPurchaseItem } = useCart();
  const { user } = useAuth();
  const { currentBusiness } = useApp();

  // Fetch delivery providers and settings
  const { data: deliveryProviders = [], isLoading: providersLoading } = useDeliveryProviders({
    businessId: currentBusiness?.id,
    isActive: true,
  });
  const { data: settings } = useSettings();
  
  // Fetch active promotions for price calculation
  const { data: promotions = [] } = usePromotions({
    status: PromotionStatus.ACTIVE,
  });
  
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useSavedAddress, setUseSavedAddress] = useState(true);
  const [showOptionalAddressFields, setShowOptionalAddressFields] = useState(false);
  const [showOrderNotes, setShowOrderNotes] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  // Load user profile from Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.uid) {
        try {
          const profile = await getUserByUid(user.uid);
          setUserProfile(profile);
          
          // Auto-select default address if available
          if (profile?.addresses && profile.addresses.length > 0) {
            const defaultAddress = profile.addresses.find(addr => addr.isDefault) || profile.addresses[0];
            if (defaultAddress) {
              setSelectedAddressId(defaultAddress.id);
              populateAddressForm(defaultAddress);
            }
          }
          
          // Auto-select default delivery provider if available
          if (profile?.preferences?.defaultDeliveryProviderId && deliveryProviders.length > 0) {
            const defaultProvider = deliveryProviders.find(p => p.id === profile.preferences?.defaultDeliveryProviderId);
            if (defaultProvider && defaultProvider.id) {
              setSelectedProviderId(defaultProvider.id);
            }
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    };
    loadUserProfile();
  }, [user, deliveryProviders]);
  
  // Populate form from selected address
  const populateAddressForm = (address: CustomerAddress) => {
    if (address.addressType === 'post_office_box') {
      setFormData(prev => ({
        ...prev,
        areaOrVillage: '', // Clear physical address fields
        traditionalAuthority: '',
        district: address.district,
        nearestTownOrTradingCentre: address.nearestTownOrTradingCentre || '',
        region: address.region,
        country: address.country,
        directions: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        areaOrVillage: address.areaOrVillage || '',
        traditionalAuthority: address.traditionalAuthority || '',
        district: address.district,
        nearestTownOrTradingCentre: address.nearestTownOrTradingCentre || '',
        region: address.region,
        country: address.country,
        directions: address.directions || '',
      }));
    }
  };
  
  // Handle address selection change
  useEffect(() => {
    if (selectedAddressId && userProfile?.addresses) {
      const selectedAddress = userProfile.addresses.find(addr => addr.id === selectedAddressId);
      if (selectedAddress) {
        populateAddressForm(selectedAddress);
        setUseSavedAddress(true);
      }
    }
  }, [selectedAddressId, userProfile]);
  
  // Get default names from user profile or displayName
  const getDefaultNames = () => {
    if (userProfile) {
      return {
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        phone: userProfile.phone || '',
      };
    }
    if (user?.displayName) {
      const extracted = extractNameFromDisplayName(user.displayName);
      return {
        firstName: extracted.firstName,
        lastName: extracted.lastName,
        phone: '',
      };
    }
    return { firstName: '', lastName: '', phone: '' };
  };
  
  const defaultNames = getDefaultNames();
  
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>(FulfillmentMethod.DELIVERY);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  
  // Check if user has complete contact information
  const hasCompleteContactInfo = useMemo(() => {
    if (!user || !userProfile) return false;
    return !!(userProfile.firstName && userProfile.lastName && userProfile.email && userProfile.phone);
  }, [user, userProfile]);
  
  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      // The AuthContext will update and trigger a reload of userProfile
      // Router will handle navigation after auth state changes
    } catch (error) {
      console.error('Error signing in with Google:', error);
      toast.showError(getUserFriendlyMessage(error, 'Failed to sign in. Please try again.'));
    } finally {
      setIsSigningIn(false);
    }
  };
  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: defaultNames.firstName,
    lastName: defaultNames.lastName,
    email: user?.email || '',
    phone: defaultNames.phone,
    areaOrVillage: '',
    traditionalAuthority: '',
    district: '',
    nearestTownOrTradingCentre: '',
    region: 'Central',
    country: 'Malawi',
    directions: '',
    notes: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});
  
  // Update form data when user profile changes
  useEffect(() => {
    if (!user) return;
    
    if (userProfile) {
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || userProfile.firstName || '',
        lastName: prev.lastName || userProfile.lastName || '',
        email: prev.email || user.email || '',
        phone: prev.phone || userProfile.phone || '',
      }));
    } else if (user.displayName) {
      const extracted = extractNameFromDisplayName(user.displayName);
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || extracted.firstName,
        lastName: prev.lastName || extracted.lastName,
        email: prev.email || user.email || '',
      }));
    }
  }, [userProfile, user]);

  // Get URL parameters at the top level
  const [urlParams, setUrlParams] = useState<{
    directCheckout: string | null;
    productId: string | null;
    variantId: string | null;
  }>({ directCheckout: null, productId: null, variantId: null });

  // Set URL parameters in a useEffect to ensure it only runs on the client
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUrlParams({
      directCheckout: params.get('directCheckout'),
      productId: params.get('productId'),
      variantId: params.get('variantId')
    });
  }, []);

  // Fetch product details using the useProduct hook
  const { data: directProduct, isLoading: isLoadingProduct } = useProduct(
    urlParams.directCheckout === 'true' ? urlParams.productId || '' : '',
    { enabled: urlParams.directCheckout === 'true' && !!urlParams.productId }
  );

  // Set direct purchase item when product is loaded
  useEffect(() => {
    if (urlParams.directCheckout === 'true' && directProduct) {
      setDirectPurchaseItem({
        product: directProduct,
        quantity: 1,
        variantId: urlParams.variantId || undefined
      });
      
      // Clean up URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [directProduct, urlParams]);


  // Calculate pricing with promotions (discount already applied to subtotal)
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const promotion = findItemPromotion(item.product, promotions);
      const effectivePrice = getItemEffectivePrice(item.product, promotion);
      return sum + effectivePrice * item.quantity;
    }, 0);
  }, [items, promotions]);
  
  // Calculate delivery cost based on selected provider, district, and region
  const deliveryCost = useMemo(() => {
    if (fulfillmentMethod === FulfillmentMethod.PICKUP) {
      return 0;
    }
    
    if (!selectedProviderId || !formData.district || !formData.region) {
      return 0;
    }
    
    const provider = deliveryProviders.find((p) => p.id === selectedProviderId);
    if (!provider) return 0;
    
    const { pricing } = provider;
    
    // Check district-specific pricing first (highest priority)
    if (pricing.districtPricing && pricing.districtPricing[formData.district]) {
      return pricing.districtPricing[formData.district];
    }
    
    // Check region-specific pricing
    if (pricing.regionPricing && pricing.regionPricing[formData.region as MalawiRegion]) {
      return pricing.regionPricing[formData.region as MalawiRegion];
    }
    
    // Fall back to general price
    return pricing.generalPrice || 0;
  }, [fulfillmentMethod, selectedProviderId, formData.district, formData.region, deliveryProviders]);
  
  const taxRate = settings?.payment?.taxRate || 0; // Percentage value (0-100), default to 0 if not set by admin
  const tax = subtotal * (taxRate / 100); // Convert percentage to decimal
  const total = subtotal + deliveryCost + tax; // Discount already in subtotal
  
  // Get available districts for selected region
  const availableDistricts = useMemo(() => {
    return MALAWI_DISTRICTS[formData.region as MalawiRegion] || [];
  }, [formData.region]);
  
  // Get supported payment methods
  const supportedPaymentMethods = useMemo(() => {
    return settings?.payment?.methods || [];
  }, [settings]);

  // Redirect to cart if no items and not in direct purchase mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const directCheckout = params.get('directCheckout');
    
    if (items.length === 0 && directCheckout !== 'true') {
      router.push('/cart');
    }
  }, [items, router]);

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CheckoutFormData, string>> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    
    if (fulfillmentMethod === FulfillmentMethod.DELIVERY) {
      if (!selectedProviderId) {
        newErrors.district = 'Please select a delivery provider';
      }
      // If using saved address, validate it exists; otherwise validate form fields
      if (user && selectedAddressId && userProfile?.addresses) {
        const selectedAddress = userProfile.addresses.find(addr => addr.id === selectedAddressId);
        if (!selectedAddress) {
          newErrors.district = 'Please select a valid address';
        }
      } else {
        // Validate manual address entry
        if (!formData.areaOrVillage.trim()) newErrors.areaOrVillage = 'Area or Village is required';
        if (!formData.district.trim()) newErrors.district = 'District is required';
        if (!formData.region) newErrors.region = 'Region is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    try {
      // If user is authenticated and doesn't have firstName/lastName, update their profile
      if (user?.uid && (!userProfile?.firstName || !userProfile?.lastName)) {
        try {
          const updates: Partial<UserType> = {};
          if (!userProfile?.firstName && formData.firstName) {
            updates.firstName = formData.firstName;
          }
          if (!userProfile?.lastName && formData.lastName) {
            updates.lastName = formData.lastName;
          }
          // If displayName doesn't exist, create it from firstName and lastName
          if (!userProfile?.displayName && (formData.firstName || formData.lastName)) {
            updates.displayName = `${formData.firstName} ${formData.lastName}`.trim();
          }
          if (Object.keys(updates).length > 0) {
            await updateUserByUid(user.uid, updates);
            // Reload user profile
            const updatedProfile = await getUserByUid(user.uid);
            setUserProfile(updatedProfile);
          }
        } catch (error) {
          console.error('Error updating user profile:', error);
          // Don't fail order creation if profile update fails
        }
      }
      
      // Create order in Firestore
      const orderNumber = generateOrderNumber();
      const orderData = {
        orderNumber,
        customerId: user?.uid || null,
        customerEmail: formData.email,
        customerName: `${formData.firstName} ${formData.lastName}`,
        status: OrderStatus.PENDING,
        items: items.map((item) => {
          const promotion = findItemPromotion(item.product, promotions);
          const effectivePrice = getItemEffectivePrice(item.product, promotion);
          return {
            productId: item.product.id!,
            productName: item.product.name,
            productImage: item.product.images[0]?.url,
            quantity: item.quantity,
            unitPrice: effectivePrice,
            subtotal: effectivePrice * item.quantity,
            sku: item.product.sku,
          };
        }),
        pricing: {
          subtotal,
          tax,
          shipping: deliveryCost,
          discount: 0, // Discount already applied to subtotal
          total,
          currency: settings?.payment?.currency || 'MWK',
        },
        delivery: {
          method: fulfillmentMethod,
          ...(fulfillmentMethod === FulfillmentMethod.DELIVERY && selectedProviderId ? { providerId: selectedProviderId } : {}),
          ...(fulfillmentMethod === FulfillmentMethod.DELIVERY ? {
            address: (() => {
              // Use selected saved address if available, otherwise use form data
              if (user && selectedAddressId && userProfile?.addresses) {
                const selectedAddress = userProfile.addresses.find(addr => addr.id === selectedAddressId);
                if (selectedAddress) {
                  // Convert CustomerAddress to Address format for order
                  return {
                    id: selectedAddress.id,
                    label: selectedAddress.label,
                    phone: selectedAddress.phone,
                    areaOrVillage: selectedAddress.addressType === 'post_office_box' 
                      ? `P.O. Box ${selectedAddress.postOfficeBox}${selectedAddress.postOfficeName ? `, ${selectedAddress.postOfficeName}` : ''}`
                      : (selectedAddress.areaOrVillage || ''),
                    traditionalAuthority: selectedAddress.traditionalAuthority,
                    district: selectedAddress.district,
                    nearestTownOrTradingCentre: selectedAddress.nearestTownOrTradingCentre,
                    region: selectedAddress.region,
                    country: selectedAddress.country,
                    directions: selectedAddress.directions,
                    isDefault: selectedAddress.isDefault,
                  } as Address;
                }
              }
              // Fallback to form data for new/guest addresses
              return {
                id: 'checkout-address',
                label: 'Delivery Address',
                phone: formData.phone,
                areaOrVillage: formData.areaOrVillage,
                traditionalAuthority: formData.traditionalAuthority,
                district: formData.district,
                nearestTownOrTradingCentre: formData.nearestTownOrTradingCentre,
                region: formData.region,
                country: formData.country,
                directions: formData.directions,
                isDefault: false,
              } as Address;
            })(),
          } : {}),
        },
        notes: formData.notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const orderRef = await addDoc(collection(db, COLLECTIONS.ORDERS), orderData);
      const orderId = orderRef.id;

      // Reserve inventory for the order
      try {
        await reserveInventory(orderId);
        console.log('Inventory reserved for order:', orderId);
      } catch (inventoryError) {
        console.error('Error reserving inventory:', inventoryError);
        // Don't fail the order if inventory reservation fails - we'll handle it in the payment webhook
        // But log it for monitoring
      }

      // Create payment session via API
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          amount: total,
          currency: settings?.payment?.currency || 'MWK',
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          firstName: formData.firstName,
          lastName: formData.lastName,
          metadata: {
            orderNumber,
            fulfillmentMethod,
          },
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `Payment session creation failed: ${paymentResponse.status} ${paymentResponse.statusText}`;
        throw new Error(errorMessage);
      }

      const paymentData = await paymentResponse.json();
      
      if (!paymentData.success) {
        throw new Error(paymentData.message || 'Failed to create payment session');
      }
      
      const { checkoutUrl } = paymentData.data;
      
      if (!checkoutUrl) {
        throw new Error('No checkout URL received from payment service');
      }

      // Don't clear cart here - will be cleared after payment verification is successful
      // This prevents cart loss if payment fails or user cancels
      
      // Redirect to Paychangu checkout page
      // User will be redirected back to return_url after payment completion
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error placing order:', error);
      toast.showError(getUserFriendlyMessage(error, 'Failed to place order. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return null; // Will redirect
  }

  
  // Show loading state while fetching product
  if (urlParams?.directCheckout && (isLoadingProduct || (urlParams.productId && !directProduct))) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loading/>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-secondary py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6 lg:mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Checkout Form */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Cart Review */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4 text-foreground">Your Cart ({items.length} {items.length === 1 ? 'Item' : 'Items'})</h2>
              <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4">Review and edit your selected products.</p>
              <div className="bg-card rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                {items.map((item) => {
                  const imageUrl = item.product.images[0]?.url || '/placeholder-product.jpg';
                  const promotion = findItemPromotion(item.product, promotions);
                  const effectivePrice = getItemEffectivePrice(item.product, promotion);
                  const hasDiscount = effectivePrice < item.product.pricing.basePrice;

                  return (
                    <div key={item.product.id} className="flex gap-3 sm:gap-4">
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-background-secondary rounded-lg overflow-hidden shrink-0">
                        <ProductImage
                          src={imageUrl}
                          alt={item.product.name}
                          fill
                          context="card"
                          aspectRatio="square"
                          className="object-cover"
                          sizes="(max-width: 640px) 64px, 80px"
                        />
                      </div>
                      <div className="grow min-w-0">
                        <h3 className="font-medium text-sm sm:text-base text-foreground line-clamp-2">{item.product.name}</h3>
                        <div className="flex items-baseline gap-2 flex-wrap mt-1">
                          <p className="text-sm sm:text-base text-primary font-semibold">
                            {formatCurrency(effectivePrice, item.product.pricing.currency || 'MWK')}
                          </p>
                          {hasDiscount && (
                            <p className="text-text-tertiary text-xs sm:text-sm line-through">
                              {formatCurrency(item.product.pricing.basePrice, item.product.pricing.currency || 'MWK')}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-2">
                          <span className="text-xs sm:text-sm text-text-secondary">Qty: {item.quantity}</span>
                          {hasDiscount && (
                            <span className="text-xs sm:text-sm text-success font-medium">
                              Subtotal: {formatCurrency(effectivePrice * item.quantity, item.product.pricing.currency || 'MWK')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Checkout Form */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground">
                {user ? 'Checkout' : 'Guest Checkout'}
              </h2>
              {!user && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-foreground mb-2 sm:mb-3">
                    <strong>Quick checkout:</strong> Sign in with Google to save time and have your details pre-filled!
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn}
                    isLoading={isSigningIn}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    <FcGoogle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Sign in with Google
                  </Button>
                </div>
              )}
              {user && !hasCompleteContactInfo && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-foreground">
                    <strong>Tip:</strong> Complete your profile to save time on future orders.{' '}
                    <Link href="/settings" className="text-primary hover:underline font-medium">
                      Update your profile
                    </Link>
                  </p>
                </div>
              )}
              <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4">
                {user && hasCompleteContactInfo 
                  ? 'Review your information below. All details are pre-filled from your account.' 
                  : 'Enter your contact and shipping details.'}
              </p>
              
              {/* Delivery/Pickup Selection */}
              <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6">
                <button
                  onClick={() => setFulfillmentMethod(FulfillmentMethod.DELIVERY)}
                  className={`flex-1 p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                    fulfillmentMethod === FulfillmentMethod.DELIVERY
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-border-dark text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="font-medium text-sm sm:text-base">Delivery</span>
                  </div>
                </button>
                <button
                  onClick={() => setFulfillmentMethod(FulfillmentMethod.PICKUP)}
                  className={`flex-1 p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                    fulfillmentMethod === FulfillmentMethod.PICKUP
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-border-dark text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className="font-medium text-sm sm:text-base">Pickup</span>
                  </div>
                </button>
              </div>

              {/* Contact Information */}
              <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
                <h3 className="font-semibold text-base sm:text-lg text-foreground mb-3 sm:mb-4">Contact Information</h3>
                {user && hasCompleteContactInfo ? (
                  // Show read-only contact info for logged-in users with complete info
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">First Name</label>
                        <div className="px-4 py-2 bg-background-secondary rounded-lg text-foreground border border-border">
                          {formData.firstName}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Last Name</label>
                        <div className="px-4 py-2 bg-background-secondary rounded-lg text-foreground border border-border">
                          {formData.lastName}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                        <div className="px-4 py-2 bg-background-secondary rounded-lg text-foreground border border-border">
                          {formData.email}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Phone Number</label>
                        <div className="px-4 py-2 bg-background-secondary rounded-lg text-foreground border border-border">
                          {formData.phone}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Need to update? <Link href="/settings" className="text-primary hover:underline">Edit your profile</Link>
                    </p>
                  </div>
                ) : (
                  // Show editable form for guests or users with incomplete info
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      error={errors.firstName}
                      icon={<User className="w-5 h-5" />}
                    />
                    <Input
                      label="Last Name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      error={errors.lastName}
                      icon={<User className="w-5 h-5" />}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      error={errors.email}
                      icon={<Mail className="w-5 h-5" />}
                    />
                    <Input
                      label="Phone Number"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      error={errors.phone}
                      icon={<Phone className="w-5 h-5" />}
                    />
                  </div>
                )}
              </div>

              {/* Pickup Information */}
              {fulfillmentMethod === FulfillmentMethod.PICKUP && (
                <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <h3 className="font-semibold text-base sm:text-lg text-foreground mb-3 sm:mb-4">Pickup Information</h3>
                  {currentBusiness ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-medium text-foreground mb-2">Pickup Location</h4>
                        <div className="bg-background-secondary p-3 sm:p-4 rounded-lg">
                          <p className="text-sm sm:text-base text-foreground">
                            {currentBusiness.address?.areaOrVillage}
                            {currentBusiness.address?.traditionalAuthority && `, ${currentBusiness.address.traditionalAuthority}`}
                            {currentBusiness.address?.district && `, ${currentBusiness.address.district}`}
                            {currentBusiness.address?.nearestTownOrTradingCentre && `, ${currentBusiness.address.nearestTownOrTradingCentre}`}
                            {currentBusiness.address?.region && `, ${currentBusiness.address.region}`}
                            {currentBusiness.address?.country && `, ${currentBusiness.address.country}`}
                          </p>
                          {currentBusiness.address?.directions && (
                            <p className="text-xs sm:text-sm text-text-secondary mt-2">
                              <strong>Directions:</strong> {currentBusiness.address.directions}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {currentBusiness.openingHours && (
                        <div>
                          <h4 className="text-xs sm:text-sm font-medium text-foreground mb-2">Pickup Hours</h4>
                          <div className="bg-background-secondary p-3 sm:p-4 rounded-lg">
                            {(() => {
                              const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                              const formattedHours: string[] = [];
                              
                              days.forEach((day, index) => {
                                const dayKey = day.toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
                                const dayHours = currentBusiness.openingHours?.days[dayKey];
                                
                                if (dayHours?.isOpen) {
                                  const openTime = dayHours.openTime || currentBusiness.openingHours?.defaultHours?.openTime || 'N/A';
                                  const closeTime = dayHours.closeTime || currentBusiness.openingHours?.defaultHours?.closeTime || 'N/A';
                                  formattedHours.push(`${day}: ${openTime} - ${closeTime}`);
                                } else if (dayHours && !dayHours.isOpen) {
                                  formattedHours.push(`${day}: Closed`);
                                } else if (currentBusiness.openingHours?.defaultHours) {
                                  formattedHours.push(`${day}: ${currentBusiness.openingHours.defaultHours.openTime} - ${currentBusiness.openingHours.defaultHours.closeTime}`);
                                }
                              });
                              
                              return formattedHours.length > 0 ? (
                                <ul className="space-y-1 text-sm text-foreground">
                                  {formattedHours.map((hours, idx) => (
                                    <li key={idx}>{hours}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-text-secondary">Opening hours not specified</p>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-foreground">
                          <strong>Important:</strong> Please bring a valid ID and your order confirmation when collecting your order. Orders will be held for pickup during business hours.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-text-secondary">Loading pickup information...</p>
                  )}
                </div>
              )}

              {/* Delivery Provider Selection */}
              {fulfillmentMethod === FulfillmentMethod.DELIVERY && (
                <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
                    <h3 className="font-semibold text-base sm:text-lg text-foreground">Select Delivery Provider</h3>
                    {user && !userProfile?.preferences?.defaultDeliveryProviderId && (
                      <Link
                        href="/settings"
                        className="text-xs text-primary hover:text-primary-hover transition-colors"
                      >
                        Set as default
                      </Link>
                    )}
                  </div>
                  {user && userProfile?.preferences?.defaultDeliveryProviderId && selectedProviderId === userProfile.preferences.defaultDeliveryProviderId && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-3 sm:mb-4">
                      <p className="text-xs sm:text-sm text-foreground">
                        <strong>Using your default delivery provider.</strong>{' '}
                        <Link href="/settings" className="text-primary hover:underline">Change default</Link>
                      </p>
                    </div>
                  )}
                  {providersLoading ? (
                    <p className="text-text-secondary">Loading delivery providers...</p>
                  ) : deliveryProviders.length === 0 ? (
                    <p className="text-text-secondary">No delivery providers available</p>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {deliveryProviders.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => provider.id && setSelectedProviderId(provider.id)}
                          className={`w-full p-3 sm:p-4 rounded-lg border-2 text-left transition-colors ${
                            selectedProviderId === provider.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-border-dark'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-grow min-w-0">
                              <h4 className="font-semibold text-sm sm:text-base text-foreground">{provider.name}</h4>
                              {provider.description && (
                                <p className="text-xs sm:text-sm text-text-secondary mt-1 line-clamp-2">{provider.description}</p>
                              )}
                              {selectedProviderId === provider.id && formData.district && formData.region && (
                                <p className="text-xs sm:text-sm text-primary font-medium mt-2">
                                  Delivery Cost: {formatCurrency(deliveryCost, provider.currency || 'MWK')}
                                </p>
                              )}
                            </div>
                            {selectedProviderId === provider.id && (
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Shipping Address */}
              {fulfillmentMethod === FulfillmentMethod.DELIVERY && (
                <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
                    <h3 className="font-semibold text-base sm:text-lg text-foreground">Shipping Address</h3>
                    {user && (
                      <Link
                        href="/settings/addresses"
                        className="text-xs sm:text-sm text-primary hover:text-primary-hover"
                      >
                        Manage Addresses
                      </Link>
                    )}
                  </div>
                  
                  {/* Address Selection for logged-in users */}
                  {user && userProfile?.addresses && userProfile.addresses.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Select Saved Address
                      </label>
                      <select
                        value={selectedAddressId || ''}
                        onChange={(e) => {
                          const addressId = e.target.value;
                          setSelectedAddressId(addressId || null);
                          setUseSavedAddress(!!addressId);
                        }}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                      >
                        <option value="">-- Select an address or enter new --</option>
                        {userProfile.addresses.map((address) => (
                          <option key={address.id} value={address.id}>
                            {address.label} {address.isDefault ? '(Default)' : ''} - {
                              address.addressType === 'post_office_box'
                                ? `P.O. Box ${address.postOfficeBox}, ${address.district}`
                                : `${address.areaOrVillage}, ${address.district}`
                            }
                          </option>
                        ))}
                      </select>
                      {selectedAddressId && (
                        <div className="mt-2 p-3 bg-background-secondary rounded-lg">
                          {(() => {
                            const selectedAddress = userProfile.addresses?.find(addr => addr.id === selectedAddressId);
                            if (!selectedAddress) return null;
                            return (
                              <div className="text-xs sm:text-sm text-foreground">
                                {selectedAddress.recipientName && (
                                  <p className="font-medium">{selectedAddress.recipientName}</p>
                                )}
                                {selectedAddress.addressType === 'post_office_box' ? (
                                  <>
                                    <p>P.O. Box {selectedAddress.postOfficeBox}</p>
                                    {selectedAddress.postOfficeName && <p>{selectedAddress.postOfficeName}</p>}
                                  </>
                                ) : (
                                  <>
                                    {selectedAddress.areaOrVillage && <p>{selectedAddress.areaOrVillage}</p>}
                                    {selectedAddress.traditionalAuthority && <p>{selectedAddress.traditionalAuthority}</p>}
                                  </>
                                )}
                                <p>{selectedAddress.district}</p>
                                {selectedAddress.nearestTownOrTradingCentre && (
                                  <p>{selectedAddress.nearestTownOrTradingCentre}</p>
                                )}
                                <p>{selectedAddress.region}, {selectedAddress.country}</p>
                                {selectedAddress.phone && <p className="mt-1">Phone: {selectedAddress.phone}</p>}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Manual Address Entry (shown when no address selected or for guest checkout) */}
                  {(!user || !useSavedAddress || !selectedAddressId) && (
                    <div className="space-y-4">
                      {/* Region Selection */}
                      <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Region *</label>
                    <select
                      value={formData.region}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          region: e.target.value as 'Northern' | 'Central' | 'Southern',
                          district: '', // Reset district when region changes
                        }));
                        if (errors.region) {
                          setErrors((prev) => ({ ...prev, region: undefined }));
                        }
                      }}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                    >
                      <option value="Northern">Northern</option>
                      <option value="Central">Central</option>
                      <option value="Southern">Southern</option>
                    </select>
                    {errors.region && <p className="text-sm text-destructive mt-1">{errors.region}</p>}
                  </div>

                  {/* District Selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">District *</label>
                    <select
                      value={formData.district}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, district: e.target.value }));
                        if (errors.district) {
                          setErrors((prev) => ({ ...prev, district: undefined }));
                        }
                      }}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                    >
                      <option value="">Select a district</option>
                      {availableDistricts.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                    {errors.district && <p className="text-sm text-destructive mt-1">{errors.district}</p>}
                  </div>

                  {/* Area or Village */}
                  <Input
                    label="Area or Village *"
                    value={formData.areaOrVillage}
                    onChange={(e) => handleInputChange('areaOrVillage', e.target.value)}
                    error={errors.areaOrVillage}
                    icon={<Home className="w-5 h-5" />}
                  />

                  {/* Optional Fields - Collapsible */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowOptionalAddressFields(!showOptionalAddressFields)}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary-hover transition-colors mb-2"
                    >
                      {showOptionalAddressFields ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Hide Optional Fields
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show Optional Fields
                        </>
                      )}
                    </button>
                    
                    {showOptionalAddressFields && (
                      <div className="space-y-4 pt-2">
                        {/* Traditional Authority */}
                        <Input
                          label="Traditional Authority (Optional)"
                          value={formData.traditionalAuthority || ''}
                          onChange={(e) => handleInputChange('traditionalAuthority', e.target.value)}
                        />

                        {/* Nearest Town or Trading Centre */}
                        <Input
                          label="Nearest Town or Trading Centre (Optional)"
                          value={formData.nearestTownOrTradingCentre || ''}
                          onChange={(e) => handleInputChange('nearestTownOrTradingCentre', e.target.value)}
                        />

                        {/* Directions */}
                        <Textarea
                          label="Directions (Optional)"
                          value={formData.directions || ''}
                          onChange={(e) => handleInputChange('directions', e.target.value)}
                          placeholder="e.g., near TA's office, behind the market"
                          rows={3}
                        />
                      </div>
                    )}
                  </div>

                      {/* Show delivery cost if provider and location selected */}
                      {selectedProviderId && formData.district && formData.region && deliveryCost > 0 && (
                        <div className="bg-background-secondary p-3 sm:p-4 rounded-lg">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                            <span className="font-medium text-xs sm:text-sm text-foreground">Estimated Delivery Cost:</span>
                            <span className="text-base sm:text-lg font-bold text-primary">
                              {formatCurrency(deliveryCost, deliveryProviders.find((p) => p.id === selectedProviderId)?.currency || 'MWK')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Methods */}
              <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
                <h3 className="font-semibold text-base sm:text-lg text-foreground mb-3 sm:mb-4">Payment Method</h3>
                <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4">All transactions are secure and encrypted.</p>
                
                {supportedPaymentMethods.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {supportedPaymentMethods.map((method) => (
                      <div key={method} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                        <input
                          type="radio"
                          id={`payment-${method}`}
                          name="payment-method"
                          value={method}
                          defaultChecked={method.toLowerCase().includes('paychangu')}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <label htmlFor={`payment-${method}`} className="text-sm text-foreground cursor-pointer">
                          {method}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-background-secondary rounded-lg">
                    <p className="text-sm text-text-secondary">
                      Paychangu - Airtel Money, TNM Mpamba, Credit/Debit Card (Visa, Mastercard, Amex)
                    </p>
                  </div>
                )}
                
                {/* Notes field - optional and collapsible */}
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => setShowOrderNotes(!showOrderNotes)}
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary-hover transition-colors mb-2"
                  >
                    {showOrderNotes ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide Order Notes
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Add Order Notes (Optional)
                      </>
                    )}
                  </button>
                  
                  {showOrderNotes && (
                    <Textarea
                      label="Order Notes (Optional)"
                      value={formData.notes || ''}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Any special instructions for your order..."
                      rows={3}
                    />
                  )}
                </div>
                
                <Button
                  size="lg"
                  className="w-full text-sm sm:text-base"
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  isLoading={isProcessing}
                >
                  PAY NOW
                </Button>
              </div>
            </section>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6 lg:sticky lg:top-20">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">Order Summary</h2>
              <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6">Review your items and total costs.</p>

              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div className="flex justify-between text-sm sm:text-base text-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal, 'MWK')}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base text-foreground">
                  <span>Delivery</span>
                  <span className="font-medium text-xs sm:text-sm">
                    {deliveryCost > 0 
                      ? formatCurrency(deliveryCost, deliveryProviders.find((p) => p.id === selectedProviderId)?.currency || 'MWK')
                      : 'Select location'
                    }
                  </span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm sm:text-base text-foreground">
                    <span>Tax ({taxRate.toFixed(1)}%)</span>
                    <span className="font-medium">{formatCurrency(tax, settings?.payment?.currency || 'MWK')}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 sm:pt-4">
                  <div className="flex justify-between text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(total, 'MWK')}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-text-secondary mb-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Secure Payment</span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full text-sm sm:text-base"
                onClick={handlePlaceOrder}
                disabled={isProcessing}
                isLoading={isProcessing}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Place Order
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
