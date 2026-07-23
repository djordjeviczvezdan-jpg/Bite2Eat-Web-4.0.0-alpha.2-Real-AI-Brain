# Bite2Eat 2.1.0-alpha.1 — Customer CRM Foundation

## Added
- Multi-tenant customer directory at `/r/[slug]/customers`
- Search by customer name, email and phone
- Segment filters and sortable customer rankings
- Automatic VIP, Loyal, New, Inactive and High Spender segments
- Customer profile pages with lifetime spend, order totals, average order and loyalty balance
- Favourite-item analysis from completed/qualifying order history
- Recent order history with links to order tracking
- Loyalty transaction history
- Owner/manager authorization and restaurant-level data isolation for CRM APIs
- CRM links from Analytics and Marketing Centre

## Segment rules
- VIP: €500+ lifetime spend or 20+ orders
- Loyal: 5+ orders
- New: 0–1 orders and joined within 30 days
- Inactive: last order was 30+ days ago
- High spender: €250+ lifetime spend

No database migration is required because this release uses the existing Customer, Order, OrderItem and LoyaltyTransaction models.
