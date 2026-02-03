# Firebase Real-time Integration Guide

This guide explains how to use the Firebase real-time subscriptions with Zustand stores.

## Overview

All stores now support real-time Firebase subscriptions using Firestore's `onSnapshot` API. This means your Zustand stores will automatically update when data changes in Firebase, without needing to manually refetch.

## Basic Usage

### Starting a Subscription

```typescript
'use client';

import { useProductsStore } from '@/stores';
import { useEffect } from 'react';

export default function ProductsPage() {
  const { items, loading, subscribe, unsubscribe } = useProductsStore();

  useEffect(() => {
    // Start real-time subscription
    subscribe({ status: 'active' });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {items.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

### Subscription vs Fetch

- **`fetchProducts()`** - One-time fetch, doesn't update automatically
- **`subscribe()`** - Real-time subscription, automatically updates when Firebase data changes

You can use either approach depending on your needs:

```typescript
// One-time fetch (good for initial load or when you don't need real-time updates)
await fetchProducts({ status: 'active' });

// Real-time subscription (good for dashboards, live data, etc.)
subscribe({ status: 'active' });
```

## Available Stores with Subscriptions

All stores support real-time subscriptions:

1. **Products Store** - `useProductsStore().subscribe()`
2. **Services Store** - `useServicesStore().subscribe()`
3. **Bookings Store** - `useBookingsStore().subscribe()`
4. **Orders Store** - `useOrdersStore().subscribe()`
5. **Customers Store** - `useCustomersStore().subscribe()`
6. **Admins/Staff Store** - `useAdminsStaffStore().subscribe()`
7. **Notifications Store** - `useNotificationsStore().subscribe()`
8. **Ledgers Store** - `useLedgersStore().subscribe()`
9. **Business Store** - `useBusinessStore().subscribe()`
10. **Policies Store** - `usePoliciesStore().subscribe()`

## Subscription Options

Each store accepts different options based on the collection:

### Products & Services
```typescript
subscribe({
  status: 'active',
  categoryId: 'cat123',
  limit: 50,
  featured: true
});
```

### Orders
```typescript
subscribe({
  customerId: 'user123',
  status: 'pending',
  limit: 20
});
```

### Bookings
```typescript
subscribe({
  customerId: 'user123',
  serviceId: 'service123',
  status: 'confirmed',
  limit: 20
});
```

### Notifications
```typescript
subscribe({
  userId: 'user123',
  unreadOnly: true,
  limit: 50
});
```

## Managing Subscriptions

### Check Subscription Status

```typescript
const { isSubscribed, subscriptionKey } = useProductsStore();
```

### Multiple Subscriptions

Each store can only have one active subscription at a time. Starting a new subscription will automatically unsubscribe from the previous one:

```typescript
// This will unsubscribe from the previous subscription
subscribe({ status: 'active' });
subscribe({ featured: true }); // Previous subscription is automatically cleaned up
```

### Manual Cleanup

Always unsubscribe when your component unmounts:

```typescript
useEffect(() => {
  subscribe({ status: 'active' });
  
  return () => {
    unsubscribe(); // Important: cleanup on unmount
  };
}, []);
```

## Global Subscription Management

The `subscriptionManager` automatically tracks all subscriptions and can clean them up:

```typescript
import { subscriptionManager } from '@/stores/firebase-subscriptions';

// Remove all subscriptions (useful on logout)
subscriptionManager.removeAll();
```

## Best Practices

1. **Use subscriptions for live data** - Dashboards, real-time updates, notifications
2. **Use fetch for one-time loads** - Initial page loads, search results, reports
3. **Always cleanup** - Unsubscribe in useEffect cleanup functions
4. **Don't mix approaches** - Either use subscribe OR fetch, not both simultaneously
5. **Handle errors** - Subscriptions have error callbacks built-in, but handle them in your UI

## Example: Real-time Dashboard

```typescript
'use client';

import { useOrdersStore, useBookingsStore } from '@/stores';
import { useEffect } from 'react';

export default function Dashboard() {
  const orders = useOrdersStore((state) => state.items);
  const bookings = useBookingsStore((state) => state.items);
  const { subscribe: subscribeOrders, unsubscribe: unsubscribeOrders } = useOrdersStore();
  const { subscribe: subscribeBookings, unsubscribe: unsubscribeBookings } = useBookingsStore();

  useEffect(() => {
    // Subscribe to pending orders
    subscribeOrders({ status: 'pending' });
    
    // Subscribe to confirmed bookings
    subscribeBookings({ status: 'confirmed' });

    return () => {
      unsubscribeOrders();
      unsubscribeBookings();
    };
  }, []);

  return (
    <div>
      <h2>Pending Orders: {orders.length}</h2>
      <h2>Confirmed Bookings: {bookings.length}</h2>
    </div>
  );
}
```

## Performance Considerations

- **Limit results** - Always use `limit` option when possible
- **Filter early** - Use Firestore queries to filter data, not client-side
- **Unsubscribe when not needed** - Don't keep subscriptions active on pages that don't need them
- **Use selectors** - Use Zustand selectors to prevent unnecessary re-renders

```typescript
// Good: Only re-renders when items change
const items = useProductsStore((state) => state.items);

// Bad: Re-renders on any store change
const store = useProductsStore();
```

## Error Handling

Subscriptions automatically handle errors and log them to the console. For production, you may want to add custom error handling:

```typescript
// The subscription functions have built-in error handling
// But you can wrap them if needed:

try {
  subscribe({ status: 'active' });
} catch (error) {
  console.error('Failed to subscribe:', error);
  // Fallback to fetch
  await fetchProducts({ status: 'active' });
}
```

## Migration from Fetch to Subscribe

If you're currently using `fetch*` methods, migrating to subscriptions is easy:

**Before:**
```typescript
useEffect(() => {
  fetchProducts({ status: 'active' });
}, []);
```

**After:**
```typescript
useEffect(() => {
  subscribe({ status: 'active' });
  return () => unsubscribe();
}, []);
```

The data will automatically update when Firebase changes, without needing to manually refetch!

