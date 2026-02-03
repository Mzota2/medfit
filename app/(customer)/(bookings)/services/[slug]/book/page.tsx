/**
 * Service booking page with contact form, booking fee/total fee, and partial payment option
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, Mail, Phone, Calendar, Clock } from 'lucide-react';
import { Button, Input, Textarea, Loading, useToast } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { getUserFriendlyMessage, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/utils/user-messages';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { getOptimizedImageUrl } from '@/lib/cloudinary/utils';
import { Item, isService } from '@/types';
import { getItemBySlug } from '@/lib/items';
import { COLLECTIONS } from '@/types/collections';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { generateBookingNumber } from '@/lib/utils/formatting';
import { BookingStatus } from '@/types/booking';
import { extractNameFromDisplayName } from '@/lib/utils/nameExtraction';
import { getUserByUid, updateUserByUid } from '@/lib/users';
import type { User as UserType } from '@/types/user';
import { signInWithGoogle } from '@/lib/auth';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { StoreTypeGuard } from '@/components/guards/StoreTypeGuard';
import { useItemPromotion } from '@/hooks/useItemPromotion';
import { calculatePromotionPrice } from '@/lib/promotions/utils';
import { getFinalPrice } from '@/lib/utils/pricing';

interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes?: string;
}

export default function ServiceBookingPage() {
  return (
    <StoreTypeGuard requireServices={true} redirectTo="/">
      <ServiceBookingPageContent />
    </StoreTypeGuard>
  );
}

function ServiceBookingPageContent() {
  const { showError } = useToast();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { data: settings } = useSettings();
  
  const slug = params?.slug as string;
  const selectedDate = searchParams.get('date') || '';
  const selectedTimeSlot = searchParams.get('time') || '';
  const attendees = parseInt(searchParams.get('attendees') || '1');
  
  const [service, setService] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [formData, setFormData] = useState<BookingFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
  const [showOrderNotes, setShowOrderNotes] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
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
    } catch (error) {
      console.error('Error signing in with Google:', error);
      showError(getUserFriendlyMessage(error, 'Failed to sign in. Please try again.'));
    } finally {
      setIsSigningIn(false);
    }
  };
  
  // Load user profile from Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.uid) {
        try {
          const profile = await getUserByUid(user.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    };
    loadUserProfile();
  }, [user]);
  
  const loadService = async () => {
    setLoading(true);
    try {
      const item = await getItemBySlug(slug);
      if (item && isService(item)) {
        setService(item);
      } else {
        console.error('Service not found or is not a service');
        router.push('/services');
      }
    } catch (error) {
      console.error('Error loading service:', error);
      router.push('/services');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (slug) {
      loadService();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  
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
  
  useEffect(() => {
    if (!selectedDate || !selectedTimeSlot) {
      router.push(`/services/${slug}`);
    }
  }, [selectedDate, selectedTimeSlot, slug, router]);
  
  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BookingFormData, string>> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Promotion-based pricing (reuse same logic as ServiceCard for full price)
  const { promotion } = useItemPromotion(service);

  // Calculate pricing
  const basePrice = service?.pricing.basePrice || 0;
  const rawTotalFee = service?.totalFee;
  const bookingFee = service?.bookingFee || 0;
  const allowPartialPayment = service?.allowPartialPayment || false;
  const taxRate = settings?.payment?.taxRate || 0; // Percentage value (0-100), default to 0 if not set

  const promotionPrice = promotion
    ? calculatePromotionPrice(basePrice, promotion)
    : null;

  const finalPriceWithFees = getFinalPrice(
    basePrice,
    promotionPrice,
    service?.pricing.includeTransactionFee,
    service?.pricing.transactionFeeRate
  );

  // Full service fee before tax (matches ServiceCard display logic)
  const totalFee = rawTotalFee && rawTotalFee > 0 ? rawTotalFee : finalPriceWithFees;

  const finalPrice = useMemo(() => {
    if (paymentType === 'partial' && allowPartialPayment && bookingFee > 0) {
      return bookingFee;
    }
    return totalFee;
  }, [paymentType, allowPartialPayment, bookingFee, totalFee]);
  
  const tax = finalPrice * (taxRate / 100); // Convert percentage to decimal
  const total = finalPrice + tax;
  const isPartial = paymentType === 'partial' && allowPartialPayment && bookingFee > 0;
  const totalFeeTax = totalFee * (taxRate / 100); // Convert percentage to decimal
  const remainingBalance = isPartial ? totalFee - bookingFee + totalFeeTax : 0;
  
  const handlePlaceBooking = async () => {
    if (!validateForm() || !service || !selectedDate || !selectedTimeSlot) {
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
          // Don't fail booking creation if profile update fails
        }
      }
      
      // Parse time slot (format: "9:00 AM - 12:00 PM")
      const timeMatch = selectedTimeSlot.match(/(\d+):(\d+)\s*(AM|PM)/);
      if (!timeMatch) {
        throw new Error('Invalid time slot format');
      }
      
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3];
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      const startTime = new Date(`${selectedDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
      const endTime = new Date(startTime.getTime() + (service.duration || 60) * 60000);
      
      // Create booking in Firestore
      const bookingNumber = generateBookingNumber();
      const bookingData = {
        bookingNumber,
        serviceId: service.id!,
        serviceName: service.name,
        serviceImage: service.images[0]?.url,
        customerId: user?.uid || null,
        customerEmail: formData.email,
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerPhone: formData.phone,
        status: BookingStatus.PENDING,
        timeSlot: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: service.duration || 60,
        },
        pricing: {
          basePrice,
          ...(isPartial && bookingFee > 0 ? { bookingFee } : {}),
          ...(totalFee !== basePrice && totalFee > 0 ? { totalFee } : {}),
          tax,
          discount: 0,
          total,
          currency: service.pricing.currency || 'MWK',
          isPartialPayment: isPartial,
        },
        notes: formData.notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const bookingRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), bookingData);
      const bookingId = bookingRef.id;
      
      // Create payment session via API
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          amount: total,
          currency: settings?.payment?.currency || 'MWK',
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          firstName: formData.firstName,
          lastName: formData.lastName,
          metadata: {
            bookingId,
            bookingNumber,
            paymentType: paymentType,
            isPartialPayment: String(isPartial),
          },
        }),
      });
      
      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json();
        const { checkoutUrl } = paymentData.data;
        
        if (!checkoutUrl) {
          throw new Error('No checkout URL received from payment service');
        }
        
        // Redirect to Paychangu checkout page
        // User will be redirected back to return_url after payment completion
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Failed to create payment session');
      }
    } catch (error) {
      console.error('Error placing booking:', error);
      showError(getUserFriendlyMessage(error, 'Failed to place booking. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }
  
  if (!service || !selectedDate || !selectedTimeSlot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Invalid Booking</h1>
          <Link href="/services">
            <Button>Back to Services</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const serviceImage = service.images[0]?.url || '/placeholder-service.jpg';
  
  return (
    <div className="min-h-screen bg-background-secondary py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Book Service</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Booking Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Service Summary */}
            <section className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Service Details</h2>
              <div className="flex gap-4">
                <div className="relative w-24 h-24 bg-background-secondary rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={getOptimizedImageUrl(serviceImage, { width: 200, height: 200, format: 'webp' })}
                    alt={service.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-foreground mb-2">{service.name}</h3>
                  <div className="space-y-1 text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(selectedDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{selectedTimeSlot}</span>
                    </div>
                    {attendees > 1 && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{attendees} attendees</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
            
            {/* Contact Information */}
            <section className="bg-card rounded-lg shadow-sm p-6 space-y-4">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Contact Information</h2>
              {!user && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-foreground mb-3">
                    <strong>Quick booking:</strong> Sign in with Google to save time and have your details pre-filled!
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn}
                    isLoading={isSigningIn}
                    className="w-full sm:w-auto"
                  >
                    <FcGoogle className="w-5 h-5 mr-2" />
                    Sign in with Google
                  </Button>
                </div>
              )}
              {user && !hasCompleteContactInfo && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-foreground">
                    <strong>Tip:</strong> Complete your profile to save time on future bookings.{' '}
                    <Link href="/settings" className="text-primary hover:underline font-medium">
                      Update your profile
                    </Link>
                  </p>
                </div>
              )}
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
              
              {/* Notes field - optional and collapsible */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowOrderNotes(!showOrderNotes)}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary-hover transition-colors mb-2"
                >
                  {showOrderNotes ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide Additional Notes
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Add Additional Notes (Optional)
                    </>
                  )}
                </button>
                
                {showOrderNotes && (
                  <Textarea
                    label="Additional Notes (Optional)"
                    value={formData.notes || ''}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    placeholder="Any special instructions or requirements..."
                  />
                )}
              </div>
            </section>
            
            {/* Payment Options */}
            {allowPartialPayment && bookingFee > 0 && (
              <section className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground">Payment Options</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setPaymentType('full')}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                      paymentType === 'full'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border-dark'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-foreground">Pay Full Amount</h4>
                        <p className="text-sm text-text-secondary mt-1">
                          {formatCurrency(totalFee + (totalFee * (taxRate / 100)), service.pricing.currency || 'MWK')}
                        </p>
                      </div>
                      {paymentType === 'full' && (
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setPaymentType('partial')}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                      paymentType === 'partial'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border-dark'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-foreground">Pay Booking Fee Now</h4>
                        <p className="text-sm text-text-secondary mt-1">
                          {formatCurrency(bookingFee + (bookingFee * (taxRate / 100)), service.pricing.currency || 'MWK')}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                          Remaining: {formatCurrency(remainingBalance, service.pricing.currency || 'MWK')} (pay later)
                        </p>
                      </div>
                      {paymentType === 'partial' && (
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>
              </section>
            )}
            
            {/* Payment Method */}
            <section className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Payment Method</h2>
              <p className="text-sm text-text-secondary mb-4">All transactions are secure and encrypted.</p>
              <div className="p-4 bg-background-secondary rounded-lg">
                <p className="text-sm text-foreground">
                  Paychangu - Airtel Money, TNM Mpamba, Credit/Debit Card (Visa, Mastercard, Amex)
                </p>
              </div>
            </section>
          </div>
          
          {/* Right Column - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm p-6 sticky top-20">
              <h2 className="text-xl font-bold text-foreground mb-2">Booking Summary</h2>
              <p className="text-sm text-text-secondary mb-6">Review your booking and total cost.</p>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-foreground">
                  <span>Service Fee</span>
                  <span>{formatCurrency(totalFee, service.pricing.currency || 'MWK')}</span>
                </div>
                {isPartial && (
                  <div className="flex justify-between text-text-secondary text-sm">
                    <span>Booking Fee</span>
                    <span>{formatCurrency(bookingFee, service.pricing.currency || 'MWK')}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-foreground">
                    <span>Tax ({taxRate.toFixed(1)}%)</span>
                    <span>{formatCurrency(tax, service.pricing.currency || 'MWK')}</span>
                  </div>
                )}
                {isPartial && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between text-sm text-text-secondary mb-1">
                      <span>Remaining Balance</span>
                      <span>{formatCurrency(remainingBalance, service.pricing.currency || 'MWK')}</span>
                    </div>
                    <p className="text-xs text-text-secondary">(To be paid later)</p>
                  </div>
                )}
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between text-2xl font-bold text-foreground">
                    <span>Total</span>
                    <span>{formatCurrency(total, service.pricing.currency || 'MWK')}</span>
                  </div>
                  {isPartial && (
                    <p className="text-xs text-text-secondary mt-1">(Booking fee only)</p>
                  )}
                </div>
              </div>
              
              <Button
                size="lg"
                className="w-full"
                onClick={handlePlaceBooking}
                disabled={isProcessing}
                isLoading={isProcessing}
              >
                {isPartial ? 'PAY BOOKING FEE' : 'PAY NOW'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


