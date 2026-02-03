# State Management Fixes - Implementation Guide

## Immediate Fixes Applied

### 1. Fixed Race Conditions
- Added check for `currentBusiness?.id` before fetching products/services
- Removed function dependencies from useEffect to prevent unnecessary re-renders
- Added early return if business is not loaded

### 2. Fixed Subscription Management
- Properly unsubscribe on unmount
- Only subscribe when business is loaded
- Avoid multiple subscriptions

### 3. Fixed Query Dependencies
- Removed function references from dependency arrays
- Only depend on actual values (businessId, filters)
- Use eslint-disable for intentional omissions

## Remaining Issues & Solutions

### Issue 1: Business Not Loading Before Products/Services

**Problem**: Products page tries to fetch before business is loaded.

**Solution Options**:

#### Option A: Load Business in Layout (Recommended)
```typescript
// In app/(customer)/layout.tsx
'use client';
import { useEffect } from 'react';
import { useBusinessStore } from '@/stores/business';

export default function CustomerLayout({ children }) {
  const { currentBusiness, fetchSingleBusiness, loading } = useBusinessStore();
  
  useEffect(() => {
    if (!currentBusiness && !loading) {
      fetchSingleBusiness();
    }
  }, [currentBusiness, loading, fetchSingleBusiness]);
  
  // Show loading while business loads
  if (!currentBusiness && loading) {
    return <div>Loading...</div>;
  }
  
  return <>{children}</>;
}
```

#### Option B: Add Loading State to Products Page
```typescript
// In products page
if (!currentBusiness?.id && businessLoading) {
  return <Loading />;
}
```

### Issue 2: State Not Persisting Across Navigation

**Problem**: Zustand state resets on navigation in Next.js App Router.

**Solution**: This is expected behavior. Two approaches:

#### Approach 1: Accept It (Recommended for Now)
- Fetch data on each page
- Use subscriptions for real-time updates
- Accept that initial load happens on each page

#### Approach 2: Use React Query
- Install: `npm install @tanstack/react-query`
- React Query handles caching automatically
- State persists across navigation
- Better performance

### Issue 3: Index Issues

**Problem**: Different query combinations require different indexes.

**Solution**: 
1. Standardize query patterns
2. Create all possible index combinations upfront
3. Document which queries are used where

**Standard Query Patterns**:
```typescript
// Pattern 1: Basic (type + createdAt)
where('type', '==', 'product')
orderBy('createdAt', 'desc')

// Pattern 2: With business (businessId + type + createdAt)
where('businessId', '==', businessId)
where('type', '==', 'product')
orderBy('createdAt', 'desc')

// Pattern 3: With status (businessId + type + status + createdAt)
where('businessId', '==', businessId)
where('type', '==', 'product')
where('status', '==', status)
orderBy('createdAt', 'desc')

// Pattern 4: With category (businessId + type + categoryIds + createdAt)
where('businessId', '==', businessId)
where('type', '==', 'product')
where('categoryIds', 'array-contains', categoryId)
orderBy('createdAt', 'desc')
```

## Best Practices Going Forward

### 1. Data Fetching Strategy

**For Server Data (Products, Services, Categories)**:
- ✅ Fetch on page mount
- ✅ Use subscriptions for real-time updates
- ✅ Cache at page level (not global)
- ✅ Refetch when filters change
- ❌ Don't keep in global state

**For UI State (Filters, Preferences)**:
- ✅ Keep in component state or Zustand
- ✅ Persist to localStorage if needed
- ✅ Share across components if needed

### 2. Loading States

Always show loading states:
```typescript
if (loading || !currentBusiness?.id) {
  return <Loading />;
}
```

### 3. Error Handling

Always handle errors:
```typescript
if (error) {
  return <Error message={error} />;
}
```

### 4. Subscription Management

- Subscribe only when needed
- Unsubscribe on unmount
- Use cleanup functions properly

### 5. Query Construction

- Build queries consistently
- Use same patterns everywhere
- Document all query combinations
- Create indexes for all combinations

## Migration to React Query (Future)

When ready to migrate:

1. Install React Query
2. Create QueryClient provider
3. Replace Zustand stores with React Query hooks
4. Keep Zustand only for UI state
5. Use React Query's cache invalidation

Example:
```typescript
// Before (Zustand)
const { items, fetchProducts } = useProductsStore();
useEffect(() => {
  fetchProducts(options);
}, [options]);

// After (React Query)
const { data: products, isLoading } = useQuery({
  queryKey: ['products', options],
  queryFn: () => getItems({ ...options, type: 'product' }),
});
```

## Quick Reference

### What to Keep in Zustand
- ✅ Filters state
- ✅ UI preferences
- ✅ Modal states
- ✅ Form state (unsaved)

### What NOT to Keep in Zustand
- ❌ Products list
- ❌ Services list
- ❌ Categories list
- ❌ Orders list
- ❌ Large datasets

### When to Fetch
- ✅ On page mount
- ✅ When filters change
- ✅ After mutations (create/update/delete)
- ❌ Don't fetch on every render

### When to Use Subscriptions
- ✅ For real-time updates
- ✅ When data changes frequently
- ❌ Don't use for initial fetch (use regular fetch)

