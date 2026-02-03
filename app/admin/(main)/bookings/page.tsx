/**
 * Admin Bookings Management
 */

'use client';

import React, { useState } from 'react';
import { useBookings, useUpdateBooking, useCancelBooking } from '@/hooks';
import { Booking, BookingStatus } from '@/types/booking';
import { Button, Loading, Input, useToast, StatusBadge, CancellationDialog } from '@/components/ui';
import { Search, Eye, Calendar, Download, Edit } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatting';
import Link from 'next/link';
import { StoreTypeGuard } from '@/components/guards/StoreTypeGuard';
import { getUserFriendlyMessage, SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/utils/user-messages';

export default function AdminBookingsPage() {
  return (
    <StoreTypeGuard requireServices={true} redirectTo="/admin">
      <AdminBookingsPageContent />
    </StoreTypeGuard>
  );
}

function AdminBookingsPageContent() {
  const toast = useToast();
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newStatus, setNewStatus] = useState<BookingStatus | ''>('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [staffNotes, setStaffNotes] = useState('');

  // Fetch bookings with React Query
  const {
    data: items = [],
    isLoading: loading,
    error,
  } = useBookings({
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    limit: 50,
  });

  // Mutations
  const updateBooking = useUpdateBooking();
  const cancelBooking = useCancelBooking();

  // Update staff notes when booking is selected
  React.useEffect(() => {
    if (selectedBooking) {
      setStaffNotes(selectedBooking.staffNotes || '');
    }
  }, [selectedBooking?.id, selectedBooking?.staffNotes]);

  // Filter bookings by search query
  const filteredBookings = items.filter((booking) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      booking.bookingNumber.toLowerCase().includes(query) ||
      booking.customerName?.toLowerCase().includes(query) ||
      booking.customerEmail.toLowerCase().includes(query) ||
      booking.serviceName.toLowerCase().includes(query)
    );
  });


  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  const handleUpdateStatus = async () => {
    if (!selectedBooking || !newStatus) return;

    if (!selectedBooking.id) {
      toast.showError('Booking ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      await updateBooking.mutateAsync({
        bookingId: selectedBooking.id,
        updates: { status: newStatus as BookingStatus },
      });
      setSelectedBooking({ ...selectedBooking, status: newStatus as BookingStatus });
      setNewStatus('');
      toast.showSuccess(SUCCESS_MESSAGES.BOOKING_STATUS_UPDATED);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
    }
  };

  const handleCancelBookingAction = async (reason?: string) => {
    if (!selectedBooking) return;
    
    if (!selectedBooking.id) {
      toast.showError('Booking ID is missing. Please refresh the page and try again.');
      return;
    }

    if (!reason?.trim()) {
      toast.showWarning('Please provide a cancellation reason');
      return;
    }

    try {
      await cancelBooking.mutateAsync({
        bookingId: selectedBooking.id,
        reason: reason.trim(),
      });
      setSelectedBooking({
        ...selectedBooking,
        status: BookingStatus.CANCELED,
        canceledAt: new Date(),
        canceledReason: reason.trim(),
      });
      toast.showSuccess(SUCCESS_MESSAGES.BOOKING_CANCELED);
    } catch (error) {
      console.error('Error canceling booking:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
      throw error;
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedBooking) return;

    if (!selectedBooking.id) {
      toast.showError('Booking ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      await updateBooking.mutateAsync({
        bookingId: selectedBooking.id,
        updates: { staffNotes },
      });
      setSelectedBooking({ ...selectedBooking, staffNotes });
      toast.showSuccess(SUCCESS_MESSAGES.NOTES_SAVED);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.SAVE_FAILED));
    }
  };

  const handleExport = () => {
    toast.showInfo('Export functionality coming soon');
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Bookings List */}
      <div className="lg:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Bookings</h1>
          <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-text-muted" />
            <Input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
          {['all', ...Object.values(BookingStatus)].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status as BookingStatus | 'all')}
              className={cn(
                'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors capitalize whitespace-nowrap shrink-0',
                selectedStatus === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
              )}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-sm sm:text-base">
            {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        {/* Bookings Table - Desktop */}
        <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Booking #</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Service</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Date & Time</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBookings.map((booking) => {
                  const startTime = booking.timeSlot.startTime
                    ? new Date(booking.timeSlot.startTime as string)
                    : null;
                  return (
                    <tr
                      key={booking.id}
                      onClick={() => handleViewBooking(booking)}
                      className={cn(
                        'cursor-pointer hover:bg-background-secondary transition-colors',
                        selectedBooking?.id === booking.id && 'bg-primary/5'
                      )}
                    >
                      <td className="py-3 px-4 text-sm font-medium text-foreground">
                        {booking.bookingNumber}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">{booking.serviceName}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm text-foreground">{booking.customerName || 'Guest'}</p>
                          <p className="text-xs text-text-secondary">{booking.customerEmail}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary">
                        {startTime ? formatDateTime(startTime) : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-foreground">
                        {formatCurrency(booking.pricing.total, booking.pricing.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={booking.status} variant="badge" />
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-text-secondary hover:text-foreground transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bookings Cards - Mobile */}
        <div className="md:hidden space-y-3">
          {filteredBookings.map((booking) => {
            const startTime = booking.timeSlot.startTime
              ? new Date(booking.timeSlot.startTime as string)
              : null;
            return (
              <div
                key={booking.id}
                onClick={() => handleViewBooking(booking)}
                className={cn(
                  'bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow',
                  selectedBooking?.id === booking.id && 'ring-2 ring-primary'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">{booking.bookingNumber}</p>
                      <StatusBadge status={booking.status} variant="badge" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">{booking.serviceName}</p>
                    <p className="text-xs text-text-secondary mb-2">
                      {startTime ? formatDateTime(startTime) : '-'}
                    </p>
                  </div>
                  <Link
                    href={`/admin/bookings/${booking.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 text-text-secondary hover:text-foreground transition-colors shrink-0"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
                
                <div className="space-y-2 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Customer:</span>
                    <div className="text-right">
                      <p className="text-foreground font-medium">{booking.customerName || 'Guest'}</p>
                      <p className="text-text-secondary text-xs truncate max-w-[150px]">{booking.customerEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Total:</span>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(booking.pricing.total, booking.pricing.currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredBookings.length === 0 && !loading && (
          <div className="text-center py-8 sm:py-12 text-text-secondary">
            <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm sm:text-base">No bookings found</p>
          </div>
        )}
      </div>

      {/* Booking Details Sidebar */}
      {selectedBooking && (
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg border border-border p-4 sm:p-6 sticky top-4 sm:top-6 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Booking Details</h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-xl sm:text-2xl text-text-secondary hover:text-foreground leading-none w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Booking Info */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-background-secondary rounded-lg">
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Booking #:</span>
                  <span className="text-foreground font-medium">{selectedBooking.bookingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Service:</span>
                  <span className="text-foreground wrap-break-word text-right">{selectedBooking.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Date:</span>
                  <span className="text-foreground text-right">
                    {selectedBooking.timeSlot.startTime
                      ? formatDateTime(selectedBooking.timeSlot.startTime as string)
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Duration:</span>
                  <span className="text-foreground">{selectedBooking.timeSlot.duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total:</span>
                  <span className="text-foreground font-medium">
                    {formatCurrency(selectedBooking.pricing.total, selectedBooking.pricing.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Status:</span>
                  <StatusBadge status={selectedBooking.status} variant="badge" />
                </div>
              </div>
            </div>

            {/* Update Status */}
            {selectedBooking.status !== BookingStatus.COMPLETED &&
              selectedBooking.status !== BookingStatus.CANCELED &&
              selectedBooking.status !== BookingStatus.REFUNDED && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">Update Status</h3>
                  <div className="flex gap-2">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as BookingStatus)}
                      className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs sm:text-sm"
                    >
                      <option value="">Select status...</option>
                      {Object.values(BookingStatus)
                        .filter((s) => s !== selectedBooking.status)
                        .map((status) => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ')}
                          </option>
                        ))}
                    </select>
                    <Button
                      onClick={handleUpdateStatus}
                      disabled={!newStatus || updateBooking.isPending}
                      size="sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

            {/* Cancel Booking */}
            {selectedBooking.status !== BookingStatus.CANCELED &&
              selectedBooking.status !== BookingStatus.COMPLETED &&
              selectedBooking.status !== BookingStatus.REFUNDED && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">Cancel Booking</h3>
                  <Button
                    variant="danger"
                    onClick={() => setShowCancelDialog(true)}
                    className="w-full"
                    size="sm"
                  >
                    Cancel Booking
                  </Button>
                </div>
              )}

            {/* Customer Info */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">Customer Information</h3>
              <div className="text-xs sm:text-sm space-y-1">
                <p className="text-foreground">{selectedBooking.customerName || 'Guest'}</p>
                <p className="text-text-secondary wrap-break-word">{selectedBooking.customerEmail}</p>
                {selectedBooking.customerPhone && (
                  <p className="text-text-secondary">{selectedBooking.customerPhone}</p>
                )}
                {selectedBooking.customerId && (
                  <Link href={`/admin/customers?customerId=${selectedBooking.customerId}`}>
                    <Button variant="outline" size="sm" className="mt-2 w-full">
                      View Customer
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Time Slot Details */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">Time Slot</h3>
              <div className="text-xs sm:text-sm space-y-1">
                <p className="text-foreground">
                  {selectedBooking.timeSlot.startTime
                    ? formatDateTime(selectedBooking.timeSlot.startTime as string)
                    : '-'}
                </p>
                <p className="text-text-secondary">
                  Duration: {selectedBooking.timeSlot.duration} minutes
                </p>
                {selectedBooking.timeSlot.endTime && (
                  <p className="text-text-secondary">
                    Ends: {formatDateTime(selectedBooking.timeSlot.endTime as string)}
                  </p>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">Pricing</h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Base Price:</span>
                  <span className="text-foreground">
                    {formatCurrency(selectedBooking.pricing.basePrice, selectedBooking.pricing.currency)}
                  </span>
                </div>
                {selectedBooking.pricing.tax && selectedBooking.pricing.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Tax:</span>
                    <span className="text-foreground">
                      {formatCurrency(selectedBooking.pricing.tax, selectedBooking.pricing.currency)}
                    </span>
                  </div>
                )}
                {selectedBooking.pricing.discount && selectedBooking.pricing.discount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount:</span>
                    <span>
                      -{formatCurrency(selectedBooking.pricing.discount, selectedBooking.pricing.currency)}
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span className="text-foreground">Total:</span>
                    <span className="text-foreground">
                      {formatCurrency(selectedBooking.pricing.total, selectedBooking.pricing.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Staff Notes */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">Staff Notes</h3>
              <textarea
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="Add internal notes for this booking..."
                className="w-full p-2 sm:p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-xs sm:text-sm"
                rows={4}
              />
              <Button onClick={handleSaveNotes} className="w-full mt-2" size="sm">
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Dialog */}
      {selectedBooking && (
        <CancellationDialog
          isOpen={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          onConfirm={handleCancelBookingAction}
          itemType="booking"
          requireReason={true}
          isLoading={cancelBooking.isPending}
        />
      )}
    </div>
  );
}
