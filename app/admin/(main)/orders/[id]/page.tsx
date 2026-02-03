/**
 * Admin order detail page - detailed order management
 */

'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Calendar, CreditCard, Truck, AlertCircle, ArrowLeft, Edit, Save } from 'lucide-react';
import { Button, Loading, Input, Textarea, useToast, StatusBadge, CancellationDialog, statusUtils, ExportButton } from '@/components/ui';
import { useOrder, useUpdateOrder, useCancelOrder } from '@/hooks/useOrders';
import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod } from '@/lib/utils/formatting';
import { OrderStatus, FulfillmentMethod, type Order } from '@/types/order';
import { OrderTimeline } from '@/components/timeline';
import { getUserFriendlyMessage, SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/utils/user-messages';
import { useApp } from '@/contexts/AppContext';
import { useDeliveryProviders } from '@/hooks/useDeliveryProviders';
import { MALAWI_DISTRICTS } from '@/types/delivery';
import { Timestamp } from 'firebase/firestore';
import { getOptimizedImageUrl } from '@/lib/cloudinary/utils';

export default function AdminOrderDetailPage() {
  const toast = useToast();
  const params = useParams();
  const orderId = params?.id as string;
  const { currentBusiness } = useApp();
  
  const { data: order, isLoading, error } = useOrder(orderId);
  const updateOrderMutation = useUpdateOrder();
  const cancelOrderMutation = useCancelOrder();
  const { data: deliveryProviders } = useDeliveryProviders();
  
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [notes, setNotes] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  React.useEffect(() => {
    if (order) {
      setStatus(order.status);
      if (order.delivery) {
        setTrackingNumber(order.delivery.trackingNumber || '');
        setCarrier(order.delivery.carrier || '');
      }
      setNotes(order.notes || '');
    }
  }, [order]);

  const handleUpdateStatus = async () => {
    if (!order || !status) return;

    if (!order.id) {
      toast.showError('Order ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      const updates: Partial<Order> = { status: status as OrderStatus };
      
      // Add status update reason if provided
      if (statusReason.trim()) {
        updates.statusHistory = [
          ...(order.statusHistory || []),
          {
            status: status as OrderStatus,
            updatedAt: new Date(),
            reason: statusReason.trim(),
            updatedBy: 'admin' // In a real app, this would be the current admin's ID
          }
        ];
      }

      await updateOrderMutation.mutateAsync({
        orderId: order.id,
        updates,
      });
      
      setStatusReason('');
      setIsEditing(false);
      toast.showSuccess(SUCCESS_MESSAGES.ORDER_STATUS_UPDATED);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
    }
  };

  const handleUpdateTracking = async () => {
    if (!order) return;

    if (!order.id) {
      toast.showError('Order ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      if (!order.delivery) {
        toast.showError('Delivery information is missing');
        return;
      }
      await updateOrderMutation.mutateAsync({
        orderId: order.id,
        updates: {
          delivery: {
            ...order.delivery,
            method: order.delivery.method,
            trackingNumber: trackingNumber || undefined,
            carrier: carrier || undefined,
          },
        },
      });
      setIsEditing(false);
      toast.showSuccess('Tracking information updated successfully');
    } catch (error) {
      console.error('Error updating tracking:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
    }
  };

  const handleSaveNotes = async () => {
    if (!order) return;

    if (!order.id) {
      toast.showError('Order ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      await updateOrderMutation.mutateAsync({
        orderId: order.id,
        updates: { notes },
      });
      toast.showSuccess(SUCCESS_MESSAGES.NOTES_SAVED);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.SAVE_FAILED));
    }
  };

  const handleCancelOrder = async (reason?: string) => {
    if (!order) return;

    if (!order.id) {
      toast.showError('Order ID is missing. Please refresh the page and try again.');
      return;
    }

    if (!reason?.trim()) {
      toast.showWarning('Please provide a cancellation reason');
      return;
    }

    try {
      await cancelOrderMutation.mutateAsync({
        orderId: order.id,
        reason: reason.trim(),
      });
      toast.showSuccess(SUCCESS_MESSAGES.ORDER_CANCELED);
    } catch (error) {
      console.error('Error canceling order:', error);
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

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-foreground">Order Not Found</h1>
          <p className="text-text-secondary mb-6">
            {error ? getUserFriendlyMessage(error, 'The order you\'re looking for doesn\'t exist.') : 'The order you\'re looking for doesn\'t exist.'}
          </p>
          <Link href="/admin/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const deliveryAddress = order.delivery?.address;
  const districtName = deliveryAddress?.district 
    ? Object.values(MALAWI_DISTRICTS).flat().find(d => d === deliveryAddress.district) || deliveryAddress.district
    : null;
  const deliveryProvider = order.delivery?.providerId 
    ? deliveryProviders?.find(p => p.id === order.delivery?.providerId)
    : null;
  const canCancel = order.status === OrderStatus.PENDING || order.status === OrderStatus.PAID;

  return (
    <div className="min-h-screen bg-background-secondary py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/orders">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Order Details</h1>
              <p className="text-text-secondary">Order #{order.orderNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton 
                data={order} 
                type="order" 
                isAdmin={true}
                businessData={currentBusiness}
                className="flex-shrink-0"
              />
              <StatusBadge status={order.status} variant="pill" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <section className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                    {item.productImage && (
                      <div className="relative w-20 h-20 bg-background-secondary rounded-lg overflow-hidden shrink-0">
                        <Image
                          src={getOptimizedImageUrl(item.productImage, { width: 200, height: 200, format: 'webp' })}
                          alt={item.productName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="grow">
                      <h3 className="font-semibold text-foreground mb-1">{item.productName}</h3>
                      {item.sku && (
                        <p className="text-sm text-text-secondary mb-2">SKU: {item.sku}</p>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-text-secondary">Quantity: {item.quantity}</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(item.subtotal, order.pricing.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Customer Information */}
            <section className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Customer Information</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Name:</span>
                  <span className="text-foreground">{order.customerName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Email:</span>
                  <span className="text-foreground">{order.customerEmail}</span>
                </div>
                {order.customerId && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Customer ID:</span>
                    <span className="text-foreground font-mono text-sm">{order.customerId}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Order Timeline */}
            <section className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Order Status Timeline</h2>
              <OrderTimeline
                status={order.status}
                createdAt={order.createdAt instanceof Timestamp ? order.createdAt.toDate() : order.createdAt}
                paidAt={order.payment?.paidAt ? (order.payment.paidAt instanceof Timestamp ? order.payment.paidAt.toDate() : order.payment.paidAt) : undefined}
                canceledAt={order.canceledAt ? (order.canceledAt instanceof Timestamp ? order.canceledAt.toDate() : order.canceledAt) : undefined}
                refundedAt={order.refundedAt ? (order.refundedAt instanceof Timestamp ? order.refundedAt.toDate() : order.refundedAt) : undefined}
                completedAt={order.status === OrderStatus.COMPLETED && order.updatedAt ? (order.updatedAt instanceof Timestamp ? order.updatedAt.toDate() : order.updatedAt) : undefined}
              />
            </section>

            {/* Delivery Information */}
            <section className="bg-card rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Delivery Information
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </div>
              
              <div className="space-y-4">
                {order.delivery && (
                  <>
                <div>
                  <span className="text-sm font-medium text-text-secondary">Method:</span>
                  <span className="ml-2 text-foreground capitalize">
                    {order.delivery.method === FulfillmentMethod.DELIVERY ? 'Delivery' : 'Pickup'}
                  </span>
                </div>

                {order.delivery.method === FulfillmentMethod.DELIVERY && deliveryAddress && (
                  <div className="mt-4 p-4 bg-background-secondary rounded-lg">
                    <div className="flex items-start gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-text-secondary mt-0.5" />
                      <div className="grow">
                        <p className="font-medium text-foreground mb-1">Delivery Address</p>
                        <div className="text-sm text-text-secondary space-y-1">
                          <p>{deliveryAddress.areaOrVillage}</p>
                          {deliveryAddress.traditionalAuthority && (
                            <p>{deliveryAddress.traditionalAuthority}</p>
                          )}
                          {districtName && <p>{districtName}</p>}
                          {deliveryAddress.nearestTownOrTradingCentre && (
                            <p>{deliveryAddress.nearestTownOrTradingCentre}</p>
                          )}
                          <p>{deliveryAddress.region}, {deliveryAddress.country}</p>
                          {deliveryAddress.directions && (
                            <p className="mt-2 italic">Directions: {deliveryAddress.directions}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {deliveryProvider && (
                  <div>
                    <span className="text-sm font-medium text-text-secondary">Provider:</span>
                    <span className="ml-2 text-foreground">{deliveryProvider.name}</span>
                  </div>
                )}

                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Tracking Number
                      </label>
                      <Input
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Enter tracking number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Carrier
                      </label>
                      <Input
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                        placeholder="Enter carrier name"
                      />
                    </div>
                    <Button onClick={handleUpdateTracking} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      Save Tracking Info
                    </Button>
                  </div>
                ) : (
                  <>
                    {order.delivery?.trackingNumber && (
                      <div>
                        <span className="text-sm font-medium text-text-secondary">Tracking Number:</span>
                        <span className="ml-2 font-mono text-foreground">{order.delivery.trackingNumber}</span>
                      </div>
                    )}
                    {order.delivery?.carrier && (
                      <div>
                        <span className="text-sm font-medium text-text-secondary">Carrier:</span>
                        <span className="ml-2 text-foreground">{order.delivery.carrier}</span>
                      </div>
                    )}
                  </>
                )}

                {order.delivery?.estimatedDeliveryDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm text-text-secondary">Estimated Delivery:</span>
                    <span className="ml-2 text-foreground">
                      {formatDate(new Date(order.delivery.estimatedDeliveryDate))}
                    </span>
                  </div>
                )}
                  </>
                )}
              </div>
            </section>

            {/* Payment Information */}
            {order.payment && (
              <section className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Information
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Payment Method:</span>
                    <span className="text-foreground capitalize">{formatPaymentMethod(order.payment.paymentMethod)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Amount Paid:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(order.payment.amount, order.payment.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Paid At:</span>
                    <span className="text-foreground">
                      {order.payment.paidAt 
                        ? formatDateTime(
                            order.payment.paidAt instanceof Timestamp 
                              ? order.payment.paidAt.toDate() 
                              : order.payment.paidAt instanceof Date 
                              ? order.payment.paidAt 
                              : new Date(order.payment.paidAt)
                          )
                        : 'N/A'}
                    </span>
                  </div>
                  {order.payment.paymentId && (
                    <div className="flex justify-between">
                      <span className="text-sm text-text-secondary">Transaction ID:</span>
                      <span className="font-mono text-sm text-foreground">{order.payment.paymentId}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Order Notes */}
            <section className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Order Notes</h2>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add internal notes about this order..."
              />
              <Button onClick={handleSaveNotes} className="mt-3" size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save Notes
              </Button>
            </section>

            {/* Cancel Order */}
            {canCancel && (
              <section className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground text-error">Cancel Order</h2>
                <p className="text-sm text-text-secondary mb-4">
                  If you need to cancel this order, please provide a reason below.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                  className="border-error text-error hover:bg-error/10"
                >
                  Cancel Order
                </Button>
              </section>
            )}
          </div>

          {/* Sidebar - Order Summary & Actions */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm p-6 sticky top-20 space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-foreground">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Subtotal</span>
                    <span className="text-foreground">{formatCurrency(order.pricing.subtotal, order.pricing.currency)}</span>
                  </div>
                  {order.pricing.discount && order.pricing.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Discount</span>
                      <span className="text-success">-{formatCurrency(order.pricing.discount, order.pricing.currency)}</span>
                    </div>
                  )}
                  {order.pricing.shipping && order.pricing.shipping > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Shipping</span>
                      <span className="text-foreground">{formatCurrency(order.pricing.shipping, order.pricing.currency)}</span>
                    </div>
                  )}
                  {order.pricing.tax && order.pricing.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Tax</span>
                      <span className="text-foreground">{formatCurrency(order.pricing.tax, order.pricing.currency)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-foreground">Total</span>
                      <span className="text-foreground">{formatCurrency(order.pricing.total, order.pricing.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">Update Status</h3>
                <div className="space-y-3">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as OrderStatus)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  >
                    {Object.values(OrderStatus).map((s) => (
                      <option key={s} value={s}>
                        {statusUtils.getStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                  
                  {status && status !== order.status && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Reason for status change (optional):
                      </label>
                      <Textarea
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        rows={2}
                        placeholder="E.g., Order shipped with tracking number..."
                        className="w-full text-sm"
                      />
                    </div>
                  )}
                  
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={updateOrderMutation.isPending || status === order.status}
                    isLoading={updateOrderMutation.isPending}
                    className="w-full mt-2"
                  >
                    Update Status
                  </Button>
                </div>
              </div>

              {/* Order Dates */}
              <div className="space-y-2 text-sm text-text-secondary pt-4 border-t border-border">
                <div className="flex justify-between">
                  <span>Order Date:</span>
                  <span className="text-foreground">
                    {order.createdAt ? formatDate(order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt)) : 'N/A'}
                  </span>
                </div>
                {order.canceledAt && (
                  <div className="flex justify-between">
                    <span>Canceled:</span>
                    <span className="text-foreground">
                      {formatDate(order.canceledAt instanceof Timestamp ? order.canceledAt.toDate() : new Date(order.canceledAt))}
                    </span>
                  </div>
                )}
                {order.refundedAt && (
                  <div className="flex justify-between">
                    <span>Refunded:</span>
                    <span className="text-foreground">
                      {formatDate(order.refundedAt instanceof Timestamp ? order.refundedAt.toDate() : new Date(order.refundedAt))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Dialog */}
      <CancellationDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelOrder}
        itemType="order"
        requireReason={true}
        isLoading={cancelOrderMutation.isPending}
      />
    </div>
  );
}

