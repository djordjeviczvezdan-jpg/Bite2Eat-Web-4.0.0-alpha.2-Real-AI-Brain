# 1.4.1-alpha.1

- Added a separate Payment column to Restaurant Admin → Order history.
- Added clear Paid, Pending, Failed, Refunded and Cash badges.
- Added payment status to active orders on the admin overview.
- Customer order tracking now distinguishes Card · Paid/Pending/Failed/Refunded from Cash.
- Reuses the existing Stripe session verification and signed webhook payment updates.
- No destructive database migration is required because payment fields already exist in 1.4.0.

# 1.3.0-alpha.2

- Based directly on the verified 1.2.0 fixed project.
- Keeps the complete payments foundation from 1.3.0-alpha.1.
- Replaces the internal package tarball URL with the public npm registry.
- Adds a project-level `.npmrc` and `install-clean.ps1` for reliable Windows setup.

# Changelog

## 1.2.0-alpha.1 — Checkout, kitchen workflow and persistent tracking

- Added a dedicated customer order-tracking URL that can be reopened after checkout.
- Added a public single-order read endpoint scoped to the restaurant and order ID.
- Added automatic tracking refresh, order summary, fulfilment, payment and item details.
- Improved checkout validation for paused ordering, empty baskets, payment availability and delivery minimums.
- Added free-delivery threshold calculation and progress messaging.
- Checkout now reflects each restaurant’s configured delivery and collection estimates.
- Added kitchen search by order number, customer name or phone number.
- Added delivery and collection filters to the live kitchen board.
- Kept status updates protected behind restaurant staff authentication.

## 1.0.0-alpha.2

- Added a premium featured-items rail for high-converting menu highlights.
- Added instant menu search across item names, descriptions, categories and badges.
- Added a promotional free-delivery ribbon driven by each restaurant's settings.
- Added visible delivery and collection estimates above the menu.
- Added an empty-search recovery state and improved mobile horizontal browsing.
- Kept all storefront content tenant-driven so every new takeaway receives the same improvements.

## 1.0.0-alpha.1

- Added multi-step restaurant onboarding and expanded restaurant configuration.

## 1.1.0-alpha.1 — Jimmy's menu and product customisation

- Imported Jimmy's Takeaway Skerries menu as a real tenant dataset with more than 100 visible menu products across 15 categories.
- Added reusable multi-tenant modifier groups and options.
- Added required and optional selection rules, minimum and maximum choices, default choices and price adjustments.
- Added pizza sizes and toppings, burger removals and extras, meal upgrades, drink choices, kebab meat/sauce/salad choices, dips and special instructions.
- Added a mobile-first product customisation modal with live price calculation.
- Basket now keeps separately customised versions of the same product as distinct lines.
- Added a Prisma migration for ModifierGroup, ModifierOption and ProductModifierGroup.

## 1.3.0-alpha.1 — Payments foundation
- Stripe-hosted Checkout for card payments.
- Apple Pay and Google Pay support through eligible Stripe Checkout sessions.
- Signed webhook processing for successful, failed and refunded payments.
- Server-authoritative menu pricing and fee calculation.
- Pending/paid/failed/refunded payment status stored per order.
- Cash orders remain supported and bypass Stripe.
- Stripe Connect destination-charge and platform-fee database foundation.
- Payment success and cancellation pages.

## 4.0.0-alpha.2
- Added real OpenAI-powered, restaurant-aware streaming Copilot conversations.
- Added multi-turn session context, response cancellation and improved AI safety/error handling.
