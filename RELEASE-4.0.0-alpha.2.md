# Bite2Eat 4.0.0-alpha.2 — Real AI Brain

## Included

- OpenAI Responses API integration through a provider abstraction
- Server-side API key handling
- Streaming Copilot answers using NDJSON
- Multi-turn conversation context for the current browser session
- Restaurant-scoped context covering revenue, orders, stock, customers, best sellers and menu profitability
- Read-only system rules and prompt-injection resistance
- Stop-response and clear-conversation controls
- Friendly configuration and provider error messages
- Existing rule-based answer retained as a safe empty-response fallback and for navigation links
- Existing AI audit logging retained

## Environment

Add to `.env`:

```env
AI_ENABLED="true"
NEXT_PUBLIC_AI_ENABLED="true"
OPENAI_API_KEY="your_api_key_here"
OPENAI_MODEL="gpt-5-mini"
```

Restart `npm run dev` after changing `.env`.

## Database

No new database migration is required for alpha.2. If alpha.1 is already running, use the same database.

## Safety

Copilot remains read-only. It cannot change restaurant data or execute campaigns, purchasing or pricing actions.
