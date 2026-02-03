# Shopping Experience - Missing Components & Pages

## Overview
This document outlines the remaining components and pages needed for a complete shopping experience on both customer and admin sides.

---

## 🛒 Customer-Facing Pages (Missing)

### 1. **Service Booking Flow** ⚠️ HIGH PRIORITY
- **`/services/[slug]/book`** - Service booking page
  - Contact form (extract name/phone from user if logged in)
  - Display booking fee vs total fee
  - Partial payment option (pay booking fee only if `allowPartialPayment` is true)
  - Create booking and payment session
  - Redirect to book-confirmed page
  
- **`/bookings/book-confirmed`** - Booking confirmation page
  - Success message
  - Booking details display
  - Payment confirmation
  - Link to view booking details

### 2. **Order Management** ⚠️ HIGH PRIORITY
- **`/orders/[id]`** - Individual order detail page
  - Full order information
  - Order items with images
  - Delivery address (using new Address structure)
  - Delivery provider information
  - Order status timeline/tracking
  - Payment information
  - Ability to cancel (if status allows)
  - Download invoice/receipt

### 3. **Booking Management** ⚠️ HIGH PRIORITY
- **`/bookings/[id]`** - Individual booking detail page
  - Full booking information
  - Service details
  - Time slot information
  - Booking status timeline
  - Payment information (including partial payment status)
  - Ability to cancel (if status allows)
  - Pay remaining balance (if partial payment was made)

### 4. **Address Management** ⚠️ MEDIUM PRIORITY
- **`/settings/addresses`** - Address management page
  - List of saved addresses
  - Add new address (using Address structure with district/region)
  - Edit existing address
  - Delete address
  - Set default address
  - Use address from profile page

### 5. **Enhanced Features** ⚠️ MEDIUM PRIORITY
- **Product Reviews Display**
  - Show reviews/ratings on product detail pages (`/products/[slug]`)
  - Average rating display
  - Review list with pagination
  
- **Service Reviews Display**
  - Show reviews/ratings on service detail pages (`/services/[slug]`)
  - Average rating display
  - Review list with pagination

### 6. **Order Confirmation Updates** ⚠️ LOW PRIORITY
- **`/order-confirmed`** - Update existing page
  - Use new Address structure for display
  - Show delivery provider information
  - Show delivery cost breakdown
  - Better formatting for address display

---

## 👨‍💼 Admin-Facing Pages (Missing)

### 1. **Order Detail Management** ⚠️ HIGH PRIORITY
- **`/admin/orders/[id]`** - Detailed order management page
  - Full order information
  - Customer details
  - Order items with images
  - Delivery address and provider
  - Order status management
  - Update order status (with timeline)
  - Add tracking number
  - Add notes
  - Cancel/refund order
  - View payment details
  - Print invoice/packing slip

### 2. **Booking Detail Management** ⚠️ HIGH PRIORITY
- **`/admin/bookings/[id]`** - Detailed booking management page
  - Full booking information
  - Customer details
  - Service details
  - Time slot management
  - Booking status management
  - Update booking status (with timeline)
  - Handle partial payments (mark as paid, collect remaining)
  - Add staff notes
  - Cancel/refund booking
  - View payment details
  - Reschedule booking

### 3. **Enhanced Order/Booking Lists** ⚠️ MEDIUM PRIORITY
- Add quick actions (view, edit, cancel) in list views
- Add filters for date range, customer, status
- Export functionality (CSV/PDF)
- Bulk actions (update status for multiple orders/bookings)

---

## 🔧 Components Needed

### 1. **Order Status Timeline Component**
- Visual timeline showing order progression
- Status: Pending → Paid → Processing → Shipped → Completed
- Show dates for each status change
- Show tracking information when available

### 2. **Booking Status Timeline Component**
- Visual timeline showing booking progression
- Status: Pending → Paid → Confirmed → Completed
- Show dates for each status change
- Show service completion status

### 3. **Address Form Component**
- Reusable address form with:
  - Region dropdown (Northern/Central/Southern)
  - District dropdown (populated based on region)
  - Area/Village input
  - Traditional Authority (optional)
  - Nearest Town/Trading Centre (optional)
  - Directions (optional)
  - Coordinates (optional, for future map integration)

### 4. **Payment Status Component**
- Display payment information
- Show partial payment status for bookings
- Show "Pay Remaining Balance" button if applicable
- Payment method display

### 5. **Delivery Provider Selector Component**
- Reusable component for selecting delivery provider
- Show pricing based on selected district/region
- Display estimated delivery time
- Show provider contact information

---

## 📋 Implementation Priority

### Phase 1 (Critical - Complete Shopping Flow)
1. ✅ Service booking page (`/services/[slug]/book`)
2. ✅ Book-confirmed page (`/bookings/book-confirmed`)
3. Customer order detail page (`/orders/[id]`)
4. Customer booking detail page (`/bookings/[id]`)

### Phase 2 (Important - Management)
5. Admin order detail page (`/admin/orders/[id]`)
6. Admin booking detail page (`/admin/bookings/[id]`)
7. Address management page (`/settings/addresses`)

### Phase 3 (Enhancement)
8. Reviews display on product/service pages
9. Order/Booking status timeline components
10. Enhanced order-confirmed page
11. Export functionality

---

## 🔗 Integration Points

### Checkout Page
- ✅ Already updated with:
  - Name extraction from displayName
  - Phone access from user
  - Delivery provider selection
  - District/region-based pricing
  - Address structure
  - Payment methods from settings

### Service Detail Page
- ✅ Already updated with:
  - Booking fee and total fee display
  - Partial payment information

### Profile Page
- Needs update:
  - "View Details" buttons should link to `/orders/[id]` and `/bookings/[id]`
  - Address management should link to `/settings/addresses`

---

## 📝 Notes

- All new pages should use React Query hooks for data fetching
- Address structure should follow the `Address` interface from `@/types/common`
- Payment integration should use Paychangu API
- All customer-facing pages should support guest checkout where applicable
- Admin pages should have proper role-based access control

