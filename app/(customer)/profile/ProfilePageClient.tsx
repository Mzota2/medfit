/**
 * Client implementation of the user profile page.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, StatusBadge, CancellationDialog, useToast } from '@/components/ui';
import { Loading } from '@/components/ui/Loading';
import { getUserFriendlyMessage, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/utils/user-messages';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { Order, OrderStatus, FulfillmentMethod } from '@/types/order';
import { Booking, BookingStatus } from '@/types/booking';
import { User } from '@/types';
import { COLLECTIONS } from '@/types/collections';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown, Package, MapPin, Clock, XCircle, FileText } from 'lucide-react';
import { getLoginUrl, getReturnUrl } from '@/lib/utils/redirect';
import { cn } from '@/lib/utils/cn';
import { useCancelBooking } from '@/hooks/useBookings';
import { useBusinesses } from '@/hooks';
import CustomerInvoices from '@/components/invoice/CustomerInvoices';

type TabType = 'orders' | 'bookings' | 'invoices';

export default function ProfilePageClient() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    address: '',
  });

  // Fetch business data for cancellation time
  const { data: businesses = [] } = useBusinesses({ limit: 1 });
  const business = businesses.length > 0 ? businesses[0] : null;
  // Use nullish coalescing to handle 0 as a valid value
  const cancellationTime = business?.cancellationTime ?? 24; // Default 24 hours

  // Cancel booking mutation
  const cancelBookingMutation = useCancelBooking();

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      const returnUrl = getReturnUrl(pathname, searchParams);
      router.push(getLoginUrl(returnUrl));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, pathname, searchParams]);

  const loadUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load user profile
      const userQuery = query(
        collection(db, COLLECTIONS.USERS),
        where('uid', '==', user.uid)
      );
      const userSnap = await getDocs(userQuery);
      
      if (!userSnap.empty) {
        const userData = { id: userSnap.docs[0].id, ...userSnap.docs[0].data() } as User;
        setUserProfile(userData);
        setFormData({
          displayName: userData.displayName || '',
          phone: userData.phone || '',
          address: userData.addresses?.[0]?.areaOrVillage || '',
        });
      }

      // Load orders - get all orders for this customer (Firestore doesn't support != operator well)
      const ordersQuery = query(
        collection(db, COLLECTIONS.ORDERS),
        where('customerId', '==', user.uid)
      );
      const ordersSnap = await getDocs(ordersQuery);
      const ordersData: Order[] = [];
      ordersSnap.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() } as Order;
        // Filter out canceled orders client-side
        if (order.status !== OrderStatus.CANCELED) {
          ordersData.push(order);
        }
      });
      setOrders(ordersData.sort((a, b) => {
        const aDate = a.createdAt instanceof Date 
          ? a.createdAt 
          : (a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt && typeof a.createdAt.toDate === 'function')
          ? a.createdAt.toDate()
          : new Date();
        const bDate = b.createdAt instanceof Date 
          ? b.createdAt 
          : (b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt && typeof b.createdAt.toDate === 'function')
          ? b.createdAt.toDate()
          : new Date();
        return bDate.getTime() - aDate.getTime();
      }));

      // Load bookings - get all bookings for this customer (Firestore doesn't support != operator well)
      const bookingsQuery = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where('customerId', '==', user.uid)
      );
      const bookingsSnap = await getDocs(bookingsQuery);
      const bookingsData: Booking[] = [];
      bookingsSnap.forEach((doc) => {
        const booking = { id: doc.id, ...doc.data() } as Booking;
        // Filter out canceled bookings client-side
        if (booking.status !== BookingStatus.CANCELED) {
          bookingsData.push(booking);
        }
      });
      setBookings(bookingsData.sort((a, b) => {
        const aDate = a.createdAt instanceof Date 
          ? a.createdAt 
          : (a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt && typeof a.createdAt.toDate === 'function')
          ? a.createdAt.toDate()
          : new Date();
        const bDate = b.createdAt instanceof Date 
          ? b.createdAt 
          : (b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt && typeof b.createdAt.toDate === 'function')
          ? b.createdAt.toDate()
          : new Date();
        return bDate.getTime() - aDate.getTime();
      }));
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!userProfile || !user) return;

    if (!userProfile.id) {
      toast.showError('User profile ID is missing. Please refresh the page and try again.');
      return;
    }

    try {
      const userRef = doc(db, COLLECTIONS.USERS, userProfile.id);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        phone: formData.phone,
        updatedAt: new Date(),
      });

      setIsEditing(false);
      loadUserData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background-secondary py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6 lg:mb-8">Your Profile</h1>

        {/* Contact Information Card */}
        <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Contact Information</h2>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <Input
                label="Full Name"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
              <Input
                label="Email Address"
                value={user.email || ''}
                disabled
              />
              <Input
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label="Shipping Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button onClick={handleSaveChanges} className="w-full sm:w-auto">Save Changes</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-text-secondary">Full Name:</span>
                <p className="text-foreground">{userProfile?.displayName || user.displayName || 'Not set'}</p>
              </div>
              <div>
                <span className="text-sm text-text-secondary">Email Address:</span>
                <p className="text-foreground">{user.email}</p>
              </div>
              <div>
                <span className="text-sm text-text-secondary">Phone Number:</span>
                <p className="text-foreground">{userProfile?.phone || 'Not set'}</p>
              </div>
              <div>
                <span className="text-sm text-text-secondary">Shipping Address:</span>
                <p className="text-foreground">
                  {userProfile?.addresses?.[0]?.areaOrVillage || 'Not set'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-4 sm:mb-6 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <nav className="flex gap-4 sm:gap-8 min-w-max sm:min-w-0">
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-3 sm:pb-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-foreground'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`pb-3 sm:pb-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-foreground'
              }`}
            >
              Bookings
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`pb-3 sm:pb-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'invoices'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>Invoices</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length > 0 ? (
              orders.map((order) => {
                const orderDate = order.createdAt instanceof Date 
                  ? order.createdAt 
                  : (order.createdAt && typeof order.createdAt === 'object' && 'toDate' in order.createdAt && typeof order.createdAt.toDate === 'function')
                  ? order.createdAt.toDate()
                  : new Date();
                const isExpanded = order.id ? expandedOrders.has(order.id) : false;

                return (
                  <div key={order.id} className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">
                          Order #{order.orderNumber}
                        </h3>
                        <p className="text-xs sm:text-sm text-text-secondary">{formatDate(orderDate)}</p>
                      </div>
                      <StatusBadge status={order.status} variant="badge" />
                    </div>

                    <div className="mb-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2 text-xs sm:text-sm mb-2">
                          <span className="text-foreground wrap-break-word">
                            {item.productName} x {item.quantity}
                          </span>
                          <span className="text-foreground font-medium sm:font-normal">
                            {formatCurrency(item.subtotal, order.pricing.currency)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Order Tracking Status */}
                    {order.delivery && (
                      <div className="mb-4 p-3 sm:p-4 bg-background-secondary rounded-lg">
                        <button
                          onClick={() => {
                            setExpandedOrders((prev) => {
                              const newSet = new Set(prev);
                              if (order.id) {
                                if (newSet.has(order.id)) {
                                  newSet.delete(order.id);
                                } else {
                                  newSet.add(order.id);
                                }
                              }
                              return newSet;
                            });
                          }}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            <span className="font-medium text-sm sm:text-base text-foreground">Order Tracking</span>
                          </div>
                          <ChevronDown
                            className={cn(
                              'w-4 h-4 text-text-secondary transition-transform shrink-0',
                              isExpanded && 'transform rotate-180'
                            )}
                          />
                        </button>
                        
                        {isExpanded && (
                          <div className="mt-4 space-y-3 pt-4 border-t border-border">
                            {/* Fulfillment Method */}
                            <div className="flex items-start gap-3">
                              {order.delivery.method === FulfillmentMethod.PICKUP ? (
                                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                              ) : (
                                <Package className="w-5 h-5 text-primary mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">
                                  {order.delivery.method === FulfillmentMethod.PICKUP ? 'Pickup Order' : 'Delivery Order'}
                                </p>
                                {order.delivery.method === FulfillmentMethod.DELIVERY && order.delivery.address && (
                                  <p className="text-sm text-text-secondary mt-1">
                                    {order.delivery.address.areaOrVillage}
                                    {order.delivery.address.district && `, ${order.delivery.address.district}`}
                                    {order.delivery.address.region && `, ${order.delivery.address.region}`}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Tracking Number */}
                            {order.delivery.trackingNumber && (
                              <div className="flex items-start gap-3">
                                <Package className="w-5 h-5 text-primary mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">Tracking Number</p>
                                  <p className="text-sm text-text-secondary font-mono mt-1">
                                    {order.delivery.trackingNumber}
                                  </p>
                                  {order.delivery.carrier && (
                                    <p className="text-xs text-text-secondary mt-1">
                                      Carrier: {order.delivery.carrier}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Estimated Delivery */}
                            {order.delivery.estimatedDeliveryDate && (
                              <div className="flex items-start gap-3">
                                <Clock className="w-5 h-5 text-primary mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">Estimated Delivery</p>
                                  <p className="text-sm text-text-secondary mt-1">
                                    {formatDate(
                                      order.delivery.estimatedDeliveryDate instanceof Date
                                        ? order.delivery.estimatedDeliveryDate.toISOString()
                                        : order.delivery.estimatedDeliveryDate
                                    )}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Status Timeline */}
                            <div className="pt-3 border-t border-border">
                              <p className="text-sm font-medium text-foreground mb-2">Order Status Timeline</p>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    'w-2 h-2 rounded-full',
                                    order.status !== OrderStatus.PENDING && 'bg-success',
                                    order.status === OrderStatus.PENDING && 'bg-warning'
                                  )} />
                                  <span className="text-sm text-foreground">Order Placed</span>
                                  <span className="text-xs text-text-secondary ml-auto">
                                    {formatDate(orderDate)}
                                  </span>
                                </div>
                                
                                {order.status !== OrderStatus.PENDING && (
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      'w-2 h-2 rounded-full',
                                      [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.COMPLETED].includes(order.status)
                                        ? 'bg-success'
                                        : 'bg-border'
                                    )} />
                                    <span className="text-sm text-foreground">Payment Confirmed</span>
                                    {order.payment?.paidAt && (
                                      <span className="text-xs text-text-secondary ml-auto">
                                        {formatDate(
                                          order.payment.paidAt instanceof Timestamp
                                            ? order.payment.paidAt.toDate().toISOString()
                                            : order.payment.paidAt instanceof Date
                                            ? order.payment.paidAt.toISOString()
                                            : order.payment.paidAt
                                        )}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {[OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.COMPLETED].includes(order.status) && (
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      'w-2 h-2 rounded-full',
                                      [OrderStatus.SHIPPED, OrderStatus.COMPLETED].includes(order.status)
                                        ? 'bg-success'
                                        : 'bg-border'
                                    )} />
                                    <span className="text-sm text-foreground">Processing</span>
                                  </div>
                                )}

                                {[OrderStatus.SHIPPED, OrderStatus.COMPLETED].includes(order.status) && (
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      'w-2 h-2 rounded-full',
                                      order.status === OrderStatus.COMPLETED ? 'bg-success' : 'bg-primary'
                                    )} />
                                    <span className="text-sm text-foreground">Shipped</span>
                                  </div>
                                )}

                                {order.status === OrderStatus.COMPLETED && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-success" />
                                    <span className="text-sm text-foreground">Delivered/Completed</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pt-4 border-t border-border">
                      <div>
                        <span className="text-xs sm:text-sm text-text-secondary">Total:</span>
                        <span className="ml-2 font-semibold text-sm sm:text-base text-foreground">
                          {formatCurrency(order.pricing.total, order.pricing.currency)}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setExpandedOrders((prev) => {
                              const newSet = new Set(prev);
                              if (order.id) {
                                if (newSet.has(order.id)) {
                                  newSet.delete(order.id);
                                } else {
                                  newSet.add(order.id);
                                }
                              }
                              return newSet;
                            });
                          }}
                          className="w-full sm:w-auto"
                        >
                          {isExpanded ? 'Hide Details' : 'View Details'}
                        </Button>

                        {isExpanded && (<Button
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            router.push(`/orders/${order.id}`);
                          }}
                          className="w-full sm:w-auto"
                        >
                          View Full Details
                        </Button>)}
                        {order.status === OrderStatus.COMPLETED && (
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            Reorder
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-card rounded-lg shadow-sm p-6 sm:p-8 lg:p-12 text-center">
                <p className="text-sm sm:text-base text-text-secondary">No orders yet.</p>
                <Link href="/products" className="text-primary hover:text-primary-hover mt-2 inline-block transition-colors text-sm sm:text-base">
                  Start Shopping
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {bookings.length > 0 ? (
              bookings.map((booking) => {
                const bookingDate = booking.createdAt instanceof Date 
                  ? booking.createdAt 
                  : (booking.createdAt && typeof booking.createdAt === 'object' && 'toDate' in booking.createdAt && typeof booking.createdAt.toDate === 'function')
                  ? booking.createdAt.toDate()
                  : new Date();
                const timeSlot = booking.timeSlot;
                
                // Calculate if booking can be cancelled
                const startTime = timeSlot.startTime instanceof Date 
                  ? timeSlot.startTime 
                  : new Date(timeSlot.startTime);
                const now = new Date();
                const hoursUntilBooking = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                
                // Can only cancel if status allows it and within cancellation window
                const statusAllowsCancel = [
                  BookingStatus.PENDING,
                  BookingStatus.PAID,
                  BookingStatus.CONFIRMED
                ].includes(booking.status);
                
                // Can cancel if status allows AND there are enough hours remaining (>= cancellationTime)
                // Note: hoursUntilBooking must be >= cancellationTime to allow cancellation
                const canCancel = statusAllowsCancel && hoursUntilBooking >= cancellationTime;
                
                // Debug: Log cancellation info for troubleshooting
                if (statusAllowsCancel && process.env.NODE_ENV === 'development') {
                  console.log(`[Booking ${booking.bookingNumber}] Cancellation check:`, {
                    hoursUntilBooking: hoursUntilBooking.toFixed(2),
                    cancellationTime,
                    canCancel,
                    status: booking.status,
                    businessCancellationTime: business?.cancellationTime,
                  });
                }
                
                const isExpanded = booking.id ? expandedBookings.has(booking.id) : false;

                const handleCancelClick = () => {
                  if (booking.id) {
                    setShowCancelDialog(booking.id);
                  }
                };

                return (
                  <div key={booking.id} className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">
                          Booking #{booking.bookingNumber}
                        </h3>
                        <p className="text-xs sm:text-sm text-text-secondary">{formatDate(bookingDate)}</p>
                        <p className="text-xs sm:text-sm text-text-secondary">
                          Scheduled: {formatDate(startTime)} - {formatDate(
                            timeSlot.endTime instanceof Date 
                              ? timeSlot.endTime 
                              : new Date(timeSlot.endTime)
                          )}
                        </p>
                      </div>
                      <StatusBadge status={booking.status} variant="badge" />
                    </div>

                    <div className="mb-4">
                      <p className="text-foreground mb-2">{booking.serviceName}</p>
                      <p className="text-sm text-text-secondary">Duration: {booking.timeSlot.duration} minutes</p>
                      
                      {/* Cancellation info */}
                      {statusAllowsCancel && (
                        <>
                          {canCancel ? (
                            <div className="mt-2 p-2 bg-primary/10 border border-primary/20 rounded text-sm">
                              <p className="text-foreground">
                                You can cancel this booking up to {cancellationTime} hours before the scheduled time.
                              </p>
                              {hoursUntilBooking < cancellationTime * 2 && hoursUntilBooking >= cancellationTime && (
                                <p className="text-warning mt-1">
                                  ⚠️ Less than {Math.ceil(hoursUntilBooking)} hours remaining to cancel
                                </p>
                              )}
                            </div>
                          ) : hoursUntilBooking >= 0 ? (
                            <div className="mt-2 p-2 bg-warning/10 border border-warning/20 rounded text-sm">
                              <p className="text-foreground">
                                Cancellation deadline has passed. This booking cannot be cancelled.
                              </p>
                              <p className="text-xs text-text-secondary mt-1">
                                (Less than {cancellationTime} hours until scheduled time. Currently {hoursUntilBooking.toFixed(1)} hours remaining)
                              </p>
                            </div>
                          ) : (
                            <div className="mt-2 p-2 bg-background-secondary border border-border rounded text-sm">
                              <p className="text-foreground">
                                This booking has already passed.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pt-4 border-t border-border">
                      <div>
                        <span className="text-xs sm:text-sm text-text-secondary">Total:</span>
                        <span className="ml-2 font-semibold text-sm sm:text-base text-foreground">
                          {formatCurrency(booking.pricing.total, booking.pricing.currency)}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setExpandedBookings((prev) => {
                              const newSet = new Set(prev);
                              if (booking.id) {
                                if (newSet.has(booking.id)) {
                                  newSet.delete(booking.id);
                                } else {
                                  newSet.add(booking.id);
                                }
                              }
                              return newSet;
                            });
                          }}
                          className="w-full sm:w-auto"
                        >
                          {isExpanded ? 'Hide Details' : 'View Details'}
                        </Button>
                        {canCancel && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={handleCancelClick}
                            className="w-full sm:w-auto"
                          >
                            <XCircle className="w-4 h-4 mr-1.5" />
                            Cancel Booking
                          </Button>
                        )}
                        {booking.status === BookingStatus.COMPLETED && (
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            Rebook
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Booking Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <p className="text-text-secondary">Service</p>
                            <p className="text-foreground font-medium">{booking.serviceName}</p>
                          </div>
                          <div>
                            <p className="text-text-secondary">Duration</p>
                            <p className="text-foreground font-medium">{booking.timeSlot.duration} minutes</p>
                          </div>
                          <div>
                            <p className="text-text-secondary">Scheduled Date</p>
                            <p className="text-foreground font-medium">{formatDate(startTime)}</p>
                          </div>
                          <div>
                            <p className="text-text-secondary">Scheduled Time</p>
                            <p className="text-foreground font-medium">
                              {formatDate(startTime)} - {formatDate(
                                timeSlot.endTime instanceof Date 
                                  ? timeSlot.endTime 
                                  : new Date(timeSlot.endTime)
                              )}
                            </p>
                          </div>
                        </div>
                        {booking.payment && (
                          <div className="pt-3 border-t border-border">
                            <p className="text-sm text-text-secondary mb-2">Payment Information</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-text-secondary">Amount Paid:</span>
                                <span className="text-foreground font-medium">
                                  {formatCurrency(booking.payment.amount, booking.payment.currency)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-text-secondary">Payment Method:</span>
                                <span className="text-foreground capitalize">{booking.payment.paymentMethod}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="pt-3">
                          <Link href={`/bookings/${booking.id}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              View Full Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-card rounded-lg shadow-sm p-6 sm:p-8 lg:p-12 text-center">
                <p className="text-sm sm:text-base text-text-secondary">No bookings yet.</p>
                <Link href="/services" className="text-primary hover:text-primary-hover mt-2 inline-block transition-colors text-sm sm:text-base">
                  Browse Services
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && <CustomerInvoices />}
      </div>

      {/* Cancellation Dialog for Bookings */}
      {showCancelDialog && (() => {
        const booking = bookings.find(b => b.id === showCancelDialog);
        if (!booking?.id) return null;
        const bookingId = booking.id; // Store in a const to ensure TypeScript knows it's defined
        
        return (
          <CancellationDialog
            isOpen={!!showCancelDialog}
            onClose={() => setShowCancelDialog(null)}
            onConfirm={async (reason) => {
              try {
                await cancelBookingMutation.mutateAsync({
                  bookingId,
                  reason: reason?.trim() || undefined,
                });
                loadUserData();
                toast.showSuccess(SUCCESS_MESSAGES.BOOKING_CANCELED);
              } catch (error) {
                console.error('Error canceling booking:', error);
                toast.showError(getUserFriendlyMessage(error, ERROR_MESSAGES.UPDATE_FAILED));
                throw error;
              }
            }}
            itemType="booking"
            requireReason={false}
            isLoading={cancelBookingMutation.isPending}
          />
        );
      })()}
    </div>
  );
}


