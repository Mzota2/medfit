/**
 * Order creation utilities
 * Server-side order creation logic
 */

import { CreateOrderInput, Order, OrderStatus } from '@/types/order';
import { generateOrderNumber } from '@/lib/utils/formatting';
import { COLLECTIONS } from '@/types/collections';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Create an order in Firestore
 * This should be called from server-side code (API routes)
 */
export const createOrder = async (input: CreateOrderInput): Promise<string> => {
  const orderNumber = generateOrderNumber();

  // Automatically get businessId
  const { getBusinessId } = await import('@/lib/businesses/utils');
  const businessId = await getBusinessId();

  const orderData: Omit<Order, 'id'> = {
    orderNumber,
    businessId,
    customerId: input.customerId,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    status: OrderStatus.PENDING,
    items: input.items,
    pricing: {
      subtotal: input.items.reduce((sum, item) => sum + item.subtotal, 0),
      tax: 0, // Calculate based on business rules
      shipping: 0, // Calculate based on delivery method
      discount: 0, // Apply promotions
      total: 0, // Calculate total
      currency: 'MWK',
    },
    delivery: input.delivery,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };

  const orderRef = await addDoc(collection(db, COLLECTIONS.ORDERS), orderData);
  return orderRef.id;
};

