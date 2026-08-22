# Trade Setups + Premium Plan — file manifest

Extract this zip's contents directly into your `DhanTracker` project root,
overwriting the matching paths. Then see the setup steps at the bottom.

## Modified (existing files, edited)

| File | What changed |
|---|---|
| `prisma/schema.prisma` | Added `isAdmin`, `premiumUntil`, `razorpayCustomerId` to `User`; added `TradeSetupPost` model + `SetupStage` enum; added `Payment` model + `PaymentStatus` enum |
| `.env.example` | Added `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| `package.json` | Added `razorpay` dependency |
| `src/middleware.ts` | Added `/trade-setups` and `/premium` to protected routes |
| `src/types/index.ts` | Added `SetupStage`, `TradeSetupPost`, `TradeSetupFormValues`, `SubscriptionStatus`, `SETUP_STAGE_LABELS` |
| `src/lib/auth.ts` | Added `requireAdmin()` and `isPremiumActive()` |
| `src/components/layout/sidebar.tsx` | Added "Trade Setups" nav item below Research Boards, and a "Premium Plan" nav item |

## New files

| File | Purpose |
|---|---|
| `src/lib/razorpay.ts` | Razorpay SDK singleton, payment/webhook signature verification |
| `src/app/api/trade-setups/route.ts` | `GET` (list, Upcoming gated) / `POST` (admin-only create) |
| `src/app/api/trade-setups/[id]/route.ts` | `GET` / `PATCH` / `DELETE` (admin-only for mutations) |
| `src/app/api/subscription/status/route.ts` | Current user's premium/admin status |
| `src/app/api/payments/create-order/route.ts` | Creates a ₹49 Razorpay order |
| `src/app/api/payments/verify/route.ts` | Verifies payment signature, extends `premiumUntil` by 30 days |
| `src/app/api/payments/webhook/route.ts` | Razorpay webhook safety net for `payment.captured` |
| `src/hooks/use-trade-setups.ts` | React Query hooks: list/create/update/delete trade setups |
| `src/hooks/use-premium.ts` | Subscription status + Razorpay Checkout (UPI-only) flow |
| `src/components/trade-setups/trade-setups-client.tsx` | Main Trade Setups page (tabs, warning banner, grid) |
| `src/components/trade-setups/trade-setup-card.tsx` | Grid card |
| `src/components/trade-setups/trade-setup-view-modal.tsx` | View modal (before/after images for Past) |
| `src/components/trade-setups/trade-setup-form-modal.tsx` | Admin create/edit form |
| `src/components/premium/premium-page-client.tsx` | Premium Plan page (demo chart + subscribe) |
| `src/app/(dashboard)/trade-setups/page.tsx` | Route wrapper |
| `src/app/(dashboard)/premium/page.tsx` | Route wrapper |

## Setup steps after extracting

```bash
npm install                 # picks up the new `razorpay` dependency
npm run db:migrate          # applies the schema changes (or `npm run db:push`)
```

Then in `.env`:
```
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."   # optional, for the webhook safety net
```

Grant yourself admin (no in-app UI for this, by design):
```bash
npm run db:studio
# find your user row, set isAdmin = true
```
