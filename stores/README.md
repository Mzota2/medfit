# Zustand State Management Stores

This directory contains all Zustand stores for managing Firebase collection state across the application.

## Overview

All Firebase collections are managed through dedicated Zustand stores, providing:
- Centralized state management
- Type-safe state and actions
- Efficient data caching
- Easy data fetching and mutations
- Computed values and analytics

## Available Stores

### 1. Products Store (`products.ts`)
Manages products (Items with `type='product'`)

```typescript
import { useProductsStore } from '@/stores';

const { items, loading, fetchProducts, addProduct, updateProduct } = useProductsStore();
```

**Key Actions:**
- `fetchProducts(options?)` - Fetch all products
- `fetchProductById(id)` - Fetch single product
- `addProduct(product)` - Create new product
- `updateProduct(id, updates)` - Update product
- `removeProduct(id)` - Delete product
- `getProduct(id)` - Get product from cache

### 2. Services Store (`services.ts`)
Manages services (Items with `type='service'`)

```typescript
import { useServicesStore } from '@/stores';

const { items, loading, fetchServices, addService, updateService } = useServicesStore();
```

**Key Actions:**
- `fetchServices(options?)` - Fetch all services
- `fetchServiceById(id)` - Fetch single service
- `addService(service)` - Create new service
- `updateService(id, updates)` - Update service
- `removeService(id)` - Delete service

### 3. Bookings Store (`bookings.ts`)
Manages service bookings

```typescript
import { useBookingsStore } from '@/stores';

const { items, loading, fetchBookings, updateBooking, cancelBooking } = useBookingsStore();
```

**Key Actions:**
- `fetchBookings(options?)` - Fetch bookings with filters
- `fetchBookingById(id)` - Fetch single booking
- `fetchBookingByNumber(number)` - Fetch by booking number
- `updateBooking(id, updates)` - Update booking status
- `cancelBooking(id, reason?)` - Cancel a booking

### 4. Orders Store (`orders.ts`)
Manages product orders

```typescript
import { useOrdersStore } from '@/stores';

const { items, loading, fetchOrders, updateOrder, cancelOrder } = useOrdersStore();
```

**Key Actions:**
- `fetchOrders(options?)` - Fetch orders with filters
- `fetchOrderById(id)` - Fetch single order
- `fetchOrderByNumber(number)` - Fetch by order number
- `updateOrder(id, updates)` - Update order status
- `cancelOrder(id, reason?)` - Cancel an order

### 5. Customers Store (`customers.ts`)
Manages customers (Users with `role='customer'`)

```typescript
import { useCustomersStore } from '@/stores';

const { items, loading, fetchCustomers, updateCustomer } = useCustomersStore();
```

**Key Actions:**
- `fetchCustomers()` - Fetch all customers
- `fetchCustomerById(id)` - Fetch single customer
- `fetchCustomerByUid(uid)` - Fetch by Firebase UID
- `fetchCustomerByEmail(email)` - Fetch by email
- `updateCustomer(id, updates)` - Update customer
- `removeCustomer(id)` - Soft delete customer

### 6. Admins/Staff Store (`admins-staff.ts`)
Manages admins and staff (Users with `role='admin'` or `role='staff'`)

```typescript
import { useAdminsStaffStore } from '@/stores';

const { items, loading, fetchAdmins, fetchStaff, fetchAll } = useAdminsStaffStore();
```

**Key Actions:**
- `fetchAdmins()` - Fetch all admins
- `fetchStaff()` - Fetch all staff
- `fetchAll()` - Fetch both admins and staff
- `fetchUserById(id)` - Fetch single user
- `updateUser(id, updates)` - Update user
- `removeUser(id)` - Soft delete user

### 7. Notifications Store (`notifications.ts`)
Manages notifications

```typescript
import { useNotificationsStore } from '@/stores';

const { items, loading, fetchNotificationsByUserId, markAsRead } = useNotificationsStore();
```

**Key Actions:**
- `fetchNotifications(options?)` - Fetch all notifications
- `fetchNotificationsByUserId(userId, options?)` - Fetch user notifications
- `fetchNotificationById(id)` - Fetch single notification
- `markAsRead(id)` - Mark notification as read
- `markAllAsRead(userId)` - Mark all user notifications as read
- `getUnreadCount(userId)` - Get unread count

### 8. Ledgers Store (`ledgers.ts`)
Manages ledger entries (immutable financial records)

```typescript
import { useLedgersStore } from '@/stores';

const { items, loading, fetchLedgerEntries, getTotal } = useLedgersStore();
```

**Key Actions:**
- `fetchLedgerEntries(options?)` - Fetch ledger entries with filters
- `fetchLedgerEntryById(id)` - Fetch single entry
- `getEntriesByOrder(orderId)` - Get entries for an order
- `getEntriesByBooking(bookingId)` - Get entries for a booking
- `getTotal(options?)` - Calculate total (credits - debits)

**Note:** Ledger entries are immutable and can only be created server-side.

