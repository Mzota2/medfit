# Webhook Testing Guide

This guide shows you what logs to expect when testing Paychangu webhooks and how to interpret them.

## Expected Log Flow for Successful Webhook

When Paychangu sends a webhook for a successful payment, you should see these logs in order:

### 1. Webhook Received
```
Webhook signature verified successfully
```
OR (if signature verification is disabled/not configured):
```
Webhook signature or secret not provided. Continuing without verification.
```

### 2. Payment Document Update
```
Payment document updated by txRef: <txRef> success transactionId: <transactionId>
```

### 3. Transaction Verification
```
Transaction verification successful for txRef: <txRef>
```

### 4. Order/Booking Status Update
For orders:
```
Order status updated to PAID via webhook: <orderId>
```

For bookings:
```
Booking status updated to PAID via webhook: <bookingId>
```

### 5. Ledger Entry Creation
For orders:
```
Ledger entry created for order: <orderId> transactionId: <transactionId> txRef: <txRef>
```

For bookings:
```
Ledger entry created for booking: <bookingId> transactionId: <transactionId> txRef: <txRef>
```

## Expected Log Flow for Verification Endpoint

When the verification endpoint is called (either manually or as fallback), you should see:

### 1. Payment Document Lookup
```
Found existing payment document: { txRef: '<txRef>', existingOrderId: '<orderId>', existingBookingId: undefined, existingTransactionId: '<transactionId>' }
```

### 2. Payment Verification
```
Payment verified as successful, creating ledger and updating order/booking: {
  txRef: '<txRef>',
  orderId: '<orderId>',
  bookingId: undefined,
  transactionId: '<transactionId>'
}
```

### 3. Ledger Entry Check/Creation
If ledger already exists:
```
Ledger entry already exists: payment_<transactionId>
```

If creating new:
```
Ledger entry created via verification: payment_<transactionId> txRef: <txRef>
```

### 4. Order/Booking Update
```
Order status updated to PAID via verification: <orderId>
```
OR
```
Booking status updated to PAID via verification: <bookingId>
```

### 5. Completion
```
Ledger entry and order/booking update completed for txRef: <txRef>
```

## Error Logs to Watch For

### Webhook Errors

**1. Configuration Error:**
```
Paychangu is not properly configured
```
→ Check your environment variables: `PAYCHANGU_SECRET_KEY`, `PAYCHANGU_WEBHOOK_SECRET`

**2. Missing txRef:**
```
No tx_ref in webhook data - cannot process payment
```
→ Paychangu didn't send tx_ref in webhook payload

**3. Payment Document Not Found:**
```
Payment document not found for txRef: <txRef>
```
→ Payment session wasn't created before webhook arrived (shouldn't happen in normal flow)

**4. Missing Transaction ID:**
```
Payment document missing transactionId for txRef: <txRef>
```
→ Payment document exists but missing transactionId field

**5. Missing Order/Booking ID:**
```
No orderId or bookingId found in metadata or payment document for txRef: <txRef>
```
→ Can't create ledger entry without orderId or bookingId

**6. Transaction Verification Failed:**
```
Transaction verification failed for txRef: <txRef>
```
→ Paychangu API verification call failed

**7. Webhook Processing Error:**
```
Error processing successful payment for txRef: <txRef> <error details>
Webhook processing failed, calling verification fallback for txRef: <txRef>
```
→ Webhook processing failed, but fallback verification will be called

### Verification Endpoint Errors

**1. Missing txRef:**
```
Missing transaction reference
```
→ No txRef query parameter provided

**2. Transaction Not Found:**
```
Transaction not found
Transaction verification failed
```
→ Paychangu API couldn't find the transaction

**3. Payment Document Lookup Error:**
```
Error looking up existing payment document: <error>
```
→ Firestore query failed (check database connection)

**4. Verification Error:**
```
Error verifying payment: <error details>
```
→ General error during verification process

## Testing Webhooks Manually

