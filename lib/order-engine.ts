import { menuItems } from "@/data/menu";
import type { AIOrderResponse, BasketUpdate } from "@/lib/ai-types";

const aliases: Record<number, string[]> = {
  1: ["signature cheeseburger", "cheeseburger", "cheese burger", "burger"],
  2: ["double smash meal", "double smash", "smash meal"],
  3: ["stone-baked margherita", "stone baked margherita", "margherita", "margarita"],
  4: ["pepperoni feast", "pepperoni pizza", "pepperoni"],
  5: ["chicken kebab box", "chicken kebab", "kebab box", "kebab"],
  6: ["loaded garlic fries", "garlic fries", "loaded fries"],
  7: ["crispy onion rings", "onion rings"],
  8: ["coke zero", "zero coke", "coke"]
};

const numberWords: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  couple: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10
};

const mutationWords = /\b(add|include|put in|give me|i(?:'d| would) like|want|remove|delete|take off|take out|without|set|make|change|replace|swap|clear|empty)\b/i;

function clean(text: string) {
  return text.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
}

function cloneBasket(items: BasketUpdate[]) {
  return items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    modifiers: [...(item.modifiers ?? [])]
  }));
}

function getAliases(id: number) {
  return aliases[id] ?? [];
}

function findMentions(text: string) {
  const lower = clean(text);
  const mentions: Array<{ id: number; index: number; alias: string }> = [];

  for (const item of menuItems) {
    let best: { id: number; index: number; alias: string } | null = null;
    for (const alias of getAliases(item.id).sort((a, b) => b.length - a.length)) {
      const index = lower.indexOf(alias);
      if (index >= 0 && (!best || index < best.index || alias.length > best.alias.length)) {
        best = { id: item.id, index, alias };
      }
    }
    if (best) mentions.push(best);
  }

  return mentions.sort((a, b) => a.index - b.index);
}

function quantityBefore(text: string, mentionIndex: number) {
  const prefix = text.slice(Math.max(0, mentionIndex - 28), mentionIndex);
  const match = prefix.match(/(?:^|\s)(\d+|a|an|one|two|couple|three|four|five|six|seven|eight|nine|ten)\s*(?:x\s*)?$/i);
  if (!match) return null;
  const token = match[1].toLowerCase();
  const value = /^\d+$/.test(token) ? Number(token) : numberWords[token];
  return Math.max(1, Math.min(20, value));
}

function quantityAnywhere(text: string) {
  const match = clean(text).match(/\b(\d+|a|an|one|two|couple|three|four|five|six|seven|eight|nine|ten)\b/);
  if (!match) return null;
  const token = match[1];
  const value = /^\d+$/.test(token) ? Number(token) : numberWords[token];
  return Math.max(1, Math.min(20, value));
}

function extractModifiers(text: string) {
  const lower = clean(text);
  const modifiers: string[] = [];
  const rules: Array<[RegExp, string]> = [
    [/\b(no|without) onions?\b/, "No onions"],
    [/\b(no|without) pickles?\b/, "No pickles"],
    [/\b(no|without) cheese\b/, "No cheese"],
    [/\bextra cheese\b/, "Extra cheese"],
    [/\bextra sauce\b/, "Extra sauce"],
    [/\b(no|without) sauce\b/, "No sauce"],
    [/\bsauce on the side\b/, "Sauce on the side"],
    [/\b(no|not) spicy\b|\bmild\b/, "Make it mild"],
    [/\bwell done\b/, "Well done"]
  ];

  for (const [pattern, label] of rules) {
    if (pattern.test(lower) && !modifiers.includes(label)) modifiers.push(label);
  }
  return modifiers;
}

function itemName(id: number) {
  return menuItems.find((item) => item.id === id)?.name ?? "item";
}

