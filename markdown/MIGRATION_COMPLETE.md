# Store to React Query Migration - Complete

## Summary

All Zustand store usage has been successfully migrated to React Query hooks across both customer and admin pages. The migration is complete and all linter errors have been resolved.

## Completed Migrations

### Customer Pages
1. ✅ **Homepage** (`app/(customer)/page.tsx`)
   - Migrated from: `useBusinessStore`, `useCategoriesStore`, `usePromotionsStore`, `useDeliveryProvidersStore`, `useProductsStore`, `useServicesStore`
   - Now uses: `useApp()`, `useProducts`, `useServices`, `useCategories`, `usePromotions`, `useDeliveryProviders`
   - Added real-time hooks: `useRealtimeProducts`, `useRealtimeServices`, `useRealtimeCategories`, `useRealtimePromotions`, `useRealtimeDeliveryProviders`

2. ✅ **Terms Page** (`app/(customer)/terms/page.tsx`)
   - Migrated from: `usePoliciesStore`, `useBusinessStore`
   - Now uses: `useApp()`, `useActivePolicyByType`

3. ✅ **Products Page** (`app/(customer)/(orders)/products/page.tsx`)
   - Already migrated in previous phase

4. ✅ **Services Page** (`app/(customer)/(bookings)/services/page.tsx`)
   - Already migrated in previous phase

### Admin Pages - List Pages
5. ✅ **Products Page** (`app/admin/(main)/products/page.tsx`)
   - Already migrated in previous phase

6. ✅ **Services Page** (`app/admin/(main)/services/page.tsx`)
   - Already migrated in previous phase

7. ✅ **Categories Page** (`app/admin/(main)/categories/page.tsx`)
   - Already migrated in previous phase

8. ✅ **Promotions Page** (`app/admin/(main)/promotions/page.tsx`)
   - Already migrated in previous phase

9. ✅ **Orders Page** (`app/admin/(main)/orders/page.tsx`)
   - Already migrated in previous phase

10. ✅ **Bookings Page** (`app/admin/(main)/bookings/page.tsx`)
    - Already migrated in previous phase

11. ✅ **Notifications Page** (`app/admin/(main)/notifications/page.tsx`)
    - Migrated from: `useNotificationsStore`
    - Now uses: `useNotifications`, `useRealtimeNotifications`, `useMarkNotificationAsRead`

12. ✅ **Payments Page** (`app/admin/(main)/payments/page.tsx`)
    - Migrated from: `usePaymentsStore`, `useOrdersStore`, `useBookingsStore`
    - Now uses: `usePayments`, `useRealtimePayments`, `useOrders`, `useBookings`

13. ✅ **Reviews Page** (`app/admin/(main)/reviews/page.tsx`)
    - Migrated from: `useReviewsStore`, `useProductsStore`, `useServicesStore`
    - Now uses: `useReviews`, `useRealtimeReviews`, `useDeleteReview`, `useProducts`, `useServices`

14. ✅ **Customers Page** (`app/admin/(main)/customers/page.tsx`)
    - Migrated from: `useCustomersStore`
    - Now uses: `useCustomers`, `useRealtimeCustomers`, `useUpdateCustomer`, `useDeleteCustomer`

15. ✅ **Analytics Page** (`app/admin/(main)/analytics/page.tsx`)
    - Migrated from: `useAnalyticsStore`, `useOrdersStore`, `useBookingsStore`, `useProductsStore`, `useServicesStore`, `useCustomersStore`
    - Now uses: `useApp()`, `useOrders`, `useBookings`, `useProducts`, `useServices`, `useCustomers`
    - Metrics are now calculated directly from React Query data using `useMemo`

16. ✅ **Dashboard Page** (`app/admin/(main)/page.tsx`)
    - Migrated from: `useAnalyticsStore`, `useOrdersStore`, `useBookingsStore`, `useProductsStore`, `useServicesStore`, `useCustomersStore`
    - Now uses: `useApp()`, `useOrders`, `useBookings`, `useProducts`, `useServices`, `useCustomers`
    - Metrics are now calculated directly from React Query data using `useMemo`

17. ✅ **Reports Page** (`app/admin/(main)/reports/page.tsx`)
    - Migrated from: `useReportsStore`
    - Now uses: `useApp()`, `useOrders`, `useBookings`, `useProducts`, `useServices`, `useCustomers`, `useLedgerEntries`
    - Reports are now calculated directly from React Query data using `useMemo`

### Admin Pages - New/Edit Pages
18. ✅ **Products New Page** (`app/admin/(main)/products/new/page.tsx`)
    - Migrated from: `useProductsStore`, `useCategoriesStore`
    - Now uses: `useApp()`, `useCreateProduct`, `useCategories`