### 9. Business Store (`business.ts`)
Manages business information

```typescript
import { useBusinessStore } from '@/stores';

const { items, currentBusiness, fetchBusinesses, setCurrentBusiness } = useBusinessStore();
```

**Key Actions:**
- `fetchBusinesses(options?)` - Fetch all businesses
- `fetchBusinessById(id)` - Fetch single business
- `addBusiness(data)` - Create new business
- `updateBusiness(id, updates)` - Update business
- `setCurrentBusiness(business)` - Set active business

### 10. Policies Store (`policies.ts`)
Manages business policies (terms, privacy, etc.)

```typescript
import { usePoliciesStore } from '@/stores';

const { items, fetchPolicies, fetchActivePolicyByType } = usePoliciesStore();
```

**Key Actions:**
- `fetchPolicies(options?)` - Fetch all policies
- `fetchPolicyById(id)` - Fetch single policy
- `fetchActivePolicyByType(type)` - Fetch active policy by type
- `addPolicy(policy)` - Create new policy
- `updatePolicy(id, updates)` - Update policy
- `getActivePolicy(type)` - Get active policy from cache

### 11. Analytics Store (`analytics.ts`)
Calculates analytics metrics from collections (not stored in Firebase)

```typescript
import { useAnalyticsStore } from '@/stores';

const { metrics, loading, calculateAnalytics, refresh } = useAnalyticsStore();
```

**Key Actions:**
- `calculateAnalytics(options?)` - Calculate all metrics
- `refresh()` - Recalculate metrics

**Metrics Provided:**
- Revenue metrics (total, today, month, year)
- Order metrics (counts, averages, by status)
- Booking metrics (counts, averages, by status)
- Product/Service counts
- Customer metrics
- Financial metrics (income, expenses, profit)
- Growth metrics (percentage changes)

### 12. Reports Store (`reports.ts`)
Generates various business reports

```typescript
import { useReportsStore } from '@/stores';

const { currentReport, generateSalesReport, generateProductSalesReport } = useReportsStore();
```

**Key Actions:**
- `generateSalesReport(startDate, endDate)` - Generate sales report
- `generateProductSalesReport(startDate, endDate)` - Product sales breakdown
- `generateServiceBookingsReport(startDate, endDate)` - Service bookings breakdown
- `generateCustomerReport(startDate?, endDate?)` - Customer activity report
- `clearReport()` - Clear current reports

## Usage Examples

### Basic Usage

```typescript
'use client';

import { useProductsStore } from '@/stores';
import { useEffect } from 'react';

export default function ProductsPage() {
  const { items, loading, error, fetchProducts } = useProductsStore();

  useEffect(() => {
    fetchProducts({ status: 'active' });
  }, [fetchProducts]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {items.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

### Using Multiple Stores

```typescript
'use client';

import { useOrdersStore, useBookingsStore, useAnalyticsStore } from '@/stores';

export default function Dashboard() {
  const orders = useOrdersStore((state) => state.items);
  const bookings = useBookingsStore((state) => state.items);
  const { metrics, calculateAnalytics } = useAnalyticsStore();

  useEffect(() => {
    calculateAnalytics();
  }, [calculateAnalytics]);

  return (
    <div>
      <h1>Orders: {orders.length}</h1>
      <h1>Bookings: {bookings.length}</h1>
      <h1>Total Revenue: {metrics?.totalRevenue}</h1>
    </div>
  );
}
```

### Optimistic Updates

```typescript
const { updateOrder, items } = useOrdersStore();

const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
  try {
    // Optimistic update
    const order = items.find(o => o.id === orderId);
    if (order) {
      // Update UI immediately
      // ...
    }
    
    // Then sync with server
    await updateOrder(orderId, { status });
  } catch (error) {
    // Handle error and revert optimistic update
  }
};
```

### Selectors for Performance

```typescript
// Only re-render when specific data changes
const activeProducts = useProductsStore(
  (state) => state.items.filter(p => p.status === 'active')
);

// Or use a memoized selector
const memoizedProducts = useMemo(
  () => items.filter(p => p.status === 'active'),
  [items]
);
```

## Resetting All Stores

```typescript
import { resetAllStores } from '@/stores';

// Useful on logout
const handleLogout = () => {
  resetAllStores();
  // ... other logout logic
};
```

## Best Practices

1. **Fetch on Mount**: Use `useEffect` to fetch data when components mount
2. **Use Selectors**: Use Zustand selectors to prevent unnecessary re-renders
3. **Error Handling**: Always handle errors from async actions
4. **Loading States**: Check loading states before rendering data
5. **Cache Management**: Use `get*` helper methods to access cached data
6. **Cleanup**: Clear stores when navigating away or on logout

## Notes

- All stores use Firebase Firestore as the data source
- Data is cached in memory for performance
- Stores automatically update when data is modified
- Analytics and Reports are calculated from cached collection data
- Ledger entries are immutable and can only be created server-side
- Notifications, Orders, and Bookings can be created via API routes