function upsert(
  basket: BasketUpdate[],
  id: number,
  quantity: number,
  mode: "add" | "set",
  modifiers: string[] = []
) {
  const existing = basket.find((item) => item.id === id);
  if (existing) {
    existing.quantity = mode === "add" ? Math.min(20, existing.quantity + quantity) : quantity;
    if (modifiers.length) existing.modifiers = [...new Set([...(existing.modifiers ?? []), ...modifiers])];
  } else {
    basket.push({ id, quantity, modifiers });
  }
}

function removeQuantity(basket: BasketUpdate[], id: number, quantity: number | null) {
  const index = basket.findIndex((item) => item.id === id);
  if (index < 0) return false;
  if (quantity === null || basket[index].quantity <= quantity) basket.splice(index, 1);
  else basket[index].quantity -= quantity;
  return true;
}

function applyReplace(message: string, basket: BasketUpdate[]): AIOrderResponse | null {
  const lower = clean(message);
  const match = lower.match(/\b(?:replace|swap|change)\s+(.+?)\s+(?:for|with|to)\s+(.+)$/);
  if (!match) return null;
  const from = findMentions(match[1])[0];
  const to = findMentions(match[2])[0];
  if (!from || !to) return null;

  const existing = basket.find((item) => item.id === from.id);
  const quantity = existing?.quantity ?? 1;
  const modifiers = extractModifiers(match[2]);
  removeQuantity(basket, from.id, null);
  upsert(basket, to.id, quantity, "add", modifiers);
  return {
    reply: `Done — I replaced ${itemName(from.id)} with ${quantity} × ${itemName(to.id)}.`,
    basket,
    suggestions: []
  };
}

function applySetQuantity(message: string, basket: BasketUpdate[]): AIOrderResponse | null {
  const lower = clean(message);
  if (!/\b(set|make|change)\b/.test(lower)) return null;
  const mention = findMentions(lower)[0];
  const quantity = quantityAnywhere(lower);
  if (!mention || quantity === null) return null;
  upsert(basket, mention.id, quantity, "set", extractModifiers(lower));
  return {
    reply: `Done — ${itemName(mention.id)} is now set to ${quantity}.`,
    basket,
    suggestions: []
  };
}

