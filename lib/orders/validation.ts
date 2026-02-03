import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';

export async function validateInventory(items: Array<{productId: string, quantity: number}>): Promise<{valid: boolean, message?: string}> {
  for (const item of items) {
    const itemRef = doc(db, COLLECTIONS.ITEMS, item.productId);
    const itemSnap = await getDoc(itemRef);
    
    if (!itemSnap.exists()) {
      return { valid: false, message: `Product not found: ${item.productId}` };
    }

    const itemData = itemSnap.data();
    
    // Skip inventory check for non-products or items that don't track inventory
    if (itemData.type !== 'product' || !itemData.inventory?.trackInventory) {
      continue;
    }

    const available = itemData.inventory.available || 0;
    if (available < item.quantity) {
      return { 
        valid: false, 
        message: `Insufficient stock for ${itemData.name}. Available: ${available}, Requested: ${item.quantity}` 
      };
    }
  }
  
  return { valid: true };
}
