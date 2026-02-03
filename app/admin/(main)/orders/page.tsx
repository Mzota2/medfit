/**
 * Admin Orders Management
 */

'use client';

import React, { useState } from 'react';
import { useOrders, useUpdateOrder, useCancelOrder } from '@/hooks';
import { Order, OrderStatus } from '@/types/order';
import { Button, Loading, useToast, StatusBadge, CancellationDialog } from '@/components/ui';
import { Search, Eye, Package, Download, Edit } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatting';
import { Timestamp } from 'firebase/firestore';

// Helper to convert date safely
const getDate = (date: Date | string | Timestamp | { toDate?: () => Date } | undefined): Date => {
  if (!date) return new Date(0);
  if (date instanceof Date) return date;
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  return new Date(date as string);
};
import { Input } from '@/components/ui';
import Link from 'next/link';
import { StoreTypeGuard } from '@/components/guards/StoreTypeGuard';
import { getUserFriendlyMessage, SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/utils/user-messages';

export default function AdminOrdersPage() {
  return (
    <StoreTypeGuard requireProducts={true} redirectTo="/admin">
      <AdminOrdersPageContent />
    </StoreTypeGuard>
  );
}

function AdminOrdersPageContent() {
  const toast = useToast();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [notes, setNotes] = useState('');

  // Fetch orders with React Query
  const {
    data: items = [],
    isLoading: loading,
    error,
  } = useOrders({
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    limit: 50,
  });

  // Mutations
  const updateOrder = useUpdateOrder();
  const cancelOrder = useCancelOrder();

  // Filter orders by search query
  const filteredOrders = items.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.customerName?.toLowerCase().includes(query) ||
      order.customerEmail.toLowerCase().includes(query)
    );
  });


  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setNotes(order.notes || '');
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    if (!selectedOrder.id) {
      toast.showError('Order ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      await updateOrder.mutateAsync({
        orderId: selectedOrder.id,
        updates: { status: newStatus as OrderStatus },
      });
      setSelectedOrder({ ...selectedOrder, status: newStatus as OrderStatus });
      setNewStatus('');
      toast.showSuccess(SUCCESS_MESSAGES.ORDER_STATUS_UPDATED);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
    }
  };

  const handleCancelOrderAction = async (reason?: string) => {
    if (!selectedOrder) return;
    
    if (!selectedOrder.id) {
      toast.showError('Order ID is missing. Please refresh the page and try again.');
      return;
    }

    if (!reason?.trim()) {
      toast.showWarning('Please provide a cancellation reason');
      return;
    }

    try {
      await cancelOrder.mutateAsync({
        orderId: selectedOrder.id,
        reason: reason.trim(),
      });
      setSelectedOrder({
        ...selectedOrder,
        status: OrderStatus.CANCELED,
        canceledAt: new Date(),
        canceledReason: reason.trim(),
      });
      toast.showSuccess(SUCCESS_MESSAGES.ORDER_CANCELED);
    } catch (error) {
      console.error('Error canceling order:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
      throw error;
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedOrder) return;

    if (!selectedOrder.id) {
      toast.showError('Order ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      await updateOrder.mutateAsync({
        orderId: selectedOrder.id,
        updates: { notes },
      });
      setSelectedOrder({ ...selectedOrder, notes });
      toast.showSuccess(SUCCESS_MESSAGES.NOTES_SAVED);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.SAVE_FAILED));
    }
  };

  const handleExport = () => {
    // Export functionality would go here
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
      {/* Orders List */}
      <div className="lg:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Orders</h1>
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
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
          {['all', ...Object.values(OrderStatus)].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status as OrderStatus | 'all')}
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

        {(error || updateOrder.isError || cancelOrder.isError) && (
          <div className="mb-4 p-3 sm:p-4 bg-destructive/20 text-destructive rounded-lg text-sm sm:text-base">
            {getUserFriendlyMessage(error || updateOrder.error || cancelOrder.error, ERROR_MESSAGES.LOAD_FAILED)}
          </div>
        )}

        {/* Orders Table - Desktop */}
        <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Order #</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => handleViewOrder(order)}
                    className={cn(
                      'cursor-pointer hover:bg-background-secondary transition-colors',
                      selectedOrder?.id === order.id && 'bg-primary/5'
                    )}
                  >
                    <td className="py-3 px-4 text-sm font-medium text-foreground">{order.orderNumber}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm text-foreground">{order.customerName || 'Guest'}</p>
                        <p className="text-xs text-text-secondary">{order.customerEmail}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {order.createdAt ? formatDateTime(getDate(order.createdAt)) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">
                      {formatCurrency(order.pricing.total, order.pricing.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status} variant="badge" />
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-text-secondary hover:text-foreground transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Orders Cards - Mobile */}
        <div className="md:hidden space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => handleViewOrder(order)}
              className={cn(
                'bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow',
                selectedOrder?.id === order.id && 'ring-2 ring-primary'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-foreground">{order.orderNumber}</p>
                    <StatusBadge status={order.status} variant="badge" />
                  </div>
                  <p className="text-xs text-text-secondary mb-2">
                    {order.createdAt ? formatDateTime(getDate(order.createdAt)) : '-'}
                  </p>
                </div>
                <Link
                  href={`/admin/orders/${order.id}`}
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
                    <p className="text-foreground font-medium">{order.customerName || 'Guest'}</p>
                    <p className="text-text-secondary text-xs truncate max-w-[150px]">{order.customerEmail}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Total:</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(order.pricing.total, order.pricing.currency)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 && !loading && (
          <div className="text-center py-8 sm:py-12 text-text-secondary">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm sm:text-base">No orders found</p>
          </div>
        )}
      </div>

      {/* Order Details Sidebar */}
      {selectedOrder && (
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg border border-border p-4 sm:p-6 sticky top-4 sm:top-6 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-xl sm:text-2xl text-text-secondary hover:text-foreground leading-none w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Order Info */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-background-secondary rounded-lg">
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Order #:</span>
                  <span className="text-foreground font-medium">{selectedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Date:</span>
                  <span className="text-foreground text-right">
                    {selectedOrder.createdAt ? formatDateTime(getDate(selectedOrder.createdAt)) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total:</span>
                  <span className="text-foreground font-medium">
                    {formatCurrency(selectedOrder.pricing.total, selectedOrder.pricing.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Status:</span>
                  <StatusBadge status={selectedOrder.status} variant="badge" />
                </div>
              </div>
            </div>

            {/* Update Status */}
            {selectedOrder.status !== OrderStatus.COMPLETED &&
              selectedOrder.status !== OrderStatus.CANCELED &&
              selectedOrder.status !== OrderStatus.REFUNDED && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">Update Status</h3>
                  <div className="flex gap-2">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                      className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs sm:text-sm"
                    >
                      <option value="">Select status...</option>
                      {Object.values(OrderStatus)
                        .filter((s) => s !== selectedOrder.status)
                        .map((status) => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ')}
                          </option>
                        ))}
                    </select>
                    <Button
                      onClick={handleUpdateStatus}
                      disabled={!newStatus || updateOrder.isPending}
                      size="sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

            {/* Cancel Order */}
            {selectedOrder.status !== OrderStatus.CANCELED &&
              selectedOrder.status !== OrderStatus.COMPLETED &&
              selectedOrder.status !== OrderStatus.REFUNDED && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">Cancel Order</h3>
                  <Button
                    variant="danger"
                    onClick={() => setShowCancelDialog(true)}
                    className="w-full"
                    size="sm"
                  >
                    Cancel Order
                  </Button>
                </div>
              )}

            {/* Customer Info */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">Customer Information</h3>
              <div className="text-xs sm:text-sm space-y-1">
                <p className="text-foreground">{selectedOrder.customerName || 'Guest'}</p>
                <p className="text-text-secondary wrap-break-word">{selectedOrder.customerEmail}</p>
                {selectedOrder.customerId && (
                  <Link href={`/admin/customers?customerId=${selectedOrder.customerId}`}>
                    <Button variant="outline" size="sm" className="mt-2 w-full">
                      View Customer
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            {selectedOrder.delivery && (
              <div className="mb-4 sm:mb-6">
                <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">Delivery Information</h3>
                <div className="text-xs sm:text-sm space-y-1">
                  <p className="text-foreground capitalize">{selectedOrder.delivery.method}</p>
                  {selectedOrder.delivery.address && (
                    <div className="text-text-secondary">
                      <p>{selectedOrder.delivery.address.areaOrVillage}</p>
                      {selectedOrder.delivery.address.traditionalAuthority && (
                        <p>{selectedOrder.delivery.address.traditionalAuthority}</p>
                      )}
                      {selectedOrder.delivery.address.district && (
                        <p>{selectedOrder.delivery.address.district}</p>
                      )}
                      {selectedOrder.delivery.address.nearestTownOrTradingCentre && (
                        <p>{selectedOrder.delivery.address.nearestTownOrTradingCentre}</p>
                      )}
                      <p>{selectedOrder.delivery.address.region}, {selectedOrder.delivery.address.country}</p>
                    </div>
                  )}
                  {selectedOrder.delivery.trackingNumber && (
                    <p className="text-text-secondary wrap-break-word">
                      Tracking: {selectedOrder.delivery.trackingNumber}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">Order Items</h3>
              <div className="space-y-2 text-xs sm:text-sm">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span className="text-foreground wrap-break-word flex-1">
                      {item.productName} (×{item.quantity})
                    </span>
                    <span className="text-foreground shrink-0">
                      {formatCurrency(item.subtotal, selectedOrder.pricing.currency)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Subtotal:</span>
                    <span className="text-foreground">
                      {formatCurrency(selectedOrder.pricing.subtotal, selectedOrder.pricing.currency)}
                    </span>
                  </div>
                  {selectedOrder.pricing.shipping && selectedOrder.pricing.shipping > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Shipping:</span>
                      <span className="text-foreground">
                        {formatCurrency(selectedOrder.pricing.shipping, selectedOrder.pricing.currency)}
                      </span>
                    </div>
                  )}
                  {selectedOrder.pricing.tax && selectedOrder.pricing.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Tax:</span>
                      <span className="text-foreground">
                        {formatCurrency(selectedOrder.pricing.tax, selectedOrder.pricing.currency)}
                      </span>
                    </div>
                  )}
                  {selectedOrder.pricing.discount && selectedOrder.pricing.discount > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Discount:</span>
                      <span>
                        -{formatCurrency(selectedOrder.pricing.discount, selectedOrder.pricing.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold mt-1">
                    <span className="text-foreground">Total:</span>
                    <span className="text-foreground">
                      {formatCurrency(selectedOrder.pricing.total, selectedOrder.pricing.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">Internal Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for this order..."
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
      {selectedOrder && (
        <CancellationDialog
          isOpen={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          onConfirm={handleCancelOrderAction}
          itemType="order"
          requireReason={true}
          isLoading={cancelOrder.isPending}
        />
      )}
    </div>
  );
}
