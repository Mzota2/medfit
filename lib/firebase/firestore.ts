/**
 * Firestore helpers and typed collection references
 */

import { db } from './config';
import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/types/collections';
import type {
  Order,
  Booking,
  Item,
  User,
  Notification,
  Policy,
  LedgerEntry,
} from '@/types';

/**
 * Typed collection helper
 */
export const getCollection = <T>(
  collectionName: string
): CollectionReference<T> => {
  return collection(db, collectionName) as CollectionReference<T>;
};

/**
 * Typed document reference helper
 */
export const getDocRef = <T>(
  collectionName: string,
  docId: string
): DocumentReference<T> => {
  return doc(db, collectionName, docId) as DocumentReference<T>;
};

/**
 * Typed collection references
 */
export const ordersCollection = getCollection<Order>(COLLECTIONS.ORDERS);
export const bookingsCollection = getCollection<Booking>(COLLECTIONS.BOOKINGS);
export const itemsCollection = getCollection<Item>(COLLECTIONS.ITEMS);
export const usersCollection = getCollection<User>(COLLECTIONS.USERS);
export const notificationsCollection = getCollection<Notification>(COLLECTIONS.NOTIFICATIONS);
export const policiesCollection = getCollection<Policy>(COLLECTIONS.POLICIES);
export const ledgerCollection = getCollection<LedgerEntry>(COLLECTIONS.LEDGER);

/**
 * Typed document reference helpers
 */
export const getOrderRef = (orderId: string) => getDocRef<Order>(COLLECTIONS.ORDERS, orderId);
export const getBookingRef = (bookingId: string) => getDocRef<Booking>(COLLECTIONS.BOOKINGS, bookingId);
export const getItemRef = (itemId: string) => getDocRef<Item>(COLLECTIONS.ITEMS, itemId);
export const getUserRef = (userId: string) => getDocRef<User>(COLLECTIONS.USERS, userId);
export const getNotificationRef = (notificationId: string) => getDocRef<Notification>(COLLECTIONS.NOTIFICATIONS, notificationId);
export const getPolicyRef = (policyId: string) => getDocRef<Policy>(COLLECTIONS.POLICIES, policyId);
export const getLedgerEntryRef = (entryId: string) => getDocRef<LedgerEntry>(COLLECTIONS.LEDGER, entryId);

