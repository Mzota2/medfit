# Static Business / App Strings (where to change them) ✅

This file lists pages/components that currently contain *statically-typed* application titles, descriptions, and business-related default values (business name, contact details, headings, etc.). Use this as a single reference when you want to update site text for a new white-label instance.

---

## How to use this list
- Each entry shows the **file path**, **what is static**, and an **example** snippet to change.
- Recommendation: centralize these values in one typed module (example: `lib/config/siteConfig.ts`) and import them across pages. This will make future rebranding or templating trivial.

**Status**: Implemented — `lib/config/siteConfig.ts` added and applied to primary pages (`app/layout.tsx`, `app/(customer)/contact/ContactPageClient.tsx`, `app/(customer)/terms/TermsPageClient.tsx`, `app/(customer)/privacy/PrivacyPageClient.tsx`, `app/(customer)/refund/RefundPageClient.tsx`, `app/(customer)/returns/ReturnsPageClient.tsx`, `app/(customer)/delivery/DeliveryPageClient.tsx`).

Suggested central config (example):
```ts
// lib/config/siteConfig.ts
export interface SiteConfig {
  appTitle: string;
  appDescription: string;
  brandImageUrl?: string;
  defaultBusinessName?: string;
  defaultContactEmail?: string;
  defaultContactPhone?: string;
}

export const SITE_CONFIG: SiteConfig = {
  appTitle: 'eShopCure',
  appDescription: 'Your trusted online shopping destination for quality products and services',
  defaultBusinessName: 'Our Business',
  defaultContactEmail: 'info@eshopcure.com',
  defaultContactPhone: '+265 981 819 389',
};
```

---

## Files with static business/app strings

- **`app/layout.tsx`**
  - Static app metadata used by Next.js metadata API:
    - `title: "eShopCure"`
    - `description: "Your trusted online shopping destination for quality products and services"`
    - Twitter/OpenGraph titles and descriptions also hard-coded
  - Suggestion: import `SITE_CONFIG.appTitle` and `SITE_CONFIG.appDescription` here.

- **`app/(customer)/contact/ContactPageClient.tsx`**
  - Page title: `Contact Us` (H1)
  - Default fallback values when `business` is missing:
    - `businessEmail = 'info@eshopcure.com'`
    - `businessPhone = '+265 981 819 389'`
  - Map section heading: `Our Location`
  - Suggestion: replace defaults with `SITE_CONFIG.defaultContactEmail`, etc.

- **`app/(customer)/terms/TermsPageClient.tsx`**
  - H1: `TERMS & CONDITIONS`
  - Default business name fallback: `businessName = 'eshopcure'`
  - Several static policy sections/content text blocks
  - Suggestion: move static headings and default strings into config or localized content files.

- **`app/(customer)/privacy/PrivacyPageClient.tsx`**
  - H1: `PRIVACY POLICY`
  - Default contact email: `contactEmail = 'contact@example.com'`

- **`app/(customer)/refund/RefundPageClient.tsx`** and **`app/(customer)/returns/ReturnsPageClient.tsx`**
  - H1: `REFUND & RETURN POLICY`
  - Default businessName: `'Our Business'`
  - Static section headings (INTRODUCTION, RETURN POLICY, REFUND POLICY, etc.)

- **`app/(customer)/delivery/DeliveryPageClient.tsx`**
  - H1: `DELIVERY POLICY`

- **`components/layout/QuickContact.tsx`**
  - Small component with static `title="Contact us"` prop used in multiple layouts.

- **`components/policies/PolicyLinksSection.tsx`**
  - H2: `Related Policies`

- **`components/confirmation/PaymentConfirmation.tsx`**
  - Static messages: `Payment Failed`, `Verifying Payment...`, default titles for not-found or success pages (some of these are dynamic but have static defaults).

- **`components/invoice/*`** (`ProductInvoice.tsx`, `ServiceInvoice.tsx`, `CustomerInvoices.tsx`)
  - Static headings such as `INVOICE` used across invoice templates.

- **Other places (notes / docs / markdown)**
  - Several markdown and README files reference the business name (e.g., `markdown/SECURITY_FIREBASE_SETUP.md`, `markdown/FIREBASE_FREE_TIER_SETUP.md`) — these are documentation, but worth updating when rebranding.

---

## Quick migration checklist to centralize static data 🔁
1. Create `lib/config/siteConfig.ts` (type + default values) as shown above.
2. Replace direct string literals with imports from `SITE_CONFIG` across the files listed above.
3. For *policy and static content sections* (long paragraphs), consider extracting them to a `content/` folder or a CMS so they can be updated without touching code.
4. Add unit or smoke tests that ensure pages render using `SITE_CONFIG` values (simple snapshot tests).
5. Optional: support environment overrides using `NEXT_PUBLIC_` environment variables for public details.

---

If you'd like, I can:
- Create the `lib/config/siteConfig.ts` file and apply the replacements across the files listed above (small, safe PR-ready changes). ✅
- Or just add a lint rule that flags new hard-coded business strings so future changes use the central config. ⚠️

Tell me which option you prefer and I’ll implement it. 🎯
