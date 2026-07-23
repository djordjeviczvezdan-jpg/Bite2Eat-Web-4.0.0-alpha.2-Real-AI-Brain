# Bite2Eat 4.0.0-alpha.1 — AI Copilot Foundation

## Included
- Floating Copilot on restaurant administration pages
- Read-only restaurant-aware answers for today's revenue, low stock, top customers, best sellers and profitability
- Controlled function registry and tenant-scoped context engine
- Links to the relevant management screens
- Local conversation history and responsive mobile panel
- Owner/manager authorization
- AI interaction audit log in PostgreSQL
- Server and browser feature flags
- No automatic data changes and no OpenAI API key required

## Install / upgrade
1. Copy your working `.env` into this folder and add:
   - `AI_ENABLED="true"`
   - `NEXT_PUBLIC_AI_ENABLED="true"`
2. Run `npm install`
3. Run `npx prisma generate`
4. Run `npx prisma migrate dev`
5. Run `npm run dev`
6. Sign in as an Owner or Manager and open `/r/jimmys/admin`

The Copilot button appears at the bottom-right. Press Ctrl+K to toggle it.
