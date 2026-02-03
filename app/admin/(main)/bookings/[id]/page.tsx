/**
 * Admin booking detail page - detailed booking management
 */

'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, User, CreditCard, AlertCircle, ArrowLeft, Save } from 'lucide-react';
import { Button, Loading, Textarea, useToast, StatusBadge, CancellationDialog, statusUtils, ExportButton } from '@/components/ui';
import { useBooking, useUpdateBooking, useCancelBooking } from '@/hooks/useBookings';
import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod } from '@/lib/utils/formatting';
import { BookingStatus } from '@/types/booking';
import { BookingTimeline } from '@/components/timeline';
import { getUserFriendlyMessage, SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/utils/user-messages';
import { useApp } from '@/contexts/AppContext';
import { Timestamp } from 'firebase/firestore';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export default function AdminBookingDetailPage() {
  const toast = useToast();
  const params = useParams();
  const bookingId = params?.id as string;
  const { currentBusiness } = useApp();
  
  const { data: booking, isLoading, error } = useBooking(bookingId);
  const updateBookingMutation = useUpdateBooking();
  const cancelBookingMutation = useCancelBooking();
  
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [staffNotes, setStaffNotes] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  React.useEffect(() => {
    if (booking) {
      setStatus(booking.status);
      setStaffNotes(booking.staffNotes || '');
    }
  }, [booking]);

  const handleUpdateStatus = async () => {
    if (!booking || !status) return;

    if (!booking.id) {
      toast.showError('Booking ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      await updateBookingMutation.mutateAsync({
        bookingId: booking.id,
        updates: { status: status as BookingStatus },
      });
      setIsEditing(false);
      toast.showSuccess(SUCCESS_MESSAGES.BOOKING_STATUS_UPDATED);
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
    }
  };

  const handleSaveNotes = async () => {
    if (!booking) return;

    if (!booking.id) {
      toast.showError('Booking ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      await updateBookingMutation.mutateAsync({
        bookingId: booking.id,
        updates: { staffNotes },
      });
      toast.showSuccess(SUCCESS_MESSAGES.NOTES_SAVED);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.SAVE_FAILED));
    }
  };

  const handleCancelBooking = async (reason?: string) => {
    if (!booking) return;

    if (!booking.id) {
      toast.showError('Booking ID is missing. Please refresh the page and try again.');
      return;
    }

    if (!reason?.trim()) {
      toast.showWarning('Please provide a cancellation reason');
      return;
    }

    try {
      await cancelBookingMutation.mutateAsync({
        bookingId: booking.id,
        reason: reason.trim(),
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
          <p className="text-text-secondary mb-6">{`The booking you're looking for doesn't exist.`}</p>
          <Link href="/admin/bookings">
            <Button>Back to Bookings</Button>
          </Link>
        </div>
      </div>
    );
  }

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
  const canCancel = booking.status === BookingStatus.PENDING || booking.status === BookingStatus.PAID || booking.status === BookingStatus.CONFIRMED;

  return (
    <div className="min-h-screen bg-background-secondary py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/bookings">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Booking Details</h1>
              <p className="text-text-secondary">Booking #{booking.bookingNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton 
                data={booking} 
                type="booking" 
                isAdmin={true}
                className="flex-shrink-0"
              />
              <StatusBadge status={booking.status} variant="pill" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Details */}
            <section className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Service Details</h2>
              <div className="flex gap-4">
                {booking.serviceImage && (
                  <div className="relative w-24 h-24 bg-background-secondary rounded-lg overflow-hidden shrink-0">
                    <OptimizedImage
                      src={booking.serviceImage}
                      alt={booking.serviceName}
                      fill
                      context="card"
                      aspectRatio="square"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="grow">
                  <h3 className="font-semibold text-lg text-foreground mb-2">{booking.serviceName}</h3>
                  <Link href={`/admin/services/${booking.serviceId}`}>
                    <Button variant="outline" size="sm">View Service</Button>
                  </Link>
                </div>
              </div>
            </section>

            {/* Booking Timeline */}
            <section className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Booking Status Timeline</h2>
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
            <section className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5" />
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
            <section className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Name:</span>
                  <span className="text-foreground">{booking.customerName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Email:</span>
                  <span className="text-foreground">{booking.customerEmail}</span>
                </div>
                {booking.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Phone:</span>
                    <span className="text-foreground">{booking.customerPhone}</span>
                  </div>
                )}
                {booking.customerId && (
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Customer ID:</span>
                    <span className="text-foreground font-mono text-sm">{booking.customerId}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Payment Information */}
            {booking.payment && (
              <section className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
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
                  {isPartialPayment && remainingBalance > 0 && (
                    <div className="pt-3 border-t border-border">
                      <div className="flex justify-between">
                        <span className="text-sm text-text-secondary">Remaining Balance:</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(remainingBalance, booking.pricing.currency)}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">(To be paid later)</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Staff Notes */}
            <section className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Staff Notes</h2>
              <Textarea
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                rows={4}
                placeholder="Add internal notes about this booking..."
              />
              <Button onClick={handleSaveNotes} className="mt-3" size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save Notes
              </Button>
            </section>

            {/* Customer Notes */}
            {booking.notes && (
              <section className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground">Customer Notes</h2>
                <p className="text-text-secondary">{booking.notes}</p>
              </section>
            )}

            {/* Cancel Booking */}
            {canCancel && (
              <section className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground text-error">Cancel Booking</h2>
                <p className="text-sm text-text-secondary mb-4">
                  If you need to cancel this booking, please provide a reason below.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                  className="border-error text-error hover:bg-error/10"
                >
                  Cancel Booking
                </Button>
              </section>
            )}
          </div>

          {/* Sidebar - Booking Summary & Actions */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm p-6 sticky top-20 space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-foreground">Booking Summary</h2>
                
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
              </div>

              {/* Status Update */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">Update Status</h3>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BookingStatus)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground mb-3"
                >
                  {Object.values(BookingStatus).map((s) => (
                    <option key={s} value={s}>
                      {statusUtils.getStatusLabel(s)}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleUpdateStatus}
                  disabled={updateBookingMutation.isPending || status === booking.status}
                  isLoading={updateBookingMutation.isPending}
                  className="w-full"
                >
                  Update Status
                </Button>
              </div>

              {/* Booking Dates */}
              <div className="space-y-2 text-sm text-text-secondary pt-4 border-t border-border">
                <div className="flex justify-between">
                  <span>Booking Date:</span>
                  <span className="text-foreground">
                    {booking.createdAt ? formatDate(
                      booking.createdAt instanceof Timestamp 
                        ? booking.createdAt.toDate() 
                        : booking.createdAt instanceof Date 
                        ? booking.createdAt 
                        : new Date(booking.createdAt)
                    ) : 'N/A'}
                  </span>
                </div>
                {booking.canceledAt && (
                  <div className="flex justify-between">
                    <span>Canceled:</span>
                    <span className="text-foreground">
                      {formatDate(new Date(booking.canceledAt))}
                    </span>
                  </div>
                )}
                {booking.refundedAt && (
                  <div className="flex justify-between">
                    <span>Refunded:</span>
                    <span className="text-foreground">
                      {formatDate(new Date(booking.refundedAt))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation Dialog */}
        <CancellationDialog
          isOpen={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          onConfirm={handleCancelBooking}
          itemType="booking"
          requireReason={true}
          isLoading={cancelBookingMutation.isPending}
        />
      </div>
    </div>
  );
}

