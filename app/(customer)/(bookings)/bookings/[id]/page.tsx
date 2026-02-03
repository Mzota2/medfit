/**
 * Customer booking detail page - view individual booking details and status
 */

'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, User, Phone, Mail, CreditCard, AlertCircle } from 'lucide-react';
import { Button, Loading, useToast, StatusBadge, CancellationDialog, ExportButton } from '@/components/ui';
import { useBooking, useCancelBooking } from '@/hooks/useBookings';
import { getUserFriendlyMessage, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/utils/user-messages';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod } from '@/lib/utils/formatting';
import { getOptimizedImageUrl } from '@/lib/cloudinary/utils';
import { BookingStatus } from '@/types/booking';
import { BookingTimeline } from '@/components/timeline';
import { Timestamp } from 'firebase/firestore';

export default function CustomerBookingDetailPage() {
  const toast = useToast();
  const params = useParams();
  const bookingId = params?.id as string;
  const { currentBusiness } = useApp();
  
  const { data: booking, isLoading, error } = useBooking(bookingId);
  const cancelBookingMutation = useCancelBooking();
  
  // Real-time updates for user's own booking (critical data - user needs immediate status updates)
  useRealtimeBookings({
    customerId: booking?.customerId,
    enabled: !!booking?.customerId,
  });
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleCancelBooking = async (reason?: string) => {
    if (!bookingId) return;
    
    try {
      await cancelBookingMutation.mutateAsync({
        bookingId,
        reason: reason || undefined,
      });
      toast.showSuccess(SUCCESS_MESSAGES.BOOKING_CANCELED);
    } catch (error) {
      console.error('Error canceling booking:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
      throw error; // Re-throw so dialog doesn't close on error
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-foreground">Booking Not Found</h1>
          <p className="text-text-secondary mb-6">The booking you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
          <Link href="/profile?tab=bookings">
            <Button>Back to My Bookings</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = booking.status === BookingStatus.PENDING || booking.status === BookingStatus.PAID || booking.status === BookingStatus.CONFIRMED;
  // Handle timeSlot dates - convert Timestamps if needed
  const startTime = booking.timeSlot.startTime instanceof Timestamp
    ? booking.timeSlot.startTime.toDate()
    : booking.timeSlot.startTime instanceof Date 
    ? booking.timeSlot.startTime 
    : new Date(booking.timeSlot.startTime);
  const endTime = booking.timeSlot.endTime instanceof Timestamp
    ? booking.timeSlot.endTime.toDate()
    : booking.timeSlot.endTime instanceof Date 
    ? booking.timeSlot.endTime 
    : new Date(booking.timeSlot.endTime);
  const isPartialPayment = booking.pricing.isPartialPayment || false;
  const remainingBalance = isPartialPayment && booking.pricing.totalFee
    ? booking.pricing.totalFee - (booking.pricing.bookingFee || 0) + (booking.pricing.tax || 0)
    : 0;

  return (
    <div className="min-h-screen bg-background-secondary py-4 sm:py-6 lg:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <Link href="/profile?tab=bookings">
            <Button variant="outline" size="sm" className="mb-3 sm:mb-4 w-full sm:w-auto">
              ← Back to Bookings
            </Button>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Booking Details</h1>
              <p className="text-xs sm:text-sm text-text-secondary">Booking #{booking.bookingNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton 
                data={booking} 
                type="booking" 
                isAdmin={false}
                businessData={currentBusiness}
                className="flex-shrink-0"
              />
              <StatusBadge status={booking.status} variant="pill" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Service Details */}
            <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground">Service Details</h2>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {booking.serviceImage && (
                  <div className="relative w-full sm:w-48 md:w-56 h-48 sm:h-48 md:h-56 bg-background-secondary rounded-lg overflow-hidden shrink-0">
                    <Image
                      src={getOptimizedImageUrl(booking.serviceImage, { width: 400, height: 400, format: 'webp' })}
                      alt={booking.serviceName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 192px, 224px"
                    />
                  </div>
                )}
                <div className="grow min-w-0 flex flex-col">
                  <h3 className="font-semibold text-base sm:text-lg text-foreground mb-3 sm:mb-4">{booking.serviceName}</h3>
                  <Link href={`/services/${booking.serviceId}`} className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">View Service</Button>
                  </Link>
                </div>
              </div>
            </section>

            {/* Booking Timeline */}
            <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground">Booking Status</h2>
              <BookingTimeline
                status={booking.status}
                createdAt={booking.createdAt}
                paidAt={booking.payment?.paidAt}
                canceledAt={booking.canceledAt}
                noShowAt={booking.noShowAt}
                refundedAt={booking.refundedAt}
                completedAt={booking.status === BookingStatus.COMPLETED ? booking.updatedAt : undefined}
                timeSlot={booking.timeSlot}
              />
            </section>

            {/* Time Slot Information */}
            <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                Scheduled Time
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-text-secondary" />
                  <div>
                    <p className="text-sm text-text-secondary">Date</p>
                    <p className="font-medium text-foreground">{formatDate(startTime)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-text-secondary" />
                  <div>
                    <p className="text-sm text-text-secondary">Time</p>
                    <p className="font-medium text-foreground">
                      {formatDateTime(startTime)} - {formatDateTime(endTime)}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-border">
                  <p className="text-sm text-text-secondary">Duration</p>
                  <p className="font-medium text-foreground">{booking.timeSlot.duration} minutes</p>
                </div>
              </div>
            </section>

            {/* Customer Information */}
            <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground flex items-center gap-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                Your Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-text-secondary" />
                  <div>
                    <p className="text-sm text-text-secondary">Name</p>
                    <p className="font-medium text-foreground">{booking.customerName || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-text-secondary" />
                  <div>
                    <p className="text-sm text-text-secondary">Email</p>
                    <p className="font-medium text-foreground">{booking.customerEmail}</p>
                  </div>
                </div>
                {booking.customerPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-text-secondary" />
                    <div>
                      <p className="text-sm text-text-secondary">Phone</p>
                      <p className="font-medium text-foreground">{booking.customerPhone}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Payment Information */}
            {booking.payment && (
              <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  Payment Information
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Payment Method:</span>
                    <span className="text-foreground capitalize">{formatPaymentMethod(booking.payment.paymentMethod)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Amount Paid:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(booking.payment.amount, booking.payment.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Paid At:</span>
                    <span className="text-foreground">
                      {booking.payment.paidAt 
                        ? formatDateTime(
                            booking.payment.paidAt instanceof Timestamp 
                              ? booking.payment.paidAt.toDate() 
                              : booking.payment.paidAt instanceof Date 
                              ? booking.payment.paidAt 
                              : new Date(booking.payment.paidAt)
                          )
                        : 'N/A'}
                    </span>
                  </div>
                  {booking.payment.paymentId && (
                    <div className="flex justify-between">
                      <span className="text-sm text-text-secondary">Transaction ID:</span>
                      <span className="font-mono text-sm text-foreground">{booking.payment.paymentId}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Cancel Booking */}
            {canCancel && (
              <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground text-error">Cancel Booking</h2>
                <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4">
                  If you need to cancel this booking, please provide a reason below.
                  {booking.cancellationPolicy && (
                    <span className="block mt-2">
                      Cancellation policy: {booking.cancellationPolicy.policyText || 'Please cancel at least 24 hours before the scheduled time.'}
                    </span>
                  )}
                </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelDialog(true)}
                    className="border-error text-error hover:bg-error/10 w-full sm:w-auto"
                  >
                    Cancel Booking
                  </Button>
              </section>
            )}
          </div>

          {/* Sidebar - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6 lg:sticky lg:top-20">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground">Booking Summary</h2>
              
              <div className="space-y-3 mb-6">
                {isPartialPayment && booking.pricing.bookingFee ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Booking Fee</span>
                      <span className="text-foreground">{formatCurrency(booking.pricing.bookingFee, booking.pricing.currency)}</span>
                    </div>
                    {booking.pricing.tax && booking.pricing.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Tax</span>
                        <span className="text-foreground">{formatCurrency(booking.pricing.tax, booking.pricing.currency)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-foreground">Paid</span>
                        <span className="text-foreground">{formatCurrency(booking.pricing.total, booking.pricing.currency)}</span>
                      </div>
                    </div>
                    {remainingBalance > 0 && (
                      <div className="pt-3 border-t border-border">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">Remaining Balance</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(remainingBalance, booking.pricing.currency)}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">(To be paid later)</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Service Fee</span>
                      <span className="text-foreground">{formatCurrency(booking.pricing.basePrice, booking.pricing.currency)}</span>
                    </div>
                    {booking.pricing.discount && booking.pricing.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Discount</span>
                        <span className="text-success">-{formatCurrency(booking.pricing.discount, booking.pricing.currency)}</span>
                      </div>
                    )}
                    {booking.pricing.tax && booking.pricing.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Tax</span>
                        <span className="text-foreground">{formatCurrency(booking.pricing.tax, booking.pricing.currency)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-foreground">Total</span>
                        <span className="text-foreground">{formatCurrency(booking.pricing.total, booking.pricing.currency)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 text-sm text-text-secondary pt-4 border-t border-border">
                <div className="flex justify-between">
                  <span>Booking Date:</span>
                  <span className="text-foreground">
                    {booking.createdAt 
                      ? formatDate(
                          booking.createdAt instanceof Timestamp
                            ? booking.createdAt.toDate().toISOString()
                            : booking.createdAt instanceof Date
                            ? booking.createdAt.toISOString()
                            : booking.createdAt as string
                        )
                      : 'N/A'}
                  </span>
                </div>
                {booking.canceledAt && (
                  <div className="flex justify-between">
                    <span>Canceled:</span>
                    <span className="text-foreground">
                      {formatDate(
                        booking.canceledAt instanceof Timestamp
                          ? booking.canceledAt.toDate().toISOString()
                          : booking.canceledAt instanceof Date
                          ? booking.canceledAt.toISOString()
                          : booking.canceledAt as string
                      )}
                    </span>
                  </div>
                )}
                {booking.refundedAt && (
                  <div className="flex justify-between">
                    <span>Refunded:</span>
                    <span className="text-foreground">
                      {formatDate(
                        booking.refundedAt instanceof Timestamp
                          ? booking.refundedAt.toDate().toISOString()
                          : booking.refundedAt instanceof Date
                          ? booking.refundedAt.toISOString()
                          : booking.refundedAt as string
                      )}
                    </span>
                  </div>
                )}
              </div>

              {booking.status === BookingStatus.COMPLETED && (
                <div className="mt-6">
                  <Link href="/services">
                    <Button className="w-full" variant="outline">
                      Book Another Service
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cancellation Dialog */}
        <CancellationDialog
          isOpen={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          onConfirm={handleCancelBooking}
          itemType="booking"
          requireReason={false}
          isLoading={cancelBookingMutation.isPending}
        />
      </div>
    </div>
  );
}

