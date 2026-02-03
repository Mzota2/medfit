'use client';

import React, { useState, useEffect } from 'react';
import { Button, StatusBadge } from '@/components/ui';
import { Loading } from '@/components/ui/Loading';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { Order, OrderStatus } from '@/types/order';
import { Booking, BookingStatus } from '@/types/booking';
import { COLLECTIONS } from '@/types/collections';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { generateInvoiceNumber } from '@/lib/utils/invoiceUtils';
import { Download, Eye, FileText, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useBusinesses } from '@/hooks';
import { exportInvoicePdf } from '@/lib/exports/exports';

interface InvoiceItem {
  id: string;
  type: 'order' | 'booking';
  number: string;
  date: Date;
  status: OrderStatus | BookingStatus;
  total: number;
  currency: string;
  customerName: string;
  invoiceNumber: string;
  data: Order | Booking;
}

// Type guard functions
function isOrder(data: Order | Booking): data is Order {
  return (data as Order).items !== undefined;
}

function isBooking(data: Order | Booking): data is Booking {
  return (data as Booking).serviceName !== undefined;
}

export default function CustomerInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceItem | null>(null);
  const { data: businesses = [] } = useBusinesses({ limit: 1 });
  const business = businesses.length > 0 ? businesses[0] : undefined;

  useEffect(() => {
    if (user) {
      loadInvoices();
    }
  }, [user]);

  const loadInvoices = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const invoiceItems: InvoiceItem[] = [];

      // Load completed orders
      const orderQueries = [
        query(collection(db, COLLECTIONS.ORDERS), where('customerId', '==', user.uid), where('status', '==', OrderStatus.COMPLETED)),
        query(collection(db, COLLECTIONS.ORDERS), where('customerId', '==', user.uid), where('status', '==', OrderStatus.PAID))
      ];
      
      const orderSnapshots = await Promise.all(orderQueries.map(q => getDocs(q)));
      const allOrders: Order[] = [];
      
      orderSnapshots.forEach(snap => {
        snap.forEach((doc) => {
          const order = { id: doc.id, ...doc.data() } as Order;
          allOrders.push(order);
        });
      });

      allOrders.forEach((order) => {
        const orderDate = order.createdAt instanceof Date 
          ? order.createdAt 
          : (order.createdAt && typeof order.createdAt === 'object' && 'toDate' in order.createdAt && typeof order.createdAt.toDate === 'function')
          ? order.createdAt.toDate()
          : new Date();

        invoiceItems.push({
          id: order.id || `order-${Date.now()}-${Math.random()}`,
          type: 'order',
          number: order.orderNumber,
          date: orderDate,
          status: order.status,
          total: order.pricing.total,
          currency: order.pricing.currency,
          customerName: order.customerName || 'Unknown Customer',
          invoiceNumber: generateInvoiceNumber(business?.name || 'BUSINESS'),
          data: order
        });
      });

      // Load completed bookings
      const bookingQueries = [
        query(collection(db, COLLECTIONS.BOOKINGS), where('customerId', '==', user.uid), where('status', '==', BookingStatus.COMPLETED)),
        query(collection(db, COLLECTIONS.BOOKINGS), where('customerId', '==', user.uid), where('status', '==', BookingStatus.PAID)),
        query(collection(db, COLLECTIONS.BOOKINGS), where('customerId', '==', user.uid), where('status', '==', BookingStatus.CONFIRMED))
      ];
      
      const bookingSnapshots = await Promise.all(bookingQueries.map(q => getDocs(q)));
      const allBookings: Booking[] = [];
      
      bookingSnapshots.forEach(snap => {
        snap.forEach((doc) => {
          const booking = { id: doc.id, ...doc.data() } as Booking;
          allBookings.push(booking);
        });
      });

      allBookings.forEach((booking) => {
        const bookingDate = booking.createdAt instanceof Date 
          ? booking.createdAt 
          : (booking.createdAt && typeof booking.createdAt === 'object' && 'toDate' in booking.createdAt && typeof booking.createdAt.toDate === 'function')
          ? booking.createdAt.toDate()
          : new Date();

        invoiceItems.push({
          id: booking.id || `booking-${Date.now()}-${Math.random()}`,
          type: 'booking',
          number: booking.bookingNumber,
          date: bookingDate,
          status: booking.status,
          total: booking.pricing.total,
          currency: booking.pricing.currency,
          customerName: booking.customerName || 'Unknown Customer',
          invoiceNumber: generateInvoiceNumber(business?.name || 'BUSINESS'),
          data: booking
        });
      });

      // Sort by date (newest first)
      setInvoices(invoiceItems.sort((a, b) => b.date.getTime() - a.date.getTime()));
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (invoice: InvoiceItem) => {
    setViewingInvoice(invoice);
  };

  const handleDownloadInvoice = async (invoice: InvoiceItem) => {
    try {
      if (invoice.type === 'order' && isOrder(invoice.data)) {
        await exportInvoicePdf({
          type: 'order',
          order: invoice.data,
          business,
          invoiceNumber: invoice.invoiceNumber,
          fileName: `invoice-${invoice.invoiceNumber}`,
        });
        return;
      }

      if (invoice.type === 'booking' && isBooking(invoice.data)) {
        await exportInvoicePdf({
          type: 'booking',
          booking: invoice.data,
          business,
          invoiceNumber: invoice.invoiceNumber,
          fileName: `invoice-${invoice.invoiceNumber}`,
        });
        return;
      }

      console.error('Unsupported invoice type for export');

    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const toggleExpanded = (invoiceId: string) => {
    setExpandedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.length > 0 ? (
        invoices.map((invoice) => {
          const isExpanded = expandedInvoices.has(invoice.id);
          
          return (
            <div key={invoice.id} className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm sm:text-base text-foreground">
                      Invoice #{invoice.invoiceNumber}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary mb-1">
                    {invoice.type === 'order' ? 'Order' : 'Booking'} #{invoice.number}
                  </p>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-text-secondary">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(invoice.date)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={invoice.status} variant="badge" />
                  <div className="text-right">
                    <span className="text-xs sm:text-sm text-text-secondary">Total:</span>
                    <span className="ml-2 font-semibold text-sm sm:text-base text-foreground">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-foreground mb-1">
                  {invoice.type === 'order' 
                    ? `Order for ${invoice.customerName}`
                    : `Service booking for ${invoice.customerName}`
                  }
                </p>
                {invoice.type === 'booking' && isBooking(invoice.data) && (
                  <p className="text-xs text-text-secondary">
                    Service: {invoice.data.serviceName}
                  </p>
                )}
                {invoice.type === 'order' && isOrder(invoice.data) && (
                  <p className="text-xs text-text-secondary">
                    Items: {invoice.data.items.length} product(s)
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toggleExpanded(invoice.id)}
                  className="w-full sm:w-auto"
                >
                  {isExpanded ? 'Hide Details' : 'View Details'}
                </Button>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewInvoice(invoice)}
                    className="w-full sm:w-auto"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    View Invoice
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadInvoice(invoice)}
                    className="w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <p className="text-text-secondary">Invoice Number</p>
                      <p className="text-foreground font-medium">{invoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary">{invoice.type === 'order' ? 'Order' : 'Booking'} Number</p>
                      <p className="text-foreground font-medium">{invoice.number}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Date</p>
                      <p className="text-foreground font-medium">{formatDate(invoice.date)}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Status</p>
                      <p className="text-foreground font-medium capitalize">{invoice.status}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Customer</p>
                      <p className="text-foreground font-medium">{invoice.customerName}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Total Amount</p>
                      <p className="text-foreground font-medium">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </p>
                    </div>
                  </div>
                  
                  {invoice.type === 'order' && isOrder(invoice.data) && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-sm text-text-secondary mb-2">Order Items</p>
                      <div className="space-y-1 text-sm">
                        {invoice.data.items.map((item, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-foreground">
                              {item.productName} x {item.quantity}
                            </span>
                            <span className="text-foreground font-medium">
                              {formatCurrency(item.subtotal, invoice.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {invoice.type === 'booking' && isBooking(invoice.data) && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-sm text-text-secondary mb-2">Service Details</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-foreground">Service</span>
                          <span className="text-foreground font-medium">
                            {invoice.data.serviceName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground">Duration</span>
                          <span className="text-foreground font-medium">
                            {invoice.data.timeSlot.duration} minutes
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="bg-card rounded-lg shadow-sm p-6 sm:p-8 lg:p-12 text-center">
          <FileText className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-sm sm:text-base text-text-secondary mb-4">No invoices available yet.</p>
          <p className="text-xs text-text-secondary">
            Invoices will appear here once your orders are completed or bookings are confirmed.
          </p>
        </div>
      )}

      {/* Invoice Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Invoice #{viewingInvoice.invoiceNumber}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadInvoice(viewingInvoice)}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingInvoice(null)}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="p-4 bg-gray-50">
              <div className="bg-white p-8 shadow-sm">
                {viewingInvoice.type === 'order' ? (
                  <div className="invoice-content">
                    {/* Order Invoice Summary */}
                    <div className="border-b-2 border-gray-800 pb-6 mb-8">
                      <div className="flex justify-between items-start">
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h1>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Invoice Number:</strong> {viewingInvoice.invoiceNumber}</p>
                            <p><strong>Order Number:</strong> {viewingInvoice.number}</p>
                            <p><strong>Order Date:</strong> {formatDate(viewingInvoice.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(viewingInvoice.total, viewingInvoice.currency)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">{viewingInvoice.customerName}</p>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Items</h3>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">Quantity</th>
                            <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isOrder(viewingInvoice.data) && viewingInvoice.data.items.map((item, index) => (
                            <tr key={index}>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                                {item.productName}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-700">
                                {item.quantity}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700">
                                {formatCurrency(item.subtotal, viewingInvoice.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="text-center text-sm text-gray-600 pt-6 border-t border-gray-800">
                      <p>Thank you for your business!</p>
                      <p>This is a computer-generated invoice and does not require a signature.</p>
                    </div>
                  </div>
                ) : (
                  <div className="invoice-content">
                    {/* Booking Invoice Summary */}
                    <div className="border-b-2 border-gray-800 pb-6 mb-8">
                      <div className="flex justify-between items-start">
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h1>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Invoice Number:</strong> {viewingInvoice.invoiceNumber}</p>
                            <p><strong>Booking Number:</strong> {viewingInvoice.number}</p>
                            <p><strong>Booking Date:</strong> {formatDate(viewingInvoice.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(viewingInvoice.total, viewingInvoice.currency)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">{viewingInvoice.customerName}</p>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Details</h3>
                      <div className="bg-gray-50 p-4 rounded">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {isBooking(viewingInvoice.data) ? viewingInvoice.data.serviceName : ''}
                        </h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Duration:</strong> {isBooking(viewingInvoice.data) ? `${viewingInvoice.data.timeSlot.duration} minutes` : ''}</p>
                          <p><strong>Date:</strong> {isBooking(viewingInvoice.data) ? formatDate(viewingInvoice.data.timeSlot.startTime) : ''}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-8">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                            <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isBooking(viewingInvoice.data) && (
                            <>
                              <tr>
                                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Service Fee</td>
                                <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700">
                                  {formatCurrency(viewingInvoice.data.pricing.basePrice, viewingInvoice.currency)}
                                </td>
                              </tr>
                              {viewingInvoice.data.pricing.tax && (
                                <tr>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Tax</td>
                                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700">
                                    {formatCurrency(viewingInvoice.data.pricing.tax, viewingInvoice.currency)}
                                  </td>
                                </tr>
                              )}
                            </>
                          )}
                          <tr className="border-t-2 border-gray-800">
                            <td className="border border-gray-300 px-4 py-3 text-base font-semibold text-gray-900">Total Paid</td>
                            <td className="border border-gray-300 px-4 py-3 text-right text-xl font-bold text-gray-900">
                              {formatCurrency(viewingInvoice.total, viewingInvoice.currency)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="text-center text-sm text-gray-600 pt-6 border-t border-gray-800">
                      <p>Thank you for choosing our service!</p>
                      <p>This is a computer-generated invoice and does not require a signature.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
