# Bite2Eat 1.4.0 Alpha 1 — Restaurant Owner Portal

This release builds on the working Stripe Checkout release and strengthens the restaurant owner experience.

## Added
- Menu search and category filtering
- Duplicate-product workflow
- Free-text category editing with existing-category suggestions
- Faster sold-out/available controls
- Database-backed weekly opening hours
- Opening-hours editor for all seven days
- Restaurant settings and opening hours saved together
- Cleaner owner portal wording and release metadata

## Test checklist
1. Sign in as the restaurant owner.
2. Open `/r/jimmys/admin`.
3. Search for a product and filter by category.
4. Duplicate a product, edit its name and price, then save and publish.
5. Mark a product sold out and confirm it changes on the storefront.
6. Change one day's opening hours and save restaurant settings.
7. Refresh the page and confirm the schedule remains saved.
