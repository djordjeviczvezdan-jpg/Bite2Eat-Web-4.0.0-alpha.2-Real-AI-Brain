# Bite2Eat Web

Bite2Eat is a multi-restaurant ordering platform built with Next.js, TypeScript, PostgreSQL and Prisma.

## Local setup

```powershell
Copy-Item .env.example .env
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Use the existing `takeai-postgres` Docker container if it is already running. The internal database/container names remain unchanged to preserve compatibility with existing local data.

Open `http://localhost:3000`.

## Project structure

- `app/` — pages, layouts and API routes
- `components/` — storefront and restaurant dashboards
- `lib/` — authentication, database and order services
- `prisma/` — schema, migrations and seed data
- `public/` — static assets
- `scripts/` — development utilities

## Branding

The platform brand is Bite2Eat. Restaurant pages generate browser metadata from the restaurant record in PostgreSQL, producing titles such as `Marco's Pizza | Bite2Eat`.


## Stripe payments

1. Add Stripe test values to `.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL`.
2. Run `npm run db:deploy` after updating this release.
3. For local webhook testing, run `stripe listen --forward-to localhost:3000/api/payments/webhook` and copy the returned `whsec_...` value into `.env`.
4. Enable cards in the restaurant settings. Stripe Checkout automatically presents supported card wallets such as Apple Pay and Google Pay when eligible.

Card orders are created as pending and marked paid only after Stripe confirms the Checkout Session. Cash orders continue to go directly to the kitchen. Connect destination-charge fields are included in the database for a future connected-account onboarding flow.
