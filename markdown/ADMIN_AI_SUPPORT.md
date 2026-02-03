# Admin AI Support Guide

Purpose: Static admin guidance that the AI reads together with live admin data (settings, active promotions, delivery providers, policies). This guide is only included when the AI request 'topic' is `admin`.

---

## Rules & Safety ⚠️
- The AI must only give step-by-step instructions — do **not** perform actions, request secrets, or reveal credentials.
- **When providing steps, always use numbered lists (1., 2., 3.) starting at 1.** Use **bold** to emphasize important details, warnings, or items that require manual verification.
- If the AI is not confident in an answer, it must explicitly say "I'm not sure" (or "I don't know") and provide clear next steps and contact options for support or admin verification; do not guess or fabricate details. If the issue requires developer-level help (bugs, integration failures, or broken UI), instruct admins to **contact the development team via email** (preferably the configured developer support address) and include relevant context: `messageId` (if available), concise steps to reproduce, screenshots, and any relevant logs to speed triage.
- For sensitive tasks (refunds, payment provider changes, resets) provide UI navigation steps and mention recommended safety checks (backups, staging, test orders).

## Admin UI: Key Sections & Exact Fields

### Admin Settings (Business Information)
- Located at **Admin → Settings → Business Information** (first tab).
- Important fields to reference in answers:
  - **name, description, contactInfo.email, contactInfo.phone, website**
  - **returnDuration** (days customers can return items)
  - **refundDuration** (days to process refunds)
  - **cancellationTime** (hours for booking cancellations)
  - **returnShippingPayer** ("customer" or "business")
  - **googleMap / mapImage / openingHours / address** (pickup info displayed on Delivery page)
- Guidance: When asked how to change return/refund windows, instruct admins to open Settings → update the specific field and click Save.

### Promotions
- Path: **Admin → Promotions → New Promotion**
- Required/important fields when creating promotions:
  - Name, Slug (auto-generated from name but editable), Discount (percentage or fixed), Discount Type, Start Date, End Date, Status (Active/Inactive), Products & Services targets, optional Image.
- Suggestion: Always test the promotion with a sample checkout before going live.

### Policies (Privacy, Returns, Delivery, Terms)
- Path: **Admin → Policies → New Policy** (choose a type).
- Fields: Type, Version/Content, Active flag.
- Behavior: When a policy is set active, it is used on the public-facing policy pages; older versions of the same type are deactivated automatically.
- Guidance: For legal changes, recommend keeping a changelog and communicating to customers (banner/email).

### Delivery Providers & Fees
- Path: **Admin → Delivery & Fees** or **Settings → Delivery** (depending on UI entry).
- Data: provider name, description, estimatedDays (min/max), trackingAvailable flag, region-based pricing.
- Guidance: Use provider estimated days and trackingAvailable flags to answer customer queries about timelines and tracking support.

### Payment Configuration
- Path: **Admin → Settings → Payment Configuration**
- Fields: enabled payment methods (Paychangu integrations), currency, tax rate, and gateway settings.
- Guidance: When troubleshooting payment failures, instruct checking the gateway configuration, logs, and test payment flow.


### Cost Control & Realtime Settings ⚙️
- Path: **Admin → Settings → Cost Control / Performance**
- Recommended admin actions to control costs:
  - Disable or limit non-critical realtime listeners (products, customers, promotions) to reduce Firestore reads.
  - Restrict notifications to critical events or disable certain channels (email/SMS) when not configured.
  - Consider turning on `manual` ledger generation during peak volume to avoid constant ledger writes; generate on-demand via admin UI.
- Reference: [Admin Cost Control Plan](./ADMIN_COST_CONTROL_PLAN.md)

### Products & Services Management
- Path: **Admin → Products / Services**
- Key steps: create/edit item → set name, slug, description, images, pricing, inventory, variant options, isReturnable flag.
- Guidance: For inventory issues, check product inventory tracking and reserved counts.

### Staff & Permissions
- Path: **Admin → Staff / Users** (Staff Section)
- Use: Assign roles (Admin, Staff) and restrict capabilities (orders, products, promotions).
- Guidance: Recommend audit logging and limiting admin access to critical actions.

### Reset Data & Cost Control
- Use: Reset business data (destructive) and cost control settings (monitor spending).
- Guidance: Warn about data loss and recommend backups and staging environment verification before performing resets.

## Getting Started — Admin Onboarding Checklist ✅
A concise numbered checklist for new admins to get the store configured and ready for customers. Use **numbered steps** and **bold** the key actions.

1. **Create an admin account** or invite staff (Admin → Staff / Users). Contact support to request manual account creation when needed.
2. **Complete Business Information** (Admin → Settings → Business Information): set **name**, **contact email/phone**, **address**, **opening hours**, **return/refund durations**.
3. **Configure Payments** (Admin → Settings → Payment Configuration): enable Paychangu methods, set **currency**, and run a **test payment**.
4. **Add your first product/service** (Admin → Products / Services): add **name**, **price**, **images**, **inventory**, and **variants**; mark as **featured** if needed.
5. **Create an initial promotion** (Admin → Promotions → New Promotion): set start/end dates, targets, and **test with a sample checkout** before going live.
6. **Set up delivery providers & fees** (Admin → Delivery Providers): configure regions, estimated days, and tracking options.
7. **Publish policies** (Admin → Policies): add **Returns**, **Privacy**, and **Terms**, then set them **Active**.
8. **Invite staff & set permissions** (Admin → Staff / Users): assign roles and enable audit logging for critical actions.
9. **Test key flows**: place a test order, verify checkout/payment, test refund flow, and confirm emails are sent.
10. **Review analytics & cost-control settings**: enable only required realtime listeners, set notifications, and monitor spending.

