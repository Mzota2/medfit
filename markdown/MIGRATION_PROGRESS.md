# Store to React Query Migration Progress

## ✅ Completed Migrations

### Customer Pages
1. **Homepage (`app/(customer)/page.tsx`)**
   - ✅ Migrated from `useBusinessStore`, `useCategoriesStore`, `usePromotionsStore`, `useDeliveryProvidersStore`, `useProductsStore`, `useServicesStore`
   - ✅ Now uses: `useApp()`, `useProducts`, `useServices`, `useCategories`, `usePromotions`, `useDeliveryProviders`
   - ✅ Added real-time hooks: `useRealtimeProducts`, `useRealtimeServices`, `useRealtimeCategories`, `useRealtimePromotions`, `useRealtimeDeliveryProviders`

2. **Terms Page (`app/(customer)/terms/page.tsx`)**
   - ✅ Migrated from `usePoliciesStore`, `useBusinessStore`
   - ✅ Now uses: `useApp()`, `useActivePolicyByType`, `useBusinesses`

### Admin Pages
3. **Notifications Page (`app/admin/(main)/notifications/page.tsx`)**
   - ✅ Migrated from `useNotificationsStore`
   - ✅ Now uses: `useNotifications`, `useRealtimeNotifications`, `useMarkNotificationAsRead`

4. **Payments Page (`app/admin/(main)/payments/page.tsx`)**
   - ✅ Migrated from `usePaymentsStore`, `useOrdersStore`, `useBookingsStore`
   - ✅ Now uses: `useApp()`, `usePayments`, `useRealtimePayments`, `useOrders`, `useBookings`

5. **Reviews Page (`app/admin/(main)/reviews/page.tsx`)**
   - ✅ Migrated from `useReviewsStore`, `useProductsStore`, `useServicesStore`
   - ✅ Now uses: `useApp()`, `useReviews`, `useRealtimeReviews`, `useDeleteReview`, `useProducts`, `useServices`

## ⏳ Remaining Migrations

### Admin Pages (High Priority)
6. **Products New/Edit Pages** (`app/admin/(main)/products/new/page.tsx`, `[id]/edit/page.tsx`)
   - Uses: `useProductsStore`, `useCategoriesStore`
   - Needs: `useCreateProduct`, `useUpdateProduct`, `useCategories`

7. **Services New/Edit Pages** (`app/admin/(main)/services/new/page.tsx`, `[id]/edit/page.tsx`)
   - Uses: `useServicesStore`, `useCategoriesStore`
   - Needs: `useCreateService`, `useUpdateService`, `useCategories`

8. **Categories New/Edit Pages** (`app/admin/(main)/categories/new/page.tsx`, `[id]/edit/page.tsx`)
   - Uses: `useCategoriesStore`
   - Needs: `useCreateCategory`, `useUpdateCategory`

9. **Promotions New/Edit Pages** (`app/admin/(main)/promotions/new/page.tsx`, `[id]/edit/page.tsx`)
   - Uses: `usePromotionsStore`
   - Needs: `useCreatePromotion`, `useUpdatePromotion`

10. **Customers Page** (`app/admin/(main)/customers/page.tsx`)
    - Uses: `useCustomersStore`
    - Needs: Create `useCustomers` hook (not yet created)

### Settings Pages
11. **Policies Section** (`app/admin/settings/policies-section.tsx`)
    - Uses: `usePoliciesStore`
    - Needs: `usePolicies`, `useUpdatePolicy`, `useRealtimePolicies`

12. **Delivery Section** (`app/admin/settings/delivery-section.tsx`)
    - Uses: `useDeliveryProvidersStore`
    - Needs: `useDeliveryProviders`, `useCreateDeliveryProvider`, `useUpdateDeliveryProvider`, `useDeleteDeliveryProvider`, `useRealtimeDeliveryProviders`

### Complex Pages (May Need Special Handling)
13. **Reports Page** (`app/admin/(main)/reports/page.tsx`)
    - Uses: `useReportsStore` (generates reports from other data)
    - Note: Reports store generates reports from orders/bookings data
    - May need to keep some store logic or refactor to use hooks directly

14. **Analytics Page** (`app/admin/(main)/analytics/page.tsx`)
    - Uses: `useAnalyticsStore`, `useOrdersStore`, `useBookingsStore`, `useProductsStore`, `useServicesStore`, `useCustomersStore`
    - Note: Analytics store calculates metrics from other stores
    - May need to keep some store logic or calculate from React Query data

15. **Dashboard Page** (`app/admin/(main)/page.tsx`)
    - Uses: `useAnalyticsStore`, `useOrdersStore`, `useBookingsStore`, `useProductsStore`, `useServicesStore`, `useCustomersStore`
    - Similar to analytics - calculates metrics from multiple sources

## Missing Hooks

The following hooks need to be created:
- `useCustomers` - For customer management (users with role='customer')
- `useRealtimeCustomers` - Real-time customer updates

## Migration Pattern

All migrations follow this pattern:

1. **Replace store imports:**
   ```typescript
   // Old
   import { useProductsStore } from '@/stores/products';
   const { items, loading, fetchProducts } = useProductsStore();
   
   // New
   import { useProducts, useRealtimeProducts } from '@/hooks';
   const { data: items = [], isLoading: loading } = useProducts({ ... });
   useRealtimeProducts({ ... });
   ```

2. **Replace mutations:**
   ```typescript
   // Old
   const { addProduct } = useProductsStore();
   await addProduct(data);
   
   // New
   import { useCreateProduct } from '@/hooks';
   const createProduct = useCreateProduct();
   await createProduct.mutateAsync(data);
   ```

3. **Use AppContext for business ID:**
   ```typescript
   // Old
   const { currentBusiness } = useBusinessStore();
   
   // New
   import { useApp } from '@/contexts/AppContext';
   const { currentBusiness } = useApp();
   ```

4. **Remove useEffect for fetching:**
   - React Query automatically fetches when enabled
   - Real-time hooks handle subscriptions

## Notes

- All migrated pages have been tested for linter errors
- Real-time subscriptions are properly managed with cleanup
- Error handling has been updated to work with React Query error types

