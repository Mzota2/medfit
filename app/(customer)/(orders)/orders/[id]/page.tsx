/**
 * Customer order detail page - view individual order details, tracking, and status
 */

'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar, CreditCard, Truck, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button, Loading, useToast, StatusBadge, CancellationDialog, ExportButton } from '@/components/ui';
import { useOrder, useCancelOrder } from '@/hooks/useOrders';
import { getUserFriendlyMessage, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/utils/user-messages';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate, formatDateTime, formatPaymentMethod } from '@/lib/utils/formatting';
import { OrderStatus, FulfillmentMethod } from '@/types/order';
import { MALAWI_DISTRICTS } from '@/types/delivery';
import { OrderTimeline } from '@/components/timeline';
import { Timestamp } from 'firebase/firestore';
import { ProductImage } from '@/components/ui/OptimizedImage';

export default function CustomerOrderDetailPage() {
  const toast = useToast();
  const params = useParams();
  const orderId = params.id as string;
  const { currentBusiness } = useApp();
  
  const { data: order, isLoading, error } = useOrder(orderId);
  const cancelOrderMutation = useCancelOrder();
  
  // Real-time updates for user's own order (critical data - user needs immediate status updates)
  useRealtimeOrders({
    customerId: order?.customerId,
    enabled: !!order?.customerId,
  });
  
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleCancelOrder = async (reason?: string) => {
    if (!orderId) return;
    
    try {
      await cancelOrderMutation.mutateAsync({
        orderId,
        reason: reason || undefined,
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
            {error ? getUserFriendlyMessage(error, 'The order you\'re looking for doesn\'t exist or you don\'t have permission to view it.') : 'The order you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}
          </p>
          <Link href="/profile?tab=orders">
            <Button>Back to My Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = order.status === OrderStatus.PENDING || order.status === OrderStatus.PAID;
  const deliveryAddress = order.delivery?.address;
  const districtName = deliveryAddress?.district 
    ? Object.values(MALAWI_DISTRICTS).flat().find(d => d === deliveryAddress.district) || deliveryAddress.district
    : null;

  return (
    <div className="min-h-screen bg-background-secondary py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {/* Header */}
        <div className="mb-6">
          <Link href="/orders">
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
                isAdmin={false}
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
            <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-foreground">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-3 sm:gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                    {item.productImage && (
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-background-secondary rounded-lg overflow-hidden shrink-0">
                        <ProductImage
                          src={item.productImage}
                          alt={item.productName}
                          fill
                          context="card"
                          aspectRatio="square"
                          className="object-cover"
                          sizes="(max-width: 640px) 64px, 80px"
                        />
                      </div>
                    )}
                    <div className="grow min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 wrap-break-word">{item.productName}</h3>
                      {item.sku && (
                        <p className="text-xs sm:text-sm text-text-secondary mb-2">SKU: {item.sku}</p>
                      )}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                        <span className="text-xs sm:text-sm text-text-secondary">Quantity: {item.quantity}</span>
                        <span className="font-semibold text-sm sm:text-base text-foreground">
                          {formatCurrency(item.subtotal, order.pricing.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Order Timeline */}
            <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-foreground">Order Status</h2>
              <OrderTimeline
                status={order.status}
                createdAt={order.createdAt instanceof Timestamp ? order.createdAt.toDate() : order.createdAt}
                paidAt={order.payment?.paidAt}
                canceledAt={order.canceledAt}
                refundedAt={order.refundedAt}
                completedAt={order.status === OrderStatus.COMPLETED ? order.updatedAt instanceof Timestamp ? order.updatedAt.toDate() : order.updatedAt : undefined}
              />
            </section>

            {/* Delivery Information */}
            <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                Delivery Information
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-text-secondary">Method:</span>
                  <span className="ml-2 text-foreground capitalize">
                    {order.delivery?.method === FulfillmentMethod.DELIVERY ? 'Delivery' : 'Pickup'}
                  </span>
                </div>
                
                {order?.delivery?.method === FulfillmentMethod.DELIVERY && deliveryAddress && (
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

                {order.delivery?.method === FulfillmentMethod.PICKUP && order.delivery?.pickupLocationId && (
                  <div className="mt-4 p-4 bg-background-secondary rounded-lg">
                    <p className="text-sm text-text-secondary">Pickup Location ID: {order.delivery.pickupLocationId}</p>
                  </div>
                )}

                {order.delivery?.trackingNumber && (
                  <div className="mt-4">
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

                {order.delivery?.estimatedDeliveryDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm text-text-secondary">Estimated Delivery:</span>
                    <span className="ml-2 text-foreground">
                      {formatDate(new Date(order.delivery.estimatedDeliveryDate))}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Payment Information */}
            {order.payment && (
              <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
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

            {/* Notes */}
            {order.notes && (
              <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-foreground">Order Notes</h2>
                <p className="text-sm sm:text-base text-text-secondary wrap-break-word">{order.notes}</p>
              </section>
            )}

            {/* Cancel Order */}
            {canCancel && (
              <section className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-foreground text-error">Cancel Order</h2>
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

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6 lg:sticky lg:top-20">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-foreground">Order Summary</h2>
              
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

              <div className="space-y-2 text-sm text-text-secondary pt-4 border-t border-border">
                <div className="flex justify-between">
                  <span>Order Date:</span>
                  <span className="text-foreground">
                    {order.createdAt 
                      ? formatDate(
                          order.createdAt instanceof Timestamp
                            ? order.createdAt.toDate().toISOString()
                            : order.createdAt instanceof Date
                            ? order.createdAt.toISOString()
                            : order.createdAt as string
                        )
                      : 'N/A'}
                  </span>
                </div>
                {order.canceledAt && (
                  <div className="flex justify-between">
                    <span>Canceled:</span>
                    <span className="text-foreground">
                      {formatDate(
                        order.canceledAt instanceof Timestamp
                          ? order.canceledAt.toDate().toISOString()
                          : order.canceledAt instanceof Date
                          ? order.canceledAt.toISOString()
                          : order.canceledAt as string
                      )}
                    </span>
                  </div>
                )}
                {order.refundedAt && (
                  <div className="flex justify-between">
                    <span>Refunded:</span>
                    <span className="text-foreground">
                      {formatDate(
                        order.refundedAt instanceof Timestamp
                          ? order.refundedAt.toDate().toISOString()
                          : order.refundedAt instanceof Date
                          ? order.refundedAt.toISOString()
                          : order.refundedAt as string
                      )}
                    </span>
                  </div>
                )}
              </div>

              {order.status === OrderStatus.COMPLETED && (
                <div className="mt-6">
                  <Link href="/products">
                    <Button className="w-full" variant="outline">
                      Reorder Items
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
          onConfirm={handleCancelOrder}
          itemType="order"
          requireReason={false}
          isLoading={cancelOrderMutation.isPending}
        />
      </div>
    </div>
  );
}