function splitCommands(message: string) {
  return clean(message)
    .replace(/\b(and then|then)\b/g, ";")
    .replace(/\b(and)\s+(?=(?:add|include|remove|delete|take|set|make|change|replace|swap)\b)/g, ";")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function applyAddRemove(message: string, basket: BasketUpdate[]): AIOrderResponse | null {
  const clauses = splitCommands(message);
  let changed = false;
  const summaries: string[] = [];

  for (const clause of clauses) {
    const lower = clean(clause);
    const mentions = findMentions(lower);
    if (!mentions.length) continue;

    const isRemove = /\b(remove|delete|take off|take out)\b/.test(lower);
    const isAdd = /\b(add|include|put in|give me|i(?:'d| would) like|want)\b/.test(lower) || !isRemove;

    for (const mention of mentions) {
      const quantity = quantityBefore(lower, mention.index) ?? quantityAnywhere(lower) ?? 1;
      if (isRemove) {
        const explicit = /\b(\d+|one|two|couple|three|four|five|six|seven|eight|nine|ten)\b/.test(lower);
        const removed = removeQuantity(basket, mention.id, explicit ? quantity : null);
        if (removed) {
          changed = true;
          summaries.push(explicit ? `removed ${quantity} × ${itemName(mention.id)}` : `removed ${itemName(mention.id)}`);
        }
      } else if (isAdd) {
        const modifiers = extractModifiers(lower);
        upsert(basket, mention.id, quantity, "add", modifiers);
        changed = true;
        summaries.push(`added ${quantity} × ${itemName(mention.id)}`);
      }
    }
  }

  if (!changed) return null;
  return {
    reply: `Done — I ${summaries.join(" and ")}.`,
    basket,
    suggestions: [6, 7, 8]
  };
}

function applyModifierOnly(message: string, basket: BasketUpdate[]): AIOrderResponse | null {
  const modifiers = extractModifiers(message);
  if (!modifiers.length) return null;
  const mention = findMentions(message)[0];
  const target = mention
    ? basket.find((item) => item.id === mention.id)
    : basket.length === 1
      ? basket[0]
      : null;
  if (!target) return null;
  target.modifiers = [...new Set([...(target.modifiers ?? []), ...modifiers])];
  return {
    reply: `Done — ${itemName(target.id)} will be ${modifiers.join(", ").toLowerCase()}.`,
    basket,
    suggestions: []
  };
}

function answerQuestion(message: string, basket: BasketUpdate[]): AIOrderResponse | null {
  const lower = clean(message);
  if (mutationWords.test(lower)) return null;

  if (/\b(delivery|how long|collection time|wait time)\b/.test(lower)) {
    return { reply: "Delivery is usually 35–45 minutes, while collection is usually ready in about 20 minutes.", basket, suggestions: [] };
  }
  if (/\b(most popular|best seller|popular)\b/.test(lower)) {
    return { reply: "The Signature Cheeseburger is the best seller, and the Pepperoni Feast is the customer-favourite pizza.", basket, suggestions: [1, 4] };
  }
  if (/\b(gluten|allerg|vegan|vegetarian|halal)\b/.test(lower)) {
    return { reply: "I don’t have verified allergen or dietary certification data in this demo, so please confirm directly with the restaurant before ordering.", basket, suggestions: [] };
  }
  const mention = findMentions(lower)[0];
  if (mention && /\b(price|cost|how much|what is|what's|tell me about|contains|come with)\b/.test(lower)) {
    const item = menuItems.find((entry) => entry.id === mention.id)!;
    return { reply: `${item.name} is €${item.price.toFixed(2)}. ${item.description}`, basket, suggestions: [item.id] };
  }
  return null;
}

function budgetRecommendation(message: string, basket: BasketUpdate[]): AIOrderResponse | null {
  const lower = clean(message);
  const budgetMatch = lower.match(/(?:€|euro\s*)(\d+(?:\.\d+)?)/) ?? lower.match(/(\d+(?:\.\d+)?)\s*(?:euro|euros)/);
  if (!budgetMatch || !/\b(recommend|suggest|budget|spend|for two|for 2)\b/.test(lower)) return null;
  const budget = Number(budgetMatch[1]);

  const combos = [
    { ids: [1, 1, 8, 8], label: "two Signature Cheeseburgers and two Coke Zeros" },
    { ids: [1, 1, 7], label: "two Signature Cheeseburgers with Onion Rings to share" },
    { ids: [4, 7, 8], label: "a Pepperoni Feast, Onion Rings and a Coke Zero" },
    { ids: [5, 5], label: "two Chicken Kebab Boxes" }
  ];

  const priced = combos
    .map((combo) => ({ ...combo, total: combo.ids.reduce((sum, id) => sum + (menuItems.find((item) => item.id === id)?.price ?? 0), 0) }))
    .filter((combo) => combo.total <= budget)
    .sort((a, b) => b.total - a.total)[0];

  if (!priced) return { reply: `For a €${budget.toFixed(2)} budget, the cheapest main is the Signature Cheeseburger at €9.50.`, basket, suggestions: [1] };
  return { reply: `For about €${priced.total.toFixed(2)}, I’d suggest ${priced.label}. Say “add that” and I’ll place it in the basket.`, basket, suggestions: [...new Set(priced.ids)] };
}

export function runOrderEngine(message: string, currentBasket: BasketUpdate[]): AIOrderResponse | null {
  const basket = cloneBasket(currentBasket);
  const lower = clean(message);

  if (/\b(clear|empty)\s+(?:my\s+)?(?:basket|cart|order)\b/.test(lower)) {
    return { reply: "Done — I cleared your basket.", basket: [], suggestions: [1, 4, 5] };
  }

  return (
    applyReplace(message, basket) ??
    applySetQuantity(message, basket) ??
    applyModifierOnly(message, basket) ??
    applyAddRemove(message, basket) ??
    budgetRecommendation(message, basket) ??
    answerQuestion(message, basket)
  );
}

export function aliasesForPrompt() {
  return aliases;
}
