# Bite2Eat 1.4.1-alpha.1 — Payment Status Visibility

This release separates kitchen progress from payment state.

## Restaurant admin
- New Payment column in Order history.
- Paid, Pending, Failed, Refunded and Cash badges.
- Payment badge shown on active orders in Overview.

## Customer tracking
- Shows Card · Paid, Card · Pending, Card · Failed, Card · Refunded, or Cash.

## Database
The paymentStatus, stripeSessionId, stripePaymentIntentId, paidAt and refundedAt fields already existed in 1.4.0, so no new migration is needed. Run `npx.cmd prisma db push` after replacing the project as a safe schema check.
