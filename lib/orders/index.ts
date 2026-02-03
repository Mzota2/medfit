import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '@/types';
import { Order, OrderStatus, StatusUpdate } from '@/types/order';
import { NotFoundError, ValidationError } from '../utils/errors';
import { isValidOrderStatusTransition } from '@/lib/utils/validation';
import { createOrder } from './create';

export { createOrder };

/**
 * Get order by ID
 */
export const getOrderById = async (orderId: string): Promise<Order> => {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const orderSnap = await getDoc(orderRef);
  
  if (!orderSnap.exists()) {
    throw new NotFoundError('Order');
  }
  
  return { id: orderSnap.id, ...orderSnap.data() } as Order;
};

/**
 * Get order by order number
 */
export const getOrderByNumber = async (orderNumber: string): Promise<Order | null> => {
  const ordersRef = collection(db, COLLECTIONS.ORDERS);
  const q = query(ordersRef, where('orderNumber', '==', orderNumber), limit(1));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Order;
};

/**
 * Get orders with filters
 */
export const getOrders = async (options?: {
  customerId?: string;
  customerEmail?: string;
  status?: OrderStatus;
  limit?: number;
  lastDocId?: string;
}): Promise<{ orders: Order[]; lastDocId?: string; hasMore: boolean }> => {
  const ordersRef = collection(db, COLLECTIONS.ORDERS);
  let q = query(ordersRef);
  
  if (options?.customerId) {
    q = query(q, where('customerId', '==', options.customerId));
  }
  
  if (options?.customerEmail) {
    q = query(q, where('customerEmail', '==', options.customerEmail));
  }
  
  if (options?.status) {
    q = query(q, where('status', '==', options.status));
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const querySnapshot = await getDocs(q);
  const orders = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Order[];
  
  const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
  const hasMore = querySnapshot.docs.length === (options?.limit || 10);
  
  return {
    orders,
    lastDocId: lastDoc?.id,
    hasMore
  };
};

/**
 * Update order
 */
export const updateOrder = async (orderId: string, updates: Partial<Order>): Promise<void> => {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const orderSnap = await getDoc(orderRef);
  
  if (!orderSnap.exists()) {
    throw new NotFoundError('Order');
  }
  
  const currentOrder = { id: orderSnap.id, ...orderSnap.data() } as Order;
  const isStatusUpdate = updates.status && updates.status !== currentOrder.status;
  
  // Prepare the update data
  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  // Handle status update
  if (isStatusUpdate) {
    const newStatus = updates.status as OrderStatus;
    
    // Validate status transition
    if (!isValidOrderStatusTransition(currentOrder.status, newStatus)) {
      throw new ValidationError(
        `Cannot change order status from ${currentOrder.status} to ${newStatus}. Invalid status transition.`
      );
    }

    // Add to status history
    const statusUpdate: StatusUpdate = {
      status: newStatus,
      updatedAt: new Date(),
      updatedBy: 'admin', // In a real app, this would be the current user's ID
    };

    // Add reason if provided in the updates
    if (updates.statusHistory?.[updates.statusHistory.length - 1]?.reason) {
      statusUpdate.reason = updates.statusHistory[updates.statusHistory.length - 1].reason;
    }

    updateData.statusHistory = [
      ...(currentOrder.statusHistory || []),
      statusUpdate
    ];

    // Set specific timestamps based on status
    if (newStatus === OrderStatus.CANCELED) {
      updateData.canceledAt = new Date();
    } else if (newStatus === OrderStatus.REFUNDED) {
      updateData.refundedAt = new Date();
    } else if (newStatus === OrderStatus.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (newStatus === OrderStatus.PAID) {
      updateData.payment = {
        ...currentOrder.payment,
        paidAt: new Date(),
      };
    }
  }

  // Update the order
  await updateDoc(orderRef, updateData);

  // Send notifications if status changed
  if (isStatusUpdate) {
    try {
      const { notifyOrderStatusChange } = await import('@/lib/notifications');
      await notifyOrderStatusChange({
        customerEmail: currentOrder.customerEmail,
        customerId: currentOrder.customerId || '',
        orderId: currentOrder?.id || '',
        orderNumber: currentOrder.orderNumber,
        status: updates.status as OrderStatus,
        previousStatus: currentOrder.status,
      });
    } catch (error) {
      console.error('Error sending order status notification:', error);
      // Don't fail the update if notification fails
    }
  }
};

/**
 * Cancel order
 */
export const cancelOrder = async (orderId: string, reason?: string): Promise<void> => {
  const order = await getOrderById(orderId);
  
  if (order.status === OrderStatus.COMPLETED) {
    throw new ValidationError('Cannot cancel a completed order');
  }
  
  if (order.status === OrderStatus.CANCELED) {
    throw new ValidationError('Order is already canceled');
  }
  
  await updateOrder(orderId, {
    status: OrderStatus.CANCELED,
    canceledAt: new Date(),
    canceledReason: reason,
  });
};
