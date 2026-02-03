# Required Firestore Indexes Analysis

## Analysis of all get functions and subscriptions

### ITEMS Collection
**Queries Found:**
1. `slug` (where) - Simple query, no index needed
2. `type` (where) + `createdAt` (orderBy) - ✅ EXISTS
3. `businessId` (where) + `type` (where) + `createdAt` (orderBy) - ✅ EXISTS (just added)
4. `businessId` + `type` + `status` + `createdAt` - ✅ EXISTS
5. `businessId` + `type` + `categoryIds` (array-contains) + `createdAt` - ✅ EXISTS
6. `businessId` + `type` + `status` + `categoryIds` + `createdAt` - ✅ EXISTS
7. `businessId` + `type` + `isFeatured` + `createdAt` - ✅ EXISTS
8. `businessId` + `type` + `status` + `isFeatured` + `createdAt` - ✅ EXISTS
9. `businessId` + `type` + `status` + `isFeatured` + `categoryIds` + `createdAt` - ✅ EXISTS

**Missing:**
- None! All covered.

---

### CATEGORIES Collection
**Queries Found:**
1. `type` (where) + `businessId` (where) + `name` (orderBy) - ✅ EXISTS
2. `businessId` (where) + `name` (orderBy) - ❌ MISSING

**Missing Index:**
```json
{
  "collectionGroup": "categories",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "name", "order": "ASCENDING" }
  ]
}
```

---

### ORDERS Collection
**Queries Found:**
1. `orderNumber` (where) - Simple query, no index needed
2. `customerId` (where) + `createdAt` (orderBy) - ❌ MISSING
3. `customerEmail` (where) + `createdAt` (orderBy) - ❌ MISSING
4. `status` (where) + `createdAt` (orderBy) - ❌ MISSING
5. `customerId` + `status` + `createdAt` - ❌ MISSING
6. `customerEmail` + `status` + `createdAt` - ❌ MISSING

**Missing Indexes:**
```json
{
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "customerId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "customerEmail", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "customerId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "customerEmail", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### BOOKINGS Collection
**Queries Found:**
1. `bookingNumber` (where) - Simple query, no index needed
2. `customerId` (where) + `createdAt` (orderBy) - ❌ MISSING
3. `customerEmail` (where) + `createdAt` (orderBy) - ❌ MISSING
4. `serviceId` (where) + `createdAt` (orderBy) - ❌ MISSING
5. `status` (where) + `createdAt` (orderBy) - ❌ MISSING
6. `customerId` + `status` + `createdAt` - ❌ MISSING
7. `customerEmail` + `status` + `createdAt` - ❌ MISSING
8. `serviceId` + `status` + `createdAt` - ❌ MISSING

**Missing Indexes:**
```json
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "customerId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "customerEmail", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "serviceId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "customerId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "customerEmail", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "serviceId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### PROMOTIONS Collection
**Queries Found:**
1. `status` (where) + `startDate` (orderBy) - ✅ EXISTS
2. `status` + `businessId` + `startDate` - ✅ EXISTS

**Missing:**
- None! All covered.

---

### REVIEWS Collection
**Queries Found:**
1. `itemId` (where) + `createdAt` (orderBy) - ❌ MISSING
2. `userId` (where) + `createdAt` (orderBy) - ❌ MISSING
3. `businessId` (where) + `createdAt` (orderBy) - ❌ MISSING
4. `itemId` + `businessId` + `createdAt` - ❌ MISSING
5. `userId` + `businessId` + `createdAt` - ❌ MISSING

**Missing Indexes:**
```json
{
  "collectionGroup": "reviews",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "itemId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "reviews",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "reviews",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "reviews",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "itemId", "order": "ASCENDING" },
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "reviews",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### NOTIFICATIONS Collection
**Queries Found:**
1. `recipient.userId` (where) + `createdAt` (orderBy) - ❌ MISSING
2. `recipient.email` (where) + `createdAt` (orderBy) - ❌ MISSING
3. `type` (where) + `createdAt` (orderBy) - ❌ MISSING
4. `orderId` (where) + `createdAt` (orderBy) - ❌ MISSING
5. `bookingId` (where) + `createdAt` (orderBy) - ❌ MISSING
6. `paymentId` (where) + `createdAt` (orderBy) - ❌ MISSING

**Missing Indexes:**
```json
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "recipient.userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "recipient.email", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "orderId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "bookingId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "notifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "paymentId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### PAYMENTS Collection
**Queries Found:**
1. `status` (where) + `createdAt` (orderBy) - ❌ MISSING
2. `orderId` (where) + `createdAt` (orderBy) - ❌ MISSING
3. `bookingId` (where) + `createdAt` (orderBy) - ❌ MISSING
4. `businessId` (where) + `createdAt` (orderBy) - ❌ MISSING
5. `status` + `businessId` + `createdAt` - ❌ MISSING
6. `orderId` + `businessId` + `createdAt` - ❌ MISSING
7. `bookingId` + `businessId` + `createdAt` - ❌ MISSING

