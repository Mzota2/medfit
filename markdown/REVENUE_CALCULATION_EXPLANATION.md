# Revenue Calculation Explanation

## How `totalRevenue` is Calculated

### Collections Used

The `totalRevenue` metric is calculated from **two Firestore collections**:

1. **`orders`** collection (`COLLECTIONS.ORDERS`)
2. **`bookings`** collection (`COLLECTIONS.BOOKINGS`)

### Data Flow

1. **Data Fetching**: 
   - Uses `useOrders()` hook to fetch orders from the `orders` collection
   - Uses `useBookings()` hook to fetch bookings from the `bookings` collection
   - Both hooks query Firestore using the client-side Firebase SDK

2. **Filtering**:
   - **Analytics Page** (`/admin/analytics`): Only counts orders/bookings with status `PAID`
     ```typescript
     // Only count PAID orders
     orders.filter((o) => o.status === OrderStatus.PAID)
     
     // Only count PAID bookings
     bookings.filter((b) => b.status === BookingStatus.PAID)
     ```

   - **Main Dashboard** (`/admin`): Currently uses `payment.paidAt` check (needs update)
     ```typescript
     // Current implementation (should be updated)
     orders.filter((o) => o.payment?.paidAt)
     bookings.filter((b) => b.payment?.paidAt)
     ```

3. **Calculation**:
   ```typescript
   const totalRevenue = 
     // Sum of all PAID orders
     orders
       .filter((o) => o.status === OrderStatus.PAID)
       .reduce((sum, o) => sum + (o.pricing.total || 0), 0) +
     // Plus sum of all PAID bookings
     bookings
       .filter((b) => b.status === BookingStatus.PAID)
       .reduce((sum, b) => sum + (b.pricing.total || 0), 0);
   ```

### Key Points

- **Source**: `orders.pricing.total` and `bookings.pricing.total` fields
- **Status Filter**: Only `OrderStatus.PAID` and `BookingStatus.PAID` count toward revenue
- **Excluded**: Pending, failed, canceled, or any other status orders/bookings are NOT counted
- **Real-time**: Uses real-time subscriptions (`useRealtimeOrders`, `useRealtimeBookings`) for live updates

### Status Values

**Order Statuses** (from `OrderStatus` enum):
- `PENDING` - Not counted
- `PAID` - ✅ **Counted in revenue**
- `PROCESSING` - Not counted
- `SHIPPED` - Not counted
- `DELIVERED` - Not counted
- `COMPLETED` - Not counted
- `CANCELED` - Not counted
- `REFUNDED` - Not counted

**Booking Statuses** (from `BookingStatus` enum):
- `PENDING` - Not counted
- `CONFIRMED` - Not counted
- `PAID` - ✅ **Counted in revenue**
- `COMPLETED` - Not counted
- `CANCELED` - Not counted
- `REFUNDED` - Not counted

### Why Not Use Ledger Collection?

The revenue calculation **does NOT use the `ledger` collection** because:
- The ledger is an immutable audit trail created AFTER payment processing
- Orders/bookings are the source of truth for transaction amounts
- The ledger references orders/bookings but doesn't replace them for revenue calculation
- Using orders/bookings directly ensures we're counting actual business transactions

### Current Implementation Status

✅ **Analytics Page** (`/admin/analytics`): Correctly uses `OrderStatus.PAID` and `BookingStatus.PAID`

⚠️ **Main Dashboard** (`/admin`): Still uses `payment.paidAt` check - should be updated to match analytics page

### Recommended Fix

Update the main dashboard page to use the same status-based filtering:

```typescript
// Change from:
orders.filter((o) => o.payment?.paidAt)

// To:
orders.filter((o) => o.status === OrderStatus.PAID)
```

This ensures consistency across all revenue calculations.

