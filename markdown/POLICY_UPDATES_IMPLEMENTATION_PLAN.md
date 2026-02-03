# Policy Updates Implementation Plan

This document outlines the comprehensive updates needed for policies, business settings, and product management.

## Completed
1. ✅ Updated Business type with: returnDuration, refundDuration, cancellationTime, returnShippingPayer
2. ✅ Updated Item type with: isReturnable field

## In Progress / To Do

### 1. Business Settings Page Updates
- [ ] Add returnDuration field to formData and UI
- [ ] Add refundDuration field to formData and UI  
- [ ] Add cancellationTime field to formData and UI
- [ ] Add returnShippingPayer field to formData and UI
- [ ] Update loadBusiness to load these fields
- [ ] Update handleSubmit to save these fields

### 2. Product Forms Updates
- [ ] Add isReturnable checkbox to new product form
- [ ] Add isReturnable checkbox to edit product form
- [ ] Update formData initialization to include isReturnable
- [ ] Update product creation/update to include isReturnable

### 3. Privacy Policy Page
- [ ] Fetch business data
- [ ] Display businessName dynamically
- [ ] Display "Paychangu" as payment provider
- [ ] Display business contact details

### 4. Delivery Policy Page
- [ ] Fetch business data
- [ ] Fetch delivery providers
- [ ] Display businessName dynamically
- [ ] Display delivery methods from deliveryProviders collection
- [ ] Display delivery timeframe message
- [ ] Display pickup information (address, opening hours)
- [ ] Add order tracking section
- [ ] Display business contact information

### 5. Refund Policy Page
- [ ] Create refund policy page (if doesn't exist)
- [ ] Fetch business data
- [ ] Fetch products with isReturnable filter
- [ ] Display businessName
- [ ] Display returnDuration from business
- [ ] Display refundDuration from business
- [ ] Display cancellationTime from business
- [ ] Display returnShippingPayer from business
- [ ] List returnable products
- [ ] Display non-returnable items conspicuously

### 6. Additional Features
- [ ] Show pickup information after user selects pickup during order
- [ ] Add order tracking status display in customer profile

## Implementation Notes

- All policy pages should fetch business data using useBusinesses or getBusinessId
- Delivery providers should be fetched from DELIVERY_PROVIDERS collection
- Products should be filtered by isReturnable field
- All business fields should be optional (use `?.` operator)
- Contact information comes from business.contactInfo
- Address information comes from business.address
- Opening hours come from business.openingHours