**Missing Indexes:**
```json
{
  "collectionGroup": "payments",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "payments",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "orderId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "payments",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "bookingId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "payments",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "payments",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "payments",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "orderId", "order": "ASCENDING" },
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "payments",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "bookingId", "order": "ASCENDING" },
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### POLICIES Collection
**Queries Found:**
1. `type` (where) + `isActive` (where) + `version` (orderBy) - ❌ MISSING
2. `type` + `isActive` + `businessId` + `version` - ❌ MISSING
3. `type` (where) + `version` (orderBy) - ❌ MISSING
4. `type` + `businessId` + `version` - ❌ MISSING
5. `isActive` (where) + `version` (orderBy) - ❌ MISSING
6. `isActive` + `businessId` + `version` - ❌ MISSING

**Missing Indexes:**
```json
{
  "collectionGroup": "policies",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "version", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "policies",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "version", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "policies",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "version", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "policies",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "version", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "policies",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "version", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "policies",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "version", "order": "DESCENDING" }
  ]
}
```

---

### DELIVERY_PROVIDERS Collection
**Queries Found:**
1. `businessId` (where) + `isActive` (where) + `name` (orderBy) - ✅ EXISTS
2. `businessId` (where) + `name` (orderBy) - ❌ MISSING
3. `isActive` (where) + `name` (orderBy) - ❌ MISSING

**Missing Indexes:**
```json
{
  "collectionGroup": "delivery_providers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "name", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "delivery_providers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "name", "order": "ASCENDING" }
  ]
}
```

---

### USERS Collection
**Queries Found:**
1. `uid` (where) - Simple query, no index needed
2. `email` (where) - Simple query, no index needed
3. `role` (where) + `createdAt` (orderBy) - ❌ MISSING
4. `role` + `businessId` + `createdAt` - ❌ MISSING
5. `businessId` (where) + `createdAt` (orderBy) - ❌ MISSING
6. `role` (where) - Simple query (getCustomers, getAdmins, getStaff) - no index needed

**Missing Indexes:**
```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "role", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "role", "order": "ASCENDING" },
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "role", "order": "ASCENDING" },
    { "fieldPath": "role", "order": "ASCENDING" }
  ]
}
```

**Note:** The last one is for `role IN ['admin', 'staff']` query - Firestore supports `in` queries without composite index if it's the only filter.

---

### REPORTS Collection
**Queries Found:**
1. `type` (where) + `generatedAt` (orderBy) - ❌ MISSING
2. `category` (where) + `generatedAt` (orderBy) - ❌ MISSING
3. `status` (where) + `generatedAt` (orderBy) - ❌ MISSING
4. `businessId` (where) + `generatedAt` (orderBy) - ❌ MISSING
5. `type` + `category` + `generatedAt` - ❌ MISSING
6. `type` + `status` + `generatedAt` - ❌ MISSING
7. `type` + `businessId` + `generatedAt` - ❌ MISSING
8. `category` + `status` + `generatedAt` - ❌ MISSING
9. `category` + `businessId` + `generatedAt` - ❌ MISSING
10. `status` + `businessId` + `generatedAt` - ❌ MISSING

**Missing Indexes:** (Many combinations - adding most common ones)
```json
{
  "collectionGroup": "reports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "generatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "reports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "category", "order": "ASCENDING" },
    { "fieldPath": "generatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "reports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "generatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "reports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "generatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "reports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "generatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "reports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "generatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "reports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "generatedAt", "order": "DESCENDING" }
  ]
}
```

---

### LEDGER Collection
**Queries Found:**
1. `entryType` (where) + `createdAt` (orderBy) - ❌ MISSING
2. `status` (where) + `createdAt` (orderBy) - ❌ MISSING
3. `orderId` (where) + `createdAt` (orderBy) - ❌ MISSING
4. `bookingId` (where) + `createdAt` (orderBy) - ❌ MISSING
5. `paymentId` (where) + `createdAt` (orderBy) - ❌ MISSING
6. `createdAt` (>=) + `createdAt` (<=) + `createdAt` (orderBy) - ❌ MISSING (range query)

**Missing Indexes:**
```json
{
  "collectionGroup": "ledger",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "entryType", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "ledger",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "ledger",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "orderId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "ledger",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "bookingId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "ledger",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "paymentId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "ledger",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "createdAt", "order": "ASCENDING" }
  ]
}
```

**Note:** Range queries on `createdAt` need a single-field index.

---

### BUSINESS Collection
**Queries Found:**
1. `createdAt` (orderBy) - Simple query, no index needed (single field orderBy)

**Missing:**
- None! Single field orderBy doesn't need an index.

---

## Summary

**Total Missing Indexes: ~50+ indexes**

This is a lot! We should prioritize the most commonly used queries first, then add others as needed when errors occur.

