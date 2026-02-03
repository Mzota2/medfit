# useProducts vs useRealtimeProducts - Key Differences

## Overview

Both hooks work together to provide **initial data fetching** and **real-time updates** for products.

## useProducts Hook

### Purpose
**Initial data fetch** - Gets products from Firestore **once** when the component mounts.

### How It Works
```typescript
const { data: products, isLoading, error } = useProducts({ businessId });
```

1. Uses **React Query's `useQuery`**
2. Calls `getItems()` function (one-time Firestore query)
3. Caches the result in React Query cache
4. Returns `{ data, isLoading, error, refetch }`

### Characteristics
- ✅ **One-time fetch** - Runs once when component mounts
- ✅ **Caching** - Data cached by React Query (5 min stale time)
- ✅ **Loading states** - Automatic `isLoading` and `error` states
- ✅ **Request deduplication** - Multiple components = one request
- ✅ **Background refetching** - Can refetch on window focus/reconnect
- ❌ **Not real-time** - Won't update if data changes in Firestore

### When to Use
- Initial page load
- When you need loading/error states
- When you want caching
- When you need to refetch manually

---

## useRealtimeProducts Hook

### Purpose
**Real-time subscription** - Listens to Firestore changes and **updates React Query cache** automatically.

### How It Works
```typescript
useRealtimeProducts({ businessId });
```

1. Uses **Firestore `onSnapshot`** (real-time listener)
2. Subscribes to products collection
3. When data changes in Firestore → updates React Query cache
4. Component automatically re-renders with new data

### Characteristics
- ✅ **Real-time updates** - Automatically updates when Firestore data changes
- ✅ **Updates React Query cache** - Keeps cache in sync with Firestore
- ✅ **No loading states** - Doesn't provide loading/error (relies on useProducts)
- ✅ **Persistent connection** - Stays connected until component unmounts
- ❌ **No initial fetch** - Doesn't fetch data, only listens for changes

### When to Use
- When you need live updates (e.g., admin creates product, customer sees it immediately)
- When multiple users might modify data
- When you want UI to stay in sync with database

---

## How They Work Together

### Typical Usage Pattern

```typescript
// 1. Fetch initial data (with caching, loading states)
const { data: products, isLoading, error } = useProducts({ businessId });

// 2. Subscribe to real-time updates (updates cache automatically)
useRealtimeProducts({ businessId });

// Component automatically re-renders when:
// - Initial fetch completes (from useProducts)
// - Real-time update arrives (from useRealtimeProducts)
```

### Flow Diagram

```
Component Mounts
    ↓
useProducts → Fetches data → Caches in React Query → Component renders
    ↓
useRealtimeProducts → Subscribes to Firestore → Listens for changes
    ↓
[Admin creates product in Firestore]
    ↓
Firestore sends update → useRealtimeProducts receives it
    ↓
Updates React Query cache → Component re-renders with new data
```

---

## Why Both Are Needed

### Scenario: Admin Creates Product

**Without useRealtimeProducts:**
1. Customer sees products (from useProducts cache)
2. Admin creates new product in Firestore
3. Customer's page **doesn't update** ❌
4. Customer must refresh page to see new product

**With useRealtimeProducts:**
1. Customer sees products (from useProducts cache)
2. Admin creates new product in Firestore
3. Firestore sends update → useRealtimeProducts receives it
4. React Query cache updated → Customer sees new product **immediately** ✅

---

## Key Differences Summary

| Feature | useProducts | useRealtimeProducts |
|---------|------------|---------------------|
| **Initial Fetch** | ✅ Yes | ❌ No |
| **Real-time Updates** | ❌ No | ✅ Yes |
| **Caching** | ✅ Yes (React Query) | ✅ Updates cache |
| **Loading States** | ✅ Yes | ❌ No |
| **Error Handling** | ✅ Yes | ❌ No |
| **Request Deduplication** | ✅ Yes | ❌ No |
| **Firestore Connection** | One-time query | Persistent listener |
| **When Data Updates** | On mount/refetch | Automatically on Firestore changes |

---

## Best Practice

**Always use both together:**

```typescript
// ✅ Good - Both hooks together
const { data: products, isLoading } = useProducts({ businessId });
useRealtimeProducts({ businessId });

// ❌ Bad - Only useProducts (no real-time updates)
const { data: products } = useProducts({ businessId });

// ❌ Bad - Only useRealtimeProducts (no initial data, no loading states)
useRealtimeProducts({ businessId });
```

---

## Example: Products Page

```typescript
export default function ProductsPage() {
  const { currentBusiness } = useApp();

  // 1. Fetch initial products (with loading/error states)
  const { 
    data: products = [], 
    isLoading, 
    error 
  } = useProducts({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id,
  });

  // 2. Subscribe to real-time updates
  useRealtimeProducts({
    businessId: currentBusiness?.id,
    enabled: !!currentBusiness?.id,
  });

  // Component will:
  // - Show loading state while useProducts fetches
  // - Display products when fetch completes
  // - Automatically update when products change in Firestore
  // - Show error if useProducts fails

  if (isLoading) return <Loading />;
  if (error) return <Error />;
  
  return <ProductList products={products} />;
}
```

---

## Technical Details

### useProducts
- Uses `getItems()` from `@/lib/items`
- Returns `Promise<Item[]>` (one-time async operation)
- React Query handles caching, refetching, error states

### useRealtimeProducts
- Uses `subscribeToProducts()` from `@/stores/firebase-subscriptions`
- Uses Firestore `onSnapshot()` (persistent listener)
- Updates React Query cache via `queryClient.setQueryData()`
- Automatically cleans up subscription on unmount

---

## Summary

- **useProducts** = "Get me the data now" (initial fetch)
- **useRealtimeProducts** = "Keep me updated" (live updates)

They complement each other:
- `useProducts` provides initial data, loading states, and caching
- `useRealtimeProducts` keeps the cache updated in real-time

**Always use both for the best user experience!** 🚀

