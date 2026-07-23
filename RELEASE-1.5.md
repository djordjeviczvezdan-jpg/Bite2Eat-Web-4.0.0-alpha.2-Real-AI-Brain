# Bite2Eat 1.5.0-alpha.1 — Real Food Photography

- Adds `MenuItem.imageUrl` with Prisma migration.
- Imports the seven real product photos currently published by Jimmy’s Takeaway.
- Displays real photos on menu cards, featured cards and product customiser.
- Adds image URL editing in Admin → Menu.
- Keeps emoji as a fallback for products without a published photo.

After copying `.env`, run `npx.cmd prisma db push` and `npx.cmd prisma db seed`.
