/**
 * Immutable ledger entry creation
 * Ledger entries are created server-side only and never modified or deleted
 */

import { db } from '@/lib/firebase/config';
import { collection, addDoc, setDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/collections';
import { CreateLedgerEntryInput, LedgerEntry, LedgerEntryStatus } from '@/types/ledger';
import { shouldCreateLedgerEntry } from './utils';

/**
 * Create a ledger entry
 * This must be called from server-side code only (API routes, Cloud Functions)
 * Ledger entries are immutable - once created, they cannot be modified or deleted
 * 
 * Note: If manual generation is enabled in settings, this will not auto-create entries.
 * Use generateLedgerFromOrders or generateLedgerFromBookings instead.
 */
export const createLedgerEntry = async (
  input: CreateLedgerEntryInput,
  skipSettingsCheck: boolean = false, // Allow manual creation even when auto-creation is disabled
  customId?: string // Optional custom ID for idempotency (e.g., "payment_${transactionId}")
): Promise<string | null> => {
  // Check settings unless explicitly skipped (for manual generation)
  if (!skipSettingsCheck) {
    const shouldCreate = await shouldCreateLedgerEntry();
    if (!shouldCreate) {
      console.log('Ledger auto-creation is disabled. Use manual generation instead.');
      return null;
    }
  }

  // Validate that required fields are present
  if (!input.entryType || !input.amount || !input.currency || !input.description) {
    throw new Error('Missing required fields for ledger entry');
  }

  // Check for duplicate entries (idempotency)
  // If customId is provided, check if entry with that ID already exists
  if (customId) {
    const existingRef = doc(db, COLLECTIONS.LEDGER, customId);
    const existingDoc = await getDoc(existingRef);
    if (existingDoc.exists()) {
      console.warn('Ledger entry already exists with custom ID:', customId);
      return customId;
    }
  }

  // If orderId or bookingId is provided, check if entry already exists
  if (input.orderId) {
    const existingEntry = await checkExistingLedgerEntry(
      input.entryType,
      input.orderId
    );
    if (existingEntry) {
      console.warn('Ledger entry already exists for order:', input.orderId);
      return existingEntry;
    }
  }

  if (input.bookingId) {
    const existingEntry = await checkExistingLedgerEntry(
      input.entryType,
      undefined,
      input.bookingId
    );
    if (existingEntry) {
      console.warn('Ledger entry already exists for booking:', input.bookingId);
      return existingEntry;
    }
  }

  // Automatically get businessId
  const { getBusinessId } = await import('@/lib/businesses/utils');
  const businessId = await getBusinessId();

  const ledgerEntry: Omit<LedgerEntry, 'id'> = {
    entryType: input.entryType,
    status: LedgerEntryStatus.CONFIRMED,
    amount: input.amount,
    currency: input.currency,
    businessId,
    orderId: input.orderId,
    bookingId: input.bookingId,
    paymentId: input.paymentId,
    description: input.description,
    metadata: input.metadata,
    createdAt: serverTimestamp() as unknown as Date,
    updatedAt: serverTimestamp() as unknown as Date,
  };

  // Use custom ID if provided (for idempotency), otherwise use auto-generated ID
  if (customId) {
    const docRef = doc(db, COLLECTIONS.LEDGER, customId);
    await setDoc(docRef, ledgerEntry);
    return customId;
  } else {
    const docRef = await addDoc(
      collection(db, COLLECTIONS.LEDGER),
      ledgerEntry
    );
    return docRef.id;
  }
};

/**
 * Check if a ledger entry already exists for an order or booking
 * This helps ensure idempotency
 */
const checkExistingLedgerEntry = async (
  _entryType: string,
  _orderId?: string,
  _bookingId?: string
): Promise<string | null> => {
  void _entryType;
  void _orderId;
  void _bookingId;

  // This is a simplified check
  // In production, you'd want to query the ledger collection
  // to find existing entries matching the criteria
  
  // For now, return null (no existing entry found)
  // This should be implemented with a proper Firestore query
  return null;
};

/**
 * Reverse a ledger entry (create a reversal entry)
 * This creates a new entry with negative amount, not modifying the original
 */
export const reverseLedgerEntry = async (
  originalEntryId: string,
  reason: string,
  reversedBy: string
): Promise<string> => {
  // Get the original entry
  const originalEntryRef = doc(db, COLLECTIONS.LEDGER, originalEntryId);
  const originalEntryDoc = await getDoc(originalEntryRef);

  if (!originalEntryDoc.exists()) {
    throw new Error('Original ledger entry not found');
  }

  const originalEntry = originalEntryDoc.data() as LedgerEntry;

  // Create reversal entry
  const reversalEntry: Omit<LedgerEntry, 'id'> = {
    entryType: originalEntry.entryType,
    status: LedgerEntryStatus.REVERSED,
    amount: -originalEntry.amount, // Negative amount for reversal
    currency: originalEntry.currency,
    orderId: originalEntry.orderId,
    bookingId: originalEntry.bookingId,
    paymentId: originalEntry.paymentId,
    description: `Reversal: ${originalEntry.description}`,
    metadata: {
      ...originalEntry.metadata,
      reversedEntryId: originalEntryId,
      reversalReason: reason,
    },
    reversedAt: serverTimestamp() as unknown as Date,
    reversedBy,
    reversalReason: reason,
    createdAt: serverTimestamp() as unknown as Date,
    updatedAt: serverTimestamp() as unknown as Date,
  };

  const docRef = await addDoc(
    collection(db, COLLECTIONS.LEDGER),
    reversalEntry
  );

  // Update original entry to mark it as reversed
  // Note: We're not modifying the original entry's amount or other immutable fields
  // We're just adding metadata about the reversal
  // In practice, you might want to add a 'reversedBy' field to track this

  return docRef.id;
};

