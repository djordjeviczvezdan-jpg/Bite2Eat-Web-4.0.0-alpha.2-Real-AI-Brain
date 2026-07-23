# Bite2Eat 1.1.0 Alpha 1

This release adds the first production-style menu engine using Jimmy's Takeaway Skerries as the pilot tenant.

## Run the update

```powershell
cd "C:\Users\marco\Desktop\Bite2Eat\Bite2Eat-Web-1.1.0-alpha.1"
Copy-Item .env.example .env
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000/r/jimmys`.

Try products such as Pizza Deal, Pepperoni, Chicken Fillet Burger, Kebab Meal and Southern Fried Family Box to test different modifier rules.

## Pilot-data note

The visible menu names, descriptions and base prices were imported from Jimmy's public menu on 21 July 2026. Modifier prices and detailed choice rules are an initial configurable pilot setup and must be confirmed with Jimmy before accepting live paid orders.
