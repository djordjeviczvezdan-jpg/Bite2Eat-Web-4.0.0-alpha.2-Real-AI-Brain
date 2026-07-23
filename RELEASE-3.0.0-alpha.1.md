# Bite2Eat 3.0.0-alpha.1 — Inventory Foundation

## Included
- Restaurant-isolated inventory dashboard
- Ingredients with units, category, current/minimum/reorder stock, cost and supplier
- Supplier directory with contacts and lead times
- Stock received, manual adjustment and waste movements
- Full stock movement audit trail
- Low-stock and out-of-stock indicators
- Live inventory valuation
- Inventory link in the restaurant admin area

## Install
Copy your working `.env` file into this project, then run:

```powershell
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open `/r/jimmys/inventory` (replace `jimmys` with the restaurant slug).

## Scope
Automatic recipe deductions and purchase orders are intentionally reserved for the next inventory sprints.