19. ✅ **Products Edit Page** (`app/admin/(main)/products/[id]/edit/page.tsx`)
    - Migrated from: `useProductsStore`, `useCategoriesStore`
    - Now uses: `useApp()`, `useProduct`, `useUpdateProduct`, `useCategories`

20. ✅ **Services New Page** (`app/admin/(main)/services/new/page.tsx`)
    - Migrated from: `useServicesStore`, `useCategoriesStore`
    - Now uses: `useApp()`, `useCreateService`, `useCategories`

21. ✅ **Services Edit Page** (`app/admin/(main)/services/[id]/edit/page.tsx`)
    - Migrated from: `useServicesStore`, `useCategoriesStore`
    - Now uses: `useApp()`, `useService`, `useUpdateService`, `useCategories`

22. ✅ **Categories New Page** (`app/admin/(main)/categories/new/page.tsx`)
    - Migrated from: `useCategoriesStore`
    - Now uses: `useApp()`, `useCreateCategory`

23. ✅ **Categories Edit Page** (`app/admin/(main)/categories/[id]/edit/page.tsx`)
    - Migrated from: `useCategoriesStore`
    - Now uses: `useCategory`, `useUpdateCategory`

24. ✅ **Promotions New Page** (`app/admin/(main)/promotions/new/page.tsx`)
    - Migrated from: `usePromotionsStore`, `useProductsStore`, `useServicesStore`
    - Now uses: `useApp()`, `useCreatePromotion`, `useProducts`, `useServices`

25. ✅ **Promotions Edit Page** (`app/admin/(main)/promotions/[id]/edit/page.tsx`)
    - Migrated from: `usePromotionsStore`, `useProductsStore`, `useServicesStore`
    - Now uses: `useApp()`, `usePromotion`, `useUpdatePromotion`, `useProducts`, `useServices`

### Admin Settings Pages
26. ✅ **Policies Section** (`app/admin/settings/policies-section.tsx`)
    - Migrated from: `usePoliciesStore`
    - Now uses: `useApp()`, `usePolicies`, `useRealtimePolicies`, `useUpdatePolicy`

27. ✅ **Delivery Section** (`app/admin/settings/delivery-section.tsx`)
    - Migrated from: `useDeliveryProvidersStore`
    - Now uses: `useApp()`, `useDeliveryProviders`, `useRealtimeDeliveryProviders`, `useCreateDeliveryProvider`, `useUpdateDeliveryProvider`, `useDeleteDeliveryProvider`

## New Hooks Created

1. ✅ `useCustomers` - Fetch customers
2. ✅ `useRealtimeCustomers` - Real-time customer updates
3. ✅ `useUpdateCustomer` - Update customer mutation
4. ✅ `useDeleteCustomer` - Delete customer mutation
5. ✅ `useCustomerByUid` - Fetch customer by UID
6. ✅ `useCustomerByEmail` - Fetch customer by email

## Key Changes

### Mutation Signatures
- **Products/Services**: Mutations now accept the item data directly (with `businessId` included in the data)
- **Categories**: Mutations accept `{ categoryData, businessId }`
- **Promotions**: Mutations accept `{ promotionData, businessId }`
- **All Updates**: Use `{ itemId, updates }` or `{ categoryId, updates }` pattern

### Real-time Updates
- All pages that need real-time updates now use `useRealtime*` hooks
- Real-time hooks automatically update React Query cache

### Metrics and Reports
- Analytics and reports are now calculated directly from React Query data using `useMemo`
- No longer dependent on Zustand stores for data aggregation

### Error Handling
- All error handling now uses React Query's built-in error states
- Error messages are properly typed and displayed

## Next Steps

1. **Remove Old Stores**: Once everything is verified working, the old Zustand stores can be removed:
   - `main/stores/products.ts`
   - `main/stores/services.ts`
   - `main/stores/categories.ts`
   - `main/stores/orders.ts`
   - `main/stores/bookings.ts`
   - `main/stores/promotions.ts`
   - `main/stores/business.ts`
   - `main/stores/delivery.ts`
   - `main/stores/ledger.ts`
   - `main/stores/notifications.ts`
   - `main/stores/payments.ts`
   - `main/stores/policies.ts`
   - `main/stores/reports.ts`
   - `main/stores/reviews.ts`
   - `main/stores/customers.ts`
   - `main/stores/analytics.ts`

2. **Testing**: Test all pages to ensure data fetching and mutations work correctly

3. **Performance**: Monitor React Query cache performance and adjust `staleTime` and `gcTime` if needed

## Notes

- All linter errors have been resolved
- All hooks are properly exported from `main/hooks/index.ts`
- Real-time subscriptions are properly managed with `subscriptionManager`
- Business ID is now consistently obtained from `useApp()` context

