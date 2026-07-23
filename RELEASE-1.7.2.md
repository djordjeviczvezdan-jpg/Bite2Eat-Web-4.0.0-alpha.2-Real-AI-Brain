# Bite2Eat 1.7.2-alpha.1

## Configurable kitchen payment release

Restaurant owners and managers can now choose when online card orders are released to the Kitchen Display System:

- **Only after successful card payment** (default and recommended)
- **Immediately when checkout starts**

Cash orders are released immediately. Failed card payments never appear in the kitchen. Pending card orders remain visible in the admin order history so staff can review abandoned or incomplete checkouts.

## Database change

Adds `Restaurant.requireCardPaymentBeforeKitchen` with a default value of `true`.
