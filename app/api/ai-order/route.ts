import OpenAI from "openai";
import { NextResponse } from "next/server";
import { menuItems } from "@/data/menu";
import type { AIOrderResponse, BasketUpdate } from "@/lib/ai-types";
import { aliasesForPrompt, runOrderEngine } from "@/lib/order-engine";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RequestBody = {
  message?: string;
  messages?: ChatMessage[];
  basket?: BasketUpdate[];
};

const menuForPrompt = menuItems.map((item) => ({
  id: item.id,
  name: item.name,
  description: item.description,
  category: item.category,
  price: item.price
}));

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    basket: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "integer" },
          quantity: { type: "integer", minimum: 1, maximum: 20 },
          modifiers: {
            type: "array",
            maxItems: 8,
            items: { type: "string" }
          }
        },
        required: ["id", "quantity", "modifiers"]
      }
    },
    suggestions: {
      type: "array",
      maxItems: 3,
      items: { type: "integer" }
    }
  },
  required: ["reply", "basket", "suggestions"]
};

function normaliseBasket(items: BasketUpdate[] = []): BasketUpdate[] {
  const allowedIds = new Set(menuItems.map((item) => item.id));
  const quantities = new Map<number, BasketUpdate>();

  for (const item of items) {
    if (!allowedIds.has(item.id)) continue;
    quantities.set(item.id, {
      id: item.id,
      quantity: Math.max(1, Math.min(20, Math.round(item.quantity))),
      modifiers: [...new Set((item.modifiers ?? []).filter(Boolean).slice(0, 8))]
    });
  }

  return [...quantities.values()];
}

function fallbackOrder(message: string, currentBasket: BasketUpdate[]): AIOrderResponse {
  const result = runOrderEngine(message, currentBasket);
  if (result) return result;

  return {
    reply: "I can take orders, change quantities, remove individual items, swap products, add notes such as ‘no onions’, answer menu questions and recommend food for a budget.",
    basket: currentBasket,
    suggestions: [1, 4, 5]
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const message = body.message?.trim() ?? "";
    const currentBasket = normaliseBasket(body.basket);

    if (!message) {
      return NextResponse.json({ error: "Please enter an order." }, { status: 400 });
    }

    // Reliable order operations are handled deterministically first.
    const engineResult = runOrderEngine(message, currentBasket);
    if (engineResult) return NextResponse.json(engineResult);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(fallbackOrder(message, currentBasket));
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const history = (body.messages ?? [])
      .slice(-10)
      .map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`)
      .join("\n");

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions: `You are Bite2Eat's friendly restaurant ordering assistant.

A deterministic order engine has already handled direct basket commands. You should handle genuinely conversational requests, recommendations and ambiguity.

Rules:
- Use only items from the supplied menu.
- Never invent products, prices, ingredients, allergens, certifications or sizes.
- The basket must be the complete basket after the newest request.
- Preserve every existing item, quantity and modifier unless the customer clearly asks to change it.
- Modifiers are short preparation notes such as "No onions", "Extra cheese" or "Sauce on the side".
- Never claim an allergen or dietary status unless it is explicitly supplied.
- Ask one short clarification question when necessary.
- Do not add products when the customer is merely asking a question.
- Keep the reply friendly and concise.`,
      input: `MENU:\n${JSON.stringify(menuForPrompt, null, 2)}\n\nKNOWN ITEM ALIASES:\n${JSON.stringify(aliasesForPrompt(), null, 2)}\n\nCURRENT BASKET:\n${JSON.stringify(currentBasket, null, 2)}\n\nRECENT CONVERSATION:\n${history || "None"}\n\nLATEST CUSTOMER MESSAGE:\n${message}`,
      text: {
        format: {
          type: "json_schema",
          name: "takeai_order_response",
          strict: true,
          schema: responseSchema
        }
      }
    });

    const parsed = JSON.parse(response.output_text) as AIOrderResponse;
    return NextResponse.json({
      reply: parsed.reply,
      basket: normaliseBasket(parsed.basket),
      suggestions: (parsed.suggestions ?? []).filter((id) => menuItems.some((item) => item.id === id)).slice(0, 3)
    });
  } catch (error) {
    console.error("AI ordering error", error);
    return NextResponse.json(
      { error: "The ordering assistant had a problem. Please try again." },
      { status: 500 }
    );
  }
}
