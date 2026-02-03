# State Management Best Practices Guide

## Current Problems Identified

1. **Race Conditions**: Products/services depend on `currentBusiness` which may not be loaded
2. **State Not Persisting**: Zustand stores reset on navigation in Next.js App Router
3. **Multiple Subscriptions**: Conflicting subscriptions causing index issues
4. **No Cache Strategy**: Unclear when to refetch vs use cached data
5. **Query Construction**: Dynamic queries causing index problems

## What Should Be in State vs What Shouldn't

### ✅ SHOULD Be in State (Zustand/Context)

1. **UI State** (filters, modals, sidebar state)
   - Current filters (category, price range, etc.)
   - UI preferences (theme, layout)
   - Modal open/close states
   - Form state (unsaved changes)

2. **User Session State** (AuthContext)
   - Current user
   - User role
   - Authentication status

3. **Shopping Cart** (CartContext)
   - Cart items
   - Selected variants
   - Temporary selections

4. **Business Context** (if single-tenant)
   - Current business ID (if app is business-specific)

### ❌ SHOULD NOT Be in State (Fetch on Demand)

1. **Server Data** (Products, Services, Categories, Orders)
   - These should be fetched when needed
   - Use React Query or fetch directly in components
   - Cache at component/page level, not global state

2. **Large Lists** (All products, all services)
   - Too much data to keep in memory
   - Fetch with pagination
   - Use server-side filtering when possible

3. **Frequently Changing Data** (Inventory, prices)
   - Changes too often to keep in sync
   - Fetch fresh when needed

## Recommended Approach: Hybrid Pattern

### Option 1: Keep Zustand for UI State Only (Recommended for Now)

**Keep in Zustand:**
- Filters state
- UI preferences
- Current business ID (if needed globally)

**Fetch Directly:**
- Products/services on each page
- Use React Query or simple `useEffect` with proper caching
- Cache at page level, not global

### Option 2: Use React Query (Best Long-term Solution)

Install React Query:
```bash
npm install @tanstack/react-query
```

**Benefits:**
- Automatic caching
- Background refetching
- Request deduplication
- Optimistic updates
- Better error handling

**What React Query Handles:**
- All server data (products, services, categories)
- Automatic cache invalidation
- Refetching strategies
- Loading/error states

**What Zustand Handles:**
- UI state only
- Filters
- User preferences

## Implementation Strategy

### Current Issues to Fix:

1. **Business ID Dependency**
   - Ensure business is loaded before fetching products
   - Use loading states properly
   - Handle case when business is not available

2. **Subscription Management**
   - Only subscribe when data is actually needed
   - Unsubscribe properly on unmount
   - Avoid multiple subscriptions for same data

3. **Query Construction**
   - Build queries consistently
   - Use same query structure everywhere
   - Document required indexes

4. **Cache Strategy**
   - Decide: fetch fresh or use cached?
   - Set appropriate cache times
   - Invalidate cache on mutations

## Quick Fixes for Current Setup

1. **Add Business Loading Check**
   ```typescript
   useEffect(() => {
     if (!currentBusiness?.id) {
       // Wait for business to load
       return;
     }
     // Fetch products
   }, [currentBusiness?.id]);
   ```

2. **Simplify Queries**
   - Use consistent query patterns
   - Document all query combinations
   - Create indexes for all combinations upfront

3. **Add Cache Keys**
   - Use consistent cache keys based on filters
   - Check cache before fetching
   - Set cache expiration times

4. **Better Error Handling**
   - Show loading states
   - Handle errors gracefully
   - Retry failed requests

## Migration Path

### Phase 1: Fix Current Issues (Now)
- Add proper loading checks
- Fix subscription management
- Simplify query construction
- Add error handling

### Phase 2: Optimize (Next)
- Add React Query for server state
- Keep Zustand for UI state only
- Implement proper caching
- Add request deduplication

### Phase 3: Advanced (Future)
- Server-side rendering for initial data
- Optimistic updates
- Background sync
- Offline support

