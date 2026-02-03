/**
 * Admin Payments Page
 * Real-time payments management with Firebase integration
 */


'use client';

import React, { useState, useMemo } from 'react';
import { usePayments, useRealtimePayments, useOrders, useBookings } from '@/hooks';
import { PaymentSession, PaymentSessionStatus } from '@/types/payment';
import { Button, Modal, Loading } from '@/components/ui';
import { CreditCard, Download, Eye, Search, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate, formatPaymentMethod } from '@/lib/utils/formatting';
import Link from 'next/link';
import { exportPaymentReceiptPdf, exportPaymentsPdf } from '@/lib/exports/exports';
import { useApp } from '@/contexts/AppContext';

export default function AdminPaymentsPage() {
  const { currentBusiness } = useApp();
  const [selectedStatus, setSelectedStatus] = useState<PaymentSessionStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingPayment, setViewingPayment] = useState<string | null>(null);

  // Note: Payments don't have businessId, so we fetch all payments for admins
  const {
    data: items = [],
    isLoading: loading,
    error,
  } = usePayments({
    limit: 1000,
    enabled: true, // Always enabled for admins
  });

  // Real-time updates
  // Note: Payments don't have businessId, so we subscribe to all payments
  useRealtimePayments({
    limit: 1000,
    enabled: true, // Always enabled for admins
  });

  // Fetch orders and bookings for reference
  const { data: orders = [] } = useOrders({ limit: 1000 });
  const { data: bookings = [] } = useBookings({ limit: 1000 });

  const filteredPayments = useMemo(() => {
    let filtered = items;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((payment) => payment.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          payment.txRef.toLowerCase().includes(query) ||
          payment.customerName?.toLowerCase().includes(query) ||
          payment.customerEmail.toLowerCase().includes(query) ||
          payment.orderId?.toLowerCase().includes(query) ||
          payment.bookingId?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, selectedStatus, searchQuery]);

  const selectedPayment = viewingPayment ? items.find((p) => p.id === viewingPayment) : null;

  const getOrderNumber = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    return order?.orderNumber || orderId.substring(0, 8) + '...';
  };

  const getBookingNumber = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    return booking?.bookingNumber || bookingId.substring(0, 8) + '...';
  };

  const getStatusColor = (status: PaymentSessionStatus) => {
    switch (status) {
      case PaymentSessionStatus.COMPLETED:
        return 'bg-success/20 text-success';
      case PaymentSessionStatus.PENDING:
        return 'bg-warning/20 text-warning';
      case PaymentSessionStatus.FAILED:
        return 'bg-destructive/20 text-destructive';
      case PaymentSessionStatus.EXPIRED:
        return 'bg-background-secondary text-text-secondary';
      case PaymentSessionStatus.CANCELED:
        return 'bg-background-secondary text-text-secondary';
      default:
        return 'bg-background-secondary text-text-secondary';
    }
  };

  const handleExportAll = async () => {
    const fileName = `payments-${selectedStatus === 'all' ? 'all' : selectedStatus}`;
    await exportPaymentsPdf({
      payments: filteredPayments,
      fileName,
      title: selectedStatus === 'all' ? 'Payments' : `Payments (${selectedStatus})`,
      business: currentBusiness || undefined,
    });
  };

  const handleExportSingle = async (payment: PaymentSession & { id?: string }) => {
    const fileName = `payment-${payment.txRef}`;
    await exportPaymentReceiptPdf({
      payment,
      fileName,
      orderNumber: payment.orderId ? getOrderNumber(payment.orderId) : undefined,
      bookingNumber: payment.bookingId ? getBookingNumber(payment.bookingId) : undefined,
      business: currentBusiness || undefined,
    });
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            View and manage payment transactions
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleExportAll}
            disabled={filteredPayments.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-4 sm:mx-0 px-4 sm:px-0">
          <button
            onClick={() => setSelectedStatus('all')}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
              selectedStatus === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
            )}
          >
            All
          </button>
          <button
            onClick={() => setSelectedStatus(PaymentSessionStatus.COMPLETED)}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
              selectedStatus === PaymentSessionStatus.COMPLETED
                ? 'bg-primary text-primary-foreground'
                : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
            )}
          >
            Completed
          </button>
          <button
            onClick={() => setSelectedStatus(PaymentSessionStatus.PENDING)}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
              selectedStatus === PaymentSessionStatus.PENDING
                ? 'bg-primary text-primary-foreground'
                : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
            )}
          >
            Pending
          </button>
          <button
            onClick={() => setSelectedStatus(PaymentSessionStatus.FAILED)}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
              selectedStatus === PaymentSessionStatus.FAILED
                ? 'bg-primary text-primary-foreground'
                : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
            )}
          >
            Failed
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/20 text-destructive rounded-lg">
          {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      {/* Payments Table - Desktop */}
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-secondary">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Transaction Ref</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Order/Booking</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPayments.map((payment: PaymentSession & { id?: string }) => (
                <tr key={payment.id} className="hover:bg-background-secondary transition-colors">
                  <td className="py-3 px-4">
                    <code className="text-sm text-foreground font-mono">{payment.txRef}</code>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{payment.customerName || 'N/A'}</p>
                      <p className="text-xs text-text-secondary">{payment.customerEmail}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-foreground">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {payment.orderId && (
                      <Link
                        href={`/admin/orders?orderId=${payment.orderId}`}
                        className="text-primary hover:text-primary-hover flex items-center gap-1"
                      >
                        Order: {getOrderNumber(payment.orderId)}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    {payment.bookingId && (
                      <Link
                        href={`/admin/bookings?bookingId=${payment.bookingId}`}
                        className="text-primary hover:text-primary-hover flex items-center gap-1"
                      >
                        Booking: {getBookingNumber(payment.bookingId)}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    {!payment.orderId && !payment.bookingId && (
                      <span className="text-text-secondary">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(payment.status))}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-text-secondary">
                    {formatDate(
                      (payment.createdAt instanceof Date 
                        ? payment.createdAt 
                        : (payment.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(payment.createdAt as string)
                      ).toISOString()
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingPayment(payment.id!)}
                        className="p-1 text-text-secondary hover:text-foreground transition-colors"
                        title="View Details"
                        disabled={!payment.id}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setViewingPayment(payment.id!);
                        }}
                        className="p-1 text-text-secondary hover:text-foreground transition-colors"
                        title="Download Receipt"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredPayments.map((payment: PaymentSession & { id?: string }) => {
          const createdAt = payment.createdAt instanceof Date 
            ? payment.createdAt 
            : (payment.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(payment.createdAt as string);
          
          return (
            <div key={payment.id} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-primary flex-shrink-0" />
                    <code className="text-xs font-mono text-foreground truncate">{payment.txRef}</code>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {payment.customerName || 'N/A'}
                    </p>
                    <p className="text-xs text-text-secondary truncate">{payment.customerEmail}</p>
                  </div>
                  <div className="mb-2">
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(payment.status))}>
                    {payment.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingPayment(payment.id!)}
                      className="p-1.5 text-text-secondary hover:text-foreground transition-colors"
                      title="View Details"
                      disabled={!payment.id}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setViewingPayment(payment.id!);
                      }}
                      className="p-1.5 text-text-secondary hover:text-foreground transition-colors"
                      title="Download Receipt"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pt-3 border-t border-border">
                {(payment.orderId || payment.bookingId) && (
                  <div className="flex items-center gap-2 text-xs">
                    {payment.orderId && (
                      <Link
                        href={`/admin/orders?orderId=${payment.orderId}`}
                        className="text-primary hover:text-primary-hover flex items-center gap-1 truncate"
                      >
                        <span className="truncate">Order: {getOrderNumber(payment.orderId)}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </Link>
                    )}
                    {payment.bookingId && (
                      <Link
                        href={`/admin/bookings?bookingId=${payment.bookingId}`}
                        className="text-primary hover:text-primary-hover flex items-center gap-1 truncate"
                      >
                        <span className="truncate">Booking: {getBookingNumber(payment.bookingId)}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </Link>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span>{formatDate(createdAt.toISOString())}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPayments.length === 0 && !loading && (
        <div className="text-center py-12 text-text-secondary">
          <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No payments found</p>
          {searchQuery && (
            <p className="text-sm mt-2">Try adjusting your search or filters</p>
          )}
        </div>
      )}

      {/* View Payment Modal */}
      <Modal
        isOpen={!!viewingPayment && !!selectedPayment}
        onClose={() => setViewingPayment(null)}
        title="Payment Details"
        size="md"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Transaction Reference</label>
                <p className="text-xs sm:text-sm text-foreground font-mono break-all">{selectedPayment.txRef}</p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Customer</label>
                <p className="text-sm sm:text-base text-foreground">{selectedPayment.customerName || 'N/A'}</p>
                <p className="text-xs sm:text-sm text-text-secondary break-words">{selectedPayment.customerEmail}</p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Amount</label>
                <p className="text-lg sm:text-xl font-bold text-foreground">
                  {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                </p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Status</label>
                <span className={cn('inline-block px-2 py-1 rounded-full text-xs font-medium', getStatusColor(selectedPayment.status))}>
                  {selectedPayment.status}
                </span>
              </div>

              {selectedPayment.orderId && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Order</label>
                  <Link
                    href={`/admin/orders?orderId=${selectedPayment.orderId}`}
                    className="text-sm sm:text-base text-primary hover:text-primary-hover flex items-center gap-1 break-words"
                  >
                    <span className="break-words">{getOrderNumber(selectedPayment.orderId)}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </Link>
                </div>
              )}

              {selectedPayment.bookingId && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Booking</label>
                  <Link
                    href={`/admin/bookings?bookingId=${selectedPayment.bookingId}`}
                    className="text-sm sm:text-base text-primary hover:text-primary-hover flex items-center gap-1 break-words"
                  >
                    <span className="break-words">{getBookingNumber(selectedPayment.bookingId)}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </Link>
                </div>
              )}

              <div>
                <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Payment Method</label>
                <p className="text-sm sm:text-base text-foreground">{formatPaymentMethod(selectedPayment.paymentMethod) || 'N/A'}</p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Date</label>
                <p className="text-sm sm:text-base text-foreground">
                  {formatDate(
                    (selectedPayment.createdAt instanceof Date 
                      ? selectedPayment.createdAt 
                      : (selectedPayment.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(selectedPayment.createdAt as string)
                    ).toISOString()
                  )}
                </p>
              </div>

              {selectedPayment.metadata && Object.keys(selectedPayment.metadata).length > 0 && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-text-secondary block mb-1">Metadata</label>
                  <pre className="text-xs text-text-secondary bg-background-secondary p-2 sm:p-3 rounded overflow-auto max-h-40">
                    {JSON.stringify(selectedPayment.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => handleExportSingle(selectedPayment)}
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
              <Button onClick={() => setViewingPayment(null)} className="w-full sm:w-auto">Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

