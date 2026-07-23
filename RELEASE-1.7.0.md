# Bite2Eat 1.7.0-alpha.1 — Kitchen Display System

## Included
- Secure kitchen route at `/r/[slug]/kitchen` for OWNER, MANAGER and KITCHEN roles.
- Three live workflow columns: New, Cooking and Ready.
- Delivery orders remain in Ready while dispatched, then can be marked Delivered.
- Three-second automatic polling and manual refresh.
- New-order sound and on-screen notification.
- Large touch-friendly action buttons with optimistic status updates.
- Colour-coded waiting timers: normal, warning and overdue.
- Search plus fulfilment and payment filters.
- Full-screen kitchen mode.
- Payment status, customer details, notes, address and item modifiers.
- Completed-order archive for the current order list.
- Loading, connection-error and retry states.

## Install
Copy your existing `.env` into this project folder, then run:

```powershell
npm.cmd install
npx.cmd prisma generate
npm.cmd run dev
```

Open:

`http://localhost:3000/r/jimmys/kitchen`

Sign in with an OWNER, MANAGER or KITCHEN account.

## Validation
`tsc --noEmit` completed successfully in the packaging environment.
A complete Next.js build was attempted but the environment could not download the Linux SWC package because the package mirror returned HTTP 503. This is an environment download failure, not a TypeScript compilation error.