### Option 1: Use Paychangu Test Mode
1. Make a test payment through your app
2. Check server logs for webhook processing
3. Verify in Firestore:
   - Payment document status = `completed`
   - Order/Booking status = `paid`
   - Ledger entry exists

### Option 2: Simulate Webhook with curl
```bash
curl -X POST http://localhost:3000/api/webhooks/paychangu \
  -H "Content-Type: application/json" \
  -H "x-paychangu-signature: <signature>" \
  -d '{
    "event": "payment.success",
    "data": {
      "tx_ref": "<your-txRef>",
      "transaction_id": "<transaction-id>",
      "amount": 1000,
      "currency": "MWK",
      "payment_method": "card",
      "metadata": {
        "orderId": "<order-id>"
      }
    }
  }'
```

### Option 3: Check Verification Endpoint
```bash
curl http://localhost:3000/api/payments/verify?txRef=<your-txRef>
```

## What to Check After Webhook Processing

### 1. Payment Document (Firestore: `payments` collection)
- ✅ `status` = `completed`
- ✅ `completedAt` is set
- ✅ `paymentMethod` is set
- ✅ `orderId` or `bookingId` is present

### 2. Order/Booking Document
- ✅ `status` = `paid`
- ✅ `payment.paymentId` is set
- ✅ `payment.paidAt` is set
- ✅ `payment.amount` matches payment amount

### 3. Ledger Entry (Firestore: `ledger` collection)
- ✅ Entry exists with ID: `payment_<transactionId>` (for orders) or `payment_<transactionId>_booking` (for bookings)
- ✅ `entryType` = `ORDER_SALE` or `BOOKING_PAYMENT`
- ✅ `status` = `confirmed`
- ✅ `amount` matches payment amount
- ✅ `orderId` or `bookingId` is set

## Debugging Checklist

If webhooks aren't working:

1. ✅ **Check webhook URL is configured in Paychangu dashboard**
   - Should be: `https://yourdomain.com/api/webhooks/paychangu`

2. ✅ **Check environment variables are set**
   - `PAYCHANGU_SECRET_KEY`
   - `PAYCHANGU_WEBHOOK_SECRET` (optional for testing)

3. ✅ **Check server logs for incoming webhooks**
   - Look for "Webhook signature verified" or "Webhook signature or secret not provided"
   - Check for any error messages

4. ✅ **Check if payment document exists before webhook**
   - Payment should be created when user initiates payment
   - Should have `txRef`, `transactionId`, `orderId`/`bookingId`

5. ✅ **Test verification endpoint manually**
   - Call `/api/payments/verify?txRef=<txRef>`
   - Check if it creates ledger and updates order/booking

6. ✅ **Check Firestore security rules**
   - Ensure server can write to `payments`, `orders`, `bookings`, `ledger` collections

7. ✅ **Check network/firewall**
   - Paychangu needs to reach your webhook URL
   - Use ngrok or similar for local testing

## Success Indicators

You know webhooks are working when you see:

1. ✅ Webhook logs appear in server console
2. ✅ Payment document status changes to `completed`
3. ✅ Order/Booking status changes to `paid`
4. ✅ Ledger entry is created
5. ✅ No error logs in the flow
6. ✅ Admin dashboard shows the payment
7. ✅ Customer profile shows the order/booking

## Common Issues and Solutions

### Issue: Webhook never arrives
- **Solution**: Check Paychangu dashboard webhook URL configuration
- **Solution**: Use ngrok for local testing
- **Solution**: Check server is accessible from internet

### Issue: Signature verification fails
- **Solution**: Check `PAYCHANGU_WEBHOOK_SECRET` matches Paychangu dashboard
- **Solution**: For testing, signature verification is lenient (logs warning but continues)

### Issue: Ledger not created
- **Solution**: Check if `orderId`/`bookingId` exists in payment document
- **Solution**: Check verification endpoint logs for errors
- **Solution**: Manually call verification endpoint as fallback

### Issue: Order/Booking status not updated
- **Solution**: Check if order/booking document exists
- **Solution**: Check Firestore security rules allow updates
- **Solution**: Check logs for "Order status updated" or "Booking status updated"

