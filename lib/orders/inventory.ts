import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { ItemStatus } from '@/types/item';

interface OrderItemData {
  productId?: string;
  quantity?: number;
}

type InventoryData = {
  trackInventory?: boolean;
  quantity?: number;
  reserved?: number;
  available?: number;
};

type ItemDocData = {
  type?: string;
  name?: string;
  status?: ItemStatus;
  inventory?: InventoryData;
  updatedAt?: unknown;
};

type OrderDocData = {
  items?: OrderItemData[];
  inventoryReleased?: boolean;
  inventoryUpdated?: boolean;
};

const asOrderDocData = (data: unknown): OrderDocData => {
  if (!data || typeof data !== 'object') return {};
  return data as OrderDocData;
};

const asItemDocData = (data: unknown): ItemDocData => {
  if (!data || typeof data !== 'object') return {};
  return data as ItemDocData;
};

/**
 * Reserve inventory when an order is created
 */
export async function reserveInventory(orderId: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[INVENTORY] Reserving inventory for order: ${orderId}`);
  }
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const orderData = asOrderDocData(orderSnap.data());
  const items = orderData.items || [];
  const batch = writeBatch(db);

  for (const item of items) {
    if (!item.productId || !item.quantity) continue;

    const itemRef = doc(db, COLLECTIONS.ITEMS, item.productId);
    const itemSnap = await getDoc(itemRef);
    
    if (!itemSnap.exists()) continue;
    
    const itemData = asItemDocData(itemSnap.data());
    if (itemData.type !== 'product' || !itemData.inventory?.trackInventory) continue;

    const currentReserved = itemData.inventory?.reserved || 0;
    const newReserved = currentReserved + item.quantity;
    const available = (itemData.inventory?.quantity || 0) - newReserved;

    if (available < 0) {
      throw new Error(`Insufficient stock for product: ${itemData.name}`);
    }

    batch.update(itemRef, {
      'inventory.reserved': newReserved,
      'inventory.available': available,
      updatedAt: serverTimestamp()
    });
  }

  await batch.commit();
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[INVENTORY] Successfully reserved inventory for order: ${orderId}`);
  }
}

/**
 * Release inventory when an order is canceled
 */
