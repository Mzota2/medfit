
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/formatting';
import { getOptimizedImageUrl } from '@/lib/cloudinary/utils';
import { COLLECTIONS } from '@/types/collections';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Booking } from '@/types/booking';
import { Calendar, Clock, User as UserIcon, Phone, Mail, MessageSquare, Star } from 'lucide-react';
import { ReviewFormModal } from '@/components/reviews';
import { useApp } from '@/contexts/AppContext';
import { User } from 'firebase/auth';
import { PaymentConfirmation } from '@/components/confirmation';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/ui';
import { ServiceInvoice } from '@/components/invoice';
import { generateInvoiceNumber } from '@/lib/utils/invoiceUtils';
import { exportInvoicePdf } from '@/lib/exports/exports';

export default function BookConfirmedPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId');
  const txRef = searchParams.get('txRef');
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'pending' | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [showBusinessReviewPrompt, setShowBusinessReviewPrompt] = useState(false);
  const [hasDismissedBusinessReview, setHasDismissedBusinessReview] = useState(false);
  const [hasReviewedBusiness, setHasReviewedBusiness] = useState<boolean | null>(null);
  const [reviewedServices, setReviewedServices] = useState<Set<string>>(new Set());
  const [reviewType, setReviewType] = useState<'item' | 'business'>('item');
  const appContext = useApp();
  const currentBusiness = appContext.currentBusiness;
  const {user} = useAuth();
  const { clearCart } = useCart();
  const [isDownloading, setIsDownloading] = useState(false);

  // Calculate payment success status
  const isPaymentSuccessful = paymentStatus === 'success' || (!txRef && booking?.status === 'paid');

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);
  
  // Check if user has reviewed the business and show prompt if not
  useEffect(() => {
    const checkBusinessReview = async () => {
      if (!currentBusiness?.id || !user?.uid) return;
      
      try {
        const { hasUserReviewed } = await import('@/lib/reviews');
        const reviewed = await hasUserReviewed({
          userId: user.uid,
          businessId: currentBusiness.id,
          reviewType: 'business'
        });
        setHasReviewedBusiness(reviewed);
        
        // Only show the prompt if user hasn't reviewed and payment is successful
        if (isPaymentSuccessful && !reviewed) {
          const timer = setTimeout(() => {
            setShowBusinessReviewPrompt(true);
          }, 5000);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Error checking business review:', error);
        // Default to false to show the prompt if there's an error
        setHasReviewedBusiness(false);
      }
    };

    // Check if service has been reviewed
    const checkServiceReview = async () => {
      if (!user?.uid || !booking?.serviceId) return;
      
      try {
        const { hasUserReviewed } = await import('@/lib/reviews');
        const hasReviewed = await hasUserReviewed({
          userId: user.uid,
          businessId: currentBusiness?.id || '',
          reviewType: 'item',
          itemId: booking.serviceId
        });
        
        if (hasReviewed) {
          setReviewedServices(new Set([booking.serviceId]));
        }
      } catch (error) {
        console.error('Error checking service review:', error);
      }
    };
    
    if (isPaymentSuccessful && currentBusiness?.id) {
      checkBusinessReview();
      checkServiceReview();
    }
  }, [isPaymentSuccessful, currentBusiness?.id, user?.uid, booking?.serviceId]);
  
  // Clear cart when payment is successful (for cases where booking status is already paid)
  useEffect(() => {
    if (isPaymentSuccessful && !txRef && booking?.status === 'paid') {
      clearCart();
    }
  }, [isPaymentSuccessful, booking?.status, txRef, clearCart]);
  
  // Handle business review submission
  const handleBusinessReview = () => {
    setReviewType('business');
    setIsReviewModalOpen(true);
    setHasDismissedBusinessReview(true);
  };
  
  const verifyPayment = async (ref: string) => {
    try {
      const response = await fetch(`/api/payments/verify?txRef=${encodeURIComponent(ref)}`);
      const result = await response.json();
      
      if (response.ok && result.success && result.data) {
        const status = result.data.status === 'success' ? 'success' : result.data.status === 'failed' ? 'failed' : 'pending';
        setPaymentStatus(status);
        
        // Clear cart only when payment is verified as successful
        if (status === 'success') {
          clearCart();
        }
      } else {
        setPaymentStatus('pending');
        setPaymentError(result.message || 'Unable to verify payment status');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setPaymentStatus('pending');
      setPaymentError('Failed to verify payment status');
    }
  };

  const loadBooking = async () => {
    try {
      if (!bookingId) {
        setPaymentError('Booking ID is missing');
        return;
      }
      const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
      const bookingSnap = await getDoc(bookingRef);
      
      if (bookingSnap.exists()) {
        const data = bookingSnap.data();
        // Convert Firestore timestamps to Date objects
        const timeSlot = {
          ...data.timeSlot,
          startTime: data.timeSlot.startTime?.toDate ? data.timeSlot.startTime.toDate() : new Date(data.timeSlot.startTime),
          endTime: data.timeSlot.endTime?.toDate ? data.timeSlot.endTime.toDate() : new Date(data.timeSlot.endTime),
        };
        setBooking({ 
          id: bookingSnap.id, 
          ...data,
          timeSlot,
        } as Booking);
      }
    } catch (error) {
      console.error('Error loading booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTime = booking?.timeSlot.startTime instanceof Date 
    ? booking.timeSlot.startTime 
    : booking?.timeSlot.startTime ? new Date(booking.timeSlot.startTime) : null;
  const endTime = booking?.timeSlot.endTime instanceof Date 
    ? booking.timeSlot.endTime 
    : booking?.timeSlot.endTime ? new Date(booking.timeSlot.endTime) : null;
  const isPartialPayment = booking?.pricing.isPartialPayment || false;
  const remainingBalance = isPartialPayment && booking?.pricing.totalFee
    ? booking.pricing.totalFee - (booking.pricing.bookingFee || 0) + (booking.pricing.totalFee * 0.08)
    : 0;

  const handleExportReceipt = async () => {
    if (!booking) return;
    
    setIsDownloading(true);
    
    try {
      const invoiceNumber = generateInvoiceNumber(currentBusiness?.name || 'Business');
      const fileName = `service-invoice-${booking.bookingNumber || booking.id}`;

      await exportInvoicePdf({
        type: 'booking',
        booking,
        business: currentBusiness || undefined,
        invoiceNumber,
        fileName,
      });
      
      // Reset after a short delay
      setTimeout(() => {
        setIsDownloading(false);
      }, 1000);
    } catch (error) {
      console.error('Error exporting invoice:', error);
      setIsDownloading(false);
    }
  };


  return (
    <>
    <PaymentConfirmation
      txRef={txRef}
      onVerifyPayment={verifyPayment}
      paymentStatus={paymentStatus}
      paymentError={paymentError}
      setPaymentStatus={setPaymentStatus}
      setPaymentError={setPaymentError}
      loading={loading}
      loadingMessage="Loading booking details..."
      notFound={!booking}
      notFoundTitle="Booking Not Found"
      notFoundActionLabel="Return to Services"
      notFoundActionHref="/services"
      successTitle="Booking Confirmed!"
      successMessage="Thank you for your booking. Your service has been successfully reserved and payment confirmed."
      defaultStatus={booking?.status === 'paid' ? 'paid' : undefined}
      primaryAction={{
        label: 'Continue Shopping',
        href: '/services',
      }}
      secondaryAction={{
        label: 'View Booking Details',
        href: booking ? `/bookings/${booking.id}` : '/',
      }}
      tertiaryAction={{
        label: booking && !reviewedServices.has(booking.serviceId) ? 'Rate Service' : 'Service Rated',
        onClick: () => {
          if (booking && booking.serviceId) {
            setReviewType('item');
            setIsReviewModalOpen(true);
          }
        },
        disabled: !booking || reviewedServices.has(booking.serviceId)
      }}
    >
      {booking && (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
            <Button
              variant="outline"
              onClick={handleExportReceipt}
              disabled={!isPaymentSuccessful || isDownloading}
              className="w-full sm:w-auto relative"
            >
              {isDownloading ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  Downloading...
                </>
              ) : (
                'Download Service Invoice'
              )}
            </Button>
          </div>
          <div>
            {currentBusiness ? (
              <ServiceInvoice 
                booking={booking} 
                business={currentBusiness} 
                invoiceNumber={generateInvoiceNumber(currentBusiness.name)}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Business information not available for invoice generation.</p>
              </div>
            )}
          </div>

          {/* Review Prompt */}
          {isPaymentSuccessful && booking.serviceId && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    Share Your Experience
                  </h3>
                  <p className="text-sm sm:text-base text-text-secondary mb-3 sm:mb-4">
                    We&apos;d love to hear what you think about this service. Your review helps other customers make informed decisions.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReviewType('item');
                      setIsReviewModalOpen(true);
                    }}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                    Rate This Service
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Business Review Prompt */}
          {showBusinessReviewPrompt && !hasDismissedBusinessReview && currentBusiness?.id && booking && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    Share Your Experience with {currentBusiness.name}
                  </h3>
                  <p className="text-sm sm:text-base text-text-secondary mb-3 sm:mb-4">
                    We&apos;d love to hear what you think about your experience with {currentBusiness.name}. Your review helps other customers make informed decisions.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReviewType('business');
                      setIsReviewModalOpen(true);
                    }}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                    Rate This Business
                  </Button>
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </PaymentConfirmation>

    {/* Review Modal */}
    {isPaymentSuccessful && currentBusiness?.id && booking && (
      <ReviewFormModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        itemId={reviewType === 'item' ? booking.serviceId : undefined}
        businessId={currentBusiness.id}
        reviewType={reviewType}
        bookingId={booking.id}
      />
    )}
    
    {/* Business Review Prompt - Fixed Position */}
    {showBusinessReviewPrompt && !hasDismissedBusinessReview && currentBusiness?.id && booking && (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full sm:w-96 bg-card border border-border rounded-lg shadow-lg p-4 animate-fade-in-up">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-sm font-medium text-foreground">How was your experience with us?</h3>
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setHasDismissedBusinessReview(true)}
            className="text-text-secondary hover:text-foreground text-xs"
          >
            Not Now
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              handleBusinessReview();
            }}
            className="text-xs"
          >
            Leave a Review
          </Button>
        </div>
      </div>
    )}
    </>
  );
}


