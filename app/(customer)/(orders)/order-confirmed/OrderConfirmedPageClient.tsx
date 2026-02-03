'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Truck, Package, Calendar, MessageSquare, Star } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { COLLECTIONS } from '@/types/collections';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Order, FulfillmentMethod } from '@/types/order';
import { useDeliveryProviders } from '@/hooks/useDeliveryProviders';
import { MALAWI_DISTRICTS, MalawiRegion } from '@/types/delivery';
import { ReviewFormModal } from '@/components/reviews';
import { useApp } from '@/contexts/AppContext';
import { User } from 'firebase/auth';
import { PaymentConfirmation } from '@/components/confirmation';
import { useCart } from '@/contexts/CartContext';
import { ProductImage } from '@/components/ui/OptimizedImage';
import { hasUserReviewed } from '@/lib/reviews';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/ui';
import { ProductInvoice } from '@/components/invoice';
import { generateInvoiceNumber } from '@/lib/utils/invoiceUtils';
import { exportInvoicePdf } from '@/lib/exports/exports';
export default function OrderConfirmedPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const txRef = searchParams.get('txRef');
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'pending' | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [reviewItemId, setReviewItemId] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [showBusinessReviewPrompt, setShowBusinessReviewPrompt] = useState(false);
  const [hasDismissedBusinessReview, setHasDismissedBusinessReview] = useState(false);
  const [hasReviewedBusiness, setHasReviewedBusiness] = useState<boolean | null>(null);
  const [reviewedProducts, setReviewedProducts] = useState<Set<string>>(new Set());
  const { data: deliveryProviders } = useDeliveryProviders();
  const appContext = useApp();
  const currentBusiness = appContext.currentBusiness;
  const { user } = useAuth();
  const { clearCart } = useCart();
  const [isDownloading, setIsDownloading] = useState(false);

  const isPaymentSuccessful = paymentStatus === 'success' || (!txRef && order?.status === 'paid');

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
    
    // Check if user has reviewed the business
    const checkBusinessReview = async () => {
      if (!currentBusiness?.id || !user?.uid) return;
      try {
        
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

    // Check which products have been reviewed
    const checkProductReviews = async () => {
      if (!user?.uid || !order?.items) return;
      
      const reviewed = new Set<string>();
      
      for (const item of order.items) {
        try {
          const hasReviewed = await hasUserReviewed({
            userId: user.uid,
            businessId: currentBusiness?.id || '',
            reviewType: 'item',
            itemId: item.productId
          });
          
          if (hasReviewed) {
            reviewed.add(item.productId);
          }
        } catch (error) {
          console.error('Error checking product review:', error);
        }
      }
      
      setReviewedProducts(reviewed);
    };
    
    if (isPaymentSuccessful && currentBusiness?.id) {
      checkBusinessReview();
      checkProductReviews();
    }
  }, [orderId, isPaymentSuccessful, order?.items]);
  
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

  const loadOrder = async () => {
    try {
      if (!orderId) {
        setPaymentError('Order ID is missing');
        return;
      }
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        setOrder({ id: orderSnap.id, ...orderSnap.data() } as Order);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReceipt = async () => {
    if (!order) return;
    
    setIsDownloading(true);
    
    try {
      const invoiceNumber = generateInvoiceNumber(currentBusiness?.name || 'Business');
      const fileName = `product-invoice-${order.orderNumber || order.id}`;

      await exportInvoicePdf({
        type: 'order',
        order,
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

  
  // Clear cart when payment is successful (for cases where order status is already paid)
  useEffect(() => {
    if (isPaymentSuccessful && !txRef && order?.status === 'paid') {
      clearCart();
    }
  }, [isPaymentSuccessful, order?.status, txRef, clearCart]);

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
      loadingMessage="Loading order details..."
      notFound={!order}
      notFoundTitle="Order Not Found"
      notFoundActionLabel="Return to Home"
      notFoundActionHref="/"
      successTitle="Order Confirmed!"
      successMessage="Thank you for your purchase. Your order has been successfully placed and payment confirmed."
      defaultStatus={order?.status === 'paid' ? 'paid' : undefined}
      primaryAction={{
        label: 'Continue Shopping',
        href: '/products',
      }}
      secondaryAction={{
        label: 'View Order Details',
        href: order ? `/orders/${order.id}` : '/',
      }}
      tertiaryAction={{
        label: order && order.items.some(item => !reviewedProducts.has(item.productId)) ? 'Rate Product' : 'Product Rated',
        onClick: () => {
          if (order && order.items.length > 0) {
            // Find first unrated product
            const firstUnratedItem = order.items.find(item => !reviewedProducts.has(item.productId));
            if (firstUnratedItem) {
              setReviewItemId(firstUnratedItem.productId);
              setIsReviewModalOpen(true);
            }
          }
        },
        disabled: !order || order.items.every(item => reviewedProducts.has(item.productId))
      }}
    >
      {order && (
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
                'Download Product Invoice'
              )}
            </Button>
          </div>
          <div>
            {currentBusiness ? (
              <ProductInvoice 
                order={order} 
                business={currentBusiness} 
                invoiceNumber={generateInvoiceNumber(currentBusiness.name)}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Business information not available for invoice generation.</p>
              </div>
            )}
          </div>

        </>
      )}
    </PaymentConfirmation>

    {/* Review Modals */}
    {currentBusiness?.id && order && (
      <ReviewFormModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setReviewItemId(null);
        }}
        itemId={reviewItemId || undefined}
        businessId={currentBusiness.id}
        reviewType={reviewItemId ? "item" : "business"}
        orderId={order.id}
      />
    )}
    
    {/* Business Review Prompt */}
    {showBusinessReviewPrompt && !hasDismissedBusinessReview && currentBusiness?.id && order && hasReviewedBusiness === false && (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full sm:w-96 bg-card border border-border rounded-lg shadow-lg p-4 animate-fade-in-up">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-sm font-medium text-foreground">How was your experience with us?</h3>
          <button 
            onClick={() => setHasDismissedBusinessReview(true)}
            className="text-text-secondary hover:text-foreground"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <p className="text-xs text-text-secondary mb-3">
          {`We'd love to hear your feedback about your shopping experience.`}
        </p>
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHasDismissedBusinessReview(true)}
            className="text-xs"
          >
            Not Now
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setReviewItemId(null);
              setIsReviewModalOpen(true);
              setHasDismissedBusinessReview(true);
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