export async function releaseInventory(orderId: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[INVENTORY] Releasing inventory for order: ${orderId}`);
  }
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    console.warn(`[INVENTORY] Order not found: ${orderId}`);
    return;
  }

  const orderData = asOrderDocData(orderSnap.data());
  if (orderData.inventoryReleased) {
    console.log(`[INVENTORY] Inventory already released for order: ${orderId}`);
    return;
  }

  const items = orderData.items || [];
  const batch = writeBatch(db);

  for (const item of items) {
    if (!item.productId || !item.quantity) continue;

    const itemRef = doc(db, COLLECTIONS.ITEMS, item.productId);
    const itemSnap = await getDoc(itemRef);
    
    if (!itemSnap.exists()) continue;

    const itemData = asItemDocData(itemSnap.data());
    if (itemData.type !== 'product' || !itemData.inventory?.trackInventory) continue;

    const currentReserved = itemData.inventory?.reserved || 0;
    const newReserved = Math.max(0, currentReserved - item.quantity);
    const available = (itemData.inventory?.quantity || 0) - newReserved;

    batch.update(itemRef, {
      'inventory.reserved': newReserved,
      'inventory.available': available,
      updatedAt: serverTimestamp()
    });
  }

  // Mark order as having released inventory
  batch.update(orderRef, {
    inventoryReleased: true,
    updatedAt: serverTimestamp()
  });

  await batch.commit();
  console.log(`[INVENTORY] Successfully released inventory for order: ${orderId}`);
}

/**
 * Adjust product inventory when an order has been successfully paid.
 * 
 * - Decrements inventory.quantity and inventory.reserved by the ordered quantity
 * - Recomputes inventory.available
 * - Marks products as OUT_OF_STOCK when available is 0 or less
 * - Marks the order with inventoryUpdated = true to ensure idempotency
 */
export const adjustInventoryForPaidOrder = async (orderId: string): Promise<void> => {
  console.log(`[INVENTORY] Adjusting inventory for paid order: ${orderId}`);
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    console.warn(`[INVENTORY] Order not found: ${orderId}`);
    return;
  }

  const orderData = asOrderDocData(orderSnap.data());
  console.log(`[INVENTORY] Order found, inventoryUpdated flag:`, orderData.inventoryUpdated);

  if (orderData.inventoryUpdated) {
    console.log(`[INVENTORY] Inventory already updated for order: ${orderId}`);
    return;
  }

  const items: OrderItemData[] = orderData.items || [];
  console.log(`[INVENTORY] Processing ${items.length} items for order ${orderId}`);
  const batch = writeBatch(db);

  for (const orderItem of items) {
    if (!orderItem.productId || !orderItem.quantity) continue;

    try {
      const itemRef = doc(db, COLLECTIONS.ITEMS, orderItem.productId);
      const itemSnap = await getDoc(itemRef);
      if (!itemSnap.exists()) {
        console.warn(`[INVENTORY] Item not found: ${orderItem.productId}`);
        continue;
      }

      const itemData = asItemDocData(itemSnap.data());

      // Only adjust inventory for products
      if (itemData.type !== 'product') {
        console.log(`[INVENTORY] Skipping non-product item: ${orderItem.productId}`);
        continue;
      }

      const inventory = itemData.inventory;
      if (!inventory || inventory.trackInventory === false) {
        console.log(`[INVENTORY] Inventory tracking disabled for item: ${orderItem.productId}`);
        continue;
      }

      // Get current values with proper type checking and defaults
      const currentQuantity = typeof inventory.quantity === 'number' ? inventory.quantity : 0;
      const currentReserved = typeof inventory.reserved === 'number' ? inventory.reserved : 0;
      const currentAvailable = typeof inventory.available === 'number' ? inventory.available : currentQuantity - currentReserved;
      const orderedQty = orderItem.quantity;

      // Calculate new values
      const newQuantity = Math.max(0, currentQuantity - orderedQty);
      const newReserved = Math.max(0, currentReserved - orderedQty);
      
      // Ensure available is never negative and properly reflects quantity - reserved
      const available = Math.max(0, newQuantity - newReserved);
      
      // Log detailed inventory information for debugging
      console.log(`[INVENTORY] Item ${orderItem.productId} inventory details:`, {
        current: { quantity: currentQuantity, reserved: currentReserved, available: currentAvailable },
        ordered: orderedQty,
        new: { quantity: newQuantity, reserved: newReserved, available },
        currentStatus: itemData.status
      });

      // Prepare inventory updates
      const updates: Record<string, unknown> = {
        inventory: {
          ...inventory,
          quantity: newQuantity,
          reserved: newReserved,
          available: available, // Explicitly set available to ensure consistency
          updatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      };
      
      // If this is a Firestore document, we need to use the serverTimestamp
      if (
        itemData.updatedAt &&
        typeof itemData.updatedAt === 'object' &&
        'toDate' in itemData.updatedAt
      ) {
        delete updates.updatedAt; // Let Firestore handle the server timestamp
      }

      // Update status based on available quantity
      if (available <= 0) {
        if (itemData.status !== ItemStatus.OUT_OF_STOCK) {
          console.log(`[INVENTORY] Marking item as out of stock: ${orderItem.productId}`);
          updates.status = ItemStatus.OUT_OF_STOCK;
        }
      } else if (itemData.status === ItemStatus.OUT_OF_STOCK) {
        console.log(`[INVENTORY] Marking item as back in stock: ${orderItem.productId}`);
        updates.status = ItemStatus.ACTIVE;
      }

      batch.update(itemRef, updates);
    } catch (error) {
      console.error(`[INVENTORY] Error adjusting inventory for order item`, {
        orderId,
        productId: orderItem.productId,
        error,
      });
      // Continue with other items even if one fails
    }
  }

  // Mark order as processed for inventory to avoid double deductions
  batch.update(orderRef, {
    inventoryUpdated: true,
    updatedAt: serverTimestamp()
  });

  try {
    await batch.commit();
    console.log(`[INVENTORY] Successfully updated inventory for order: ${orderId}`);
  } catch (error) {
    console.error(`[INVENTORY] Failed to commit batch update for order: ${orderId}`, error);
    throw error;
  }
};