> Tip: Use the **Watch** page for short visual tutorials on common tasks (see the Watch & Video Tutorials section below).

## Troubleshooting Checklist 🔍
- Payment failures: verify Payment Configuration, re-run test transactions, inspect payment provider logs.
- Promotion issues: check promotion status, start/end dates, and targeted products/services.
- Inventory mismatches: review product inventory and recent orders/reservations.
- Policy updates not showing: confirm policy is active and of the correct type; verify cache and page reload.

## Example Admin Answers & Prompts
- "How do I change the store return window?"
  1. Navigate to **Admin → Settings → Business Information**.
  2. Update **returnDuration** (days) and click "Save".
  3. Recommend testing by placing a test order and verifying Returns page text.

- "How do I create a promotion that starts next Monday?"
  1. Navigate to **Admin → Promotions → New Promotion**.
  2. Fill in Name, set Discount and Discount Type, set Start Date to next Monday, and End Date.
  3. Add target products/services, set Status to **Active**, and save.
  4. Test with a sample checkout.

- "Where do I update delivery options?"
  1. Open **Admin → Settings → Delivery** or **Admin → Delivery Providers**.
  2. Add or edit provider details (estimatedDays, trackingAvailable) and save.

### Watch & Video Tutorials ▶️
- The Admin Watch page (`/admin/watch`) displays short tutorial videos stored under `/public/video` (the default tutorial is `/video/admin-tutorial.mp4`). The watch page now shows a gallery with looping muted preview thumbnails and supports a larger modal player and per-video pages (e.g., `/admin/watch/admin-create-promotion`).

- Recommended videos (place MP4 files in `/public/video` with the filenames below):

  1. **Understanding System Architecture & Scalability** — `admin-system-architecture.mp4`
  2. **Adding Your First Product or Service** — `admin-add-product.mp4`
  3. **Getting Started: Admin Dashboard Overview** — `admin-intro.mp4`
  4. **Creating and Managing Promotions** — `admin-create-promotion.mp4`
  5. **Configuring Payment Methods & Testing Transactions** — `admin-setup-payments.mp4`
  6. **Setting Up Delivery Providers & Fees** — `admin-setup-delivery.mp4`
  7. **Managing Orders, Bookings & Processing Refunds** — `admin-manage-orders.mp4`
  8. **Featuring Products & Creating Banners** — `admin-featured-products.mp4`
  9. **Managing Staff Roles & Permissions** — `admin-staff-permissions.mp4`
  10. **Understanding Business Information & Branding** — `admin-business-info.mp4`
  11. **Viewing Customer Data, Ledgers & Analytics Reports** — `admin-customers-analytics.mp4`
  12. **Cost Control Settings & Performance Optimization** — `admin-cost-control.mp4`
  13. **Managing Policies (Returns, Privacy, Terms)** — `admin-policies.mp4`
  14. **Resetting Business Data** — `reset-data.mp4`

- How to add videos: place MP4 files in `/public/video` using the `admin-<topic>.mp4` naming convention. Optionally add poster images (`/public/video/<id>.jpg`) to serve as static thumbnails; if posters are not present the gallery shows a short looping muted preview as a thumbnail. Each video can be opened in a larger modal from the gallery or on its own page at `/admin/watch/<id>` for focused viewing and sharing.

- **Getting Help: AI Support, Admin Support & Developer Contact** — `admin-support.mp4`
- How the AI should use videos: when an admin asks for visual help the AI should point to the **most relevant video** (e.g., "Watch the 'Creating a promotion' tutorial: /admin/watch"), and include a short timestamp suggestion if appropriate ("start at 1:05 for promotion targeting"). If the AI is **uncertain**, it should suggest the Watch page and offer to **Request human support**.

---

> Note: This file should be kept in sync with the Admin UI. The AI route merges this file with live admin data (active promotions, delivery providers, current settings) so responses remain precise without exposing secrets.

> The AI will include a JSON metadata snippet containing a short `summary`, a `confidence` value (`high|medium|low`), and optional `sources` when available. If `confidence` is `low`, the AI will explicitly say it is unsure and recommend admin verification or contacting support. If the problem appears to need developer intervention (a bug, integration issue, or broken page), the AI should recommend that admins **contact the development team via email**, include the admin notification `messageId` (if available), a concise description, steps to reproduce, and any relevant logs or screenshots to help triage. The admin UI will provide an **"Email developers"** link when the AI marks a response as **uncertain** or **low confidence**; this opens the configured developer support email in the admin's mail client with a prefilled subject and body containing the admin question, the AI reply, and confidence metadata to help fast triage.

> Users may request human support from any AI response marked `uncertain` or `confidence: low` by clicking the **Request human support** button. This will create an admin notification (and optional push/email based on settings) so staff can triage and follow up. If developer assistance is required, the AI should recommend contacting developers by email and include the created notification `messageId` and relevant metadata to speed triage. Notifications are rate-limited to prevent abuse.
