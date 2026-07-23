# Bite2Eat 2.2.0-alpha.1 — Campaign Centre

## Included
- Full campaign library with Draft, Scheduled, Active, Paused and Completed states
- Create, edit, activate, pause and delete campaign actions
- Email, SMS and push campaign channels
- Campaign date/time scheduling metadata
- Six ready-to-use campaign templates
- Live audience counts for All, VIP, Loyal, Inactive, New and High Spender segments
- Segment value and average-spend summaries
- Integrated coupon and loyalty tabs
- Restaurant-isolated campaign APIs and database queries

## Database update
Run `npx prisma db push` after extracting this release. The release adds the `SCHEDULED` campaign status.

## Scope note
This release creates and manages campaign records. It does not send real emails/SMS/push notifications yet; delivery and performance tracking are planned for the next sprint.
