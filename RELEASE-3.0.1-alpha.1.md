# Bite2Eat 3.0.1-alpha.1 — Optional Modules

## Added

- Inventory is now an optional restaurant module.
- New Optional Modules card in Restaurant Settings.
- Inventory navigation is hidden when the module is disabled.
- Inventory API and page are protected when disabled.
- Turning Inventory off preserves all ingredient, supplier and movement data.
- Existing restaurants with inventory data remain enabled after migration.
- New restaurants start with Inventory disabled.

## Upgrade

```powershell
npm install
npx prisma generate
npx prisma db push
npm run dev
```
