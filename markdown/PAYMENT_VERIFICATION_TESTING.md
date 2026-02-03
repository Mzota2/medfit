# Payment Verification Testing Guide

This guide explains how to test the two payment verification paths independently and ensure only one runs at a time.

## Two Verification Paths

### 1. **Webhook Path** (Primary - Server-to-Server)
- **Trigger**: Paychangu sends POST request to `/api/webhooks/paychangu`
- **When**: Automatically when payment is completed
- **Source**: `WEBHOOK`
- **Logs**: Prefixed with `[WEBHOOK]`

### 2. **Manual Verification Path** (Fallback - User-Initiated)
- **Trigger**: User visits order-confirmed or book-confirmed page
- **When**: When user is redirected back from Paychangu
- **Source**: `MANUAL`
- **Logs**: Prefixed with `[MANUAL]`

## Idempotency Protection

Both paths check if the payment has already been processed before doing any work:

1. **Ledger Entry Check**: Checks if ledger entry already exists
2. **Order/Booking Status Check**: Checks if order/booking is already paid
3. **Early Exit**: If already processed, logs and exits without duplicate work

## Testing Each Path Independently

### Test 1: Webhook Path Only

**Goal**: Test that webhook processes payment without manual verification running

**Steps**:
1. Make a test payment through your app
2. **Before** user is redirected back, simulate webhook:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/paychangu \
     -H "Content-Type: application/json" \
     -H "x-paychangu-signature: test-signature" \
     -d '{
       "event": "payment.success",
       "data": {
         "tx_ref": "YOUR_TXREF",
         "transaction_id": "YOUR_TRANSACTION_ID",
         "amount": 1000,
         "currency": "MWK",
         "payment_method": "card",
         "metadata": {
           "orderId": "YOUR_ORDER_ID"
         }
       }
     }'
   ```
3. Check logs for `[WEBHOOK]` messages
4. Verify in Firestore:
   - Payment document status = `completed`
   - Order/Booking status = `paid`
   - Ledger entry exists

**Expected Logs**:
```
[WEBHOOK] Received webhook event: payment.success txRef: <txRef>
[WEBHOOK] Processing payment (ledger does not exist yet): { txRef, orderId, transactionId }
[WEBHOOK] Order status updated to PAID: <orderId>
[WEBHOOK] Ledger entry created for order: <orderId> transactionId: <transactionId> txRef: <txRef>
```

### Test 2: Manual Verification Path Only

**Goal**: Test that manual verification processes payment without webhook running

**Steps**:
1. Make a test payment through your app
2. **Disable webhook** temporarily (comment out webhook handler or block Paychangu)
3. Visit order-confirmed or book-confirmed page:
   ```
   http://localhost:3000/order-confirmed?orderId=YOUR_ORDER_ID&txRef=YOUR_TXREF
   ```
4. Check logs for `[MANUAL]` messages
5. Verify in Firestore (same as Test 1)

**Expected Logs**:
```
[MANUAL] Starting payment verification for txRef: <txRef>
[MANUAL] Found existing payment document: { txRef, existingOrderId, existingTransactionId }
[MANUAL] Payment verified as successful, checking if processing needed: { txRef, orderId, transactionId }
[MANUAL] Processing payment (ledger does not exist yet): { txRef, orderId, transactionId }
[MANUAL] Creating new ledger entry: payment_<transactionId>
[MANUAL] Ledger entry created successfully: payment_<transactionId> txRef: <txRef>
[MANUAL] Order status updated to PAID: <orderId>
[MANUAL] Ledger entry and order/booking update completed for txRef: <txRef>
```

### Test 3: Webhook Runs First, Manual Skips

**Goal**: Verify idempotency - manual verification skips if webhook already processed

**Steps**:
1. Make a test payment
2. Simulate webhook (as in Test 1)
3. Wait for webhook to complete
4. Visit order-confirmed page (as in Test 2)
5. Check logs - manual should skip processing

**Expected Logs (Manual)**:
```
[MANUAL] Starting payment verification for txRef: <txRef>
[MANUAL] Payment verified as successful, checking if processing needed: { txRef, orderId, transactionId }
[MANUAL] Payment already processed (ledger exists). Skipping to prevent duplicate processing. Ledger ID: payment_<transactionId>
```

### Test 4: Manual Runs First, Webhook Skips

**Goal**: Verify idempotency - webhook skips if manual already processed

**Steps**:
1. Make a test payment
2. Visit order-confirmed page first (as in Test 2)
3. Wait for manual verification to complete
4. Simulate webhook (as in Test 1)
5. Check logs - webhook should skip processing

**Expected Logs (Webhook)**:
```
[WEBHOOK] Received webhook event: payment.success txRef: <txRef>
[WEBHOOK] Processing payment (ledger does not exist yet): { txRef, orderId, transactionId }
[WEBHOOK] Transaction already processed (ledger exists). Skipping to prevent duplicate processing. Ledger ID: payment_<transactionId>
```

## Log Patterns to Identify

### Successful Processing (First Time)
```
[SOURCE] Processing payment (ledger does not exist yet)
[SOURCE] Creating new ledger entry: payment_<transactionId>
[SOURCE] Ledger entry created successfully
[SOURCE] Order/Booking status updated to PAID
```

### Already Processed (Idempotency)
```
[SOURCE] Payment already processed (ledger exists). Skipping to prevent duplicate processing.
```
OR
```
[SOURCE] Order/Booking already paid, skipping update
```

### Error/Fallback
```
[SOURCE] Error processing payment
[SOURCE] Calling verification endpoint as fallback for txRef: <txRef>
```

## Verification Checklist

After testing, verify:

- [ ] Payment document exists with status `completed`
- [ ] Order/Booking document has status `paid`
- [ ] Ledger entry exists with correct ID format
- [ ] No duplicate ledger entries created
- [ ] Order/Booking status not updated multiple times
- [ ] Logs show correct source (`[WEBHOOK]` or `[MANUAL]`)
- [ ] Second path skips when first already processed

## Common Issues

### Issue: Both paths process simultaneously
**Solution**: Check that ledger entry check happens before processing. Both paths should check ledger existence first.

### Issue: Manual verification always runs even after webhook
**Solution**: Verify that ledger entry check in manual path is working. Check logs for "Payment already processed" message.

### Issue: Webhook doesn't skip after manual
**Solution**: Verify webhook checks ledger entry before processing. Check that ledger ID format matches between both paths.

### Issue: No logs showing source
**Solution**: Ensure both paths have source parameter set correctly (`'webhook'` or `'manual'`).

## Testing in Production

For production testing:

1. **Monitor logs** for both `[WEBHOOK]` and `[MANUAL]` prefixes
2. **Check Firestore** for duplicate ledger entries (should be none)
3. **Verify timing**: Webhook should arrive before user redirects back
4. **Test edge cases**: What if webhook is delayed? What if user refreshes page?

## Quick Test Commands

### Test Webhook Only
```bash
# Replace with actual values
curl -X POST http://localhost:3000/api/webhooks/paychangu \
  -H "Content-Type: application/json" \
  -H "x-paychangu-signature: test" \
  -d '{"event":"payment.success","data":{"tx_ref":"TXREF","transaction_id":"TXNID","amount":1000,"currency":"MWK","metadata":{"orderId":"ORDERID"}}}'
```

### Test Manual Only
```bash
# Replace with actual values
curl "http://localhost:3000/api/payments/verify?txRef=TXREF"
```

### Check Ledger Entry
```bash
# In Firestore console or using Firebase Admin SDK
# Look for document: ledger/payment_<transactionId>
# Or: ledger/payment_<transactionId>_booking
```

