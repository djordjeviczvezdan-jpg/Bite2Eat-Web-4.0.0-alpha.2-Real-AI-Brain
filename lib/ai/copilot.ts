import type { CopilotFunctionName, CopilotResponse } from "@/lib/ai/types";
import type { buildRestaurantContext } from "@/lib/ai/context";

type Context = Awaited<ReturnType<typeof buildRestaurantContext>>;
const money = (value: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value);

export function detectFunction(message: string): CopilotFunctionName {
  const q = message.toLowerCase();
  if (/low stock|stock low|reorder|inventory/.test(q)) return "low_stock";
  if (/top customer|best customer|vip|highest spend/.test(q)) return "top_customers";
  if (/best sell|top sell|popular item|most sold/.test(q)) return "best_sellers";
  if (/profit|margin|food cost|profitable/.test(q)) return "profitability";
  if (/revenue|sales|takings|orders today|how are we doing/.test(q)) return "today_revenue";
  if (/open |go to|show me (the )?(inventory|customers|crm|analytics|marketing|profitability|coach)/.test(q)) return "navigate";
  return "general_help";
}

export function answerCopilot(message: string, context: Context): CopilotResponse {
  const functionName = detectFunction(message);
  const slug = context.restaurant.slug;
  const base = { functionName, generatedAt: new Date().toISOString() } as const;

  if (functionName === "today_revenue") {
    return { ...base, confidence: 99, answer: `Today ${context.restaurant.name} has taken ${money(context.today.revenue)} from ${context.today.orders} paid order${context.today.orders === 1 ? "" : "s"}. The average order value is ${money(context.today.averageOrder)}.`, links: [{ label: "Open analytics", href: `/r/${slug}/analytics` }] };
  }
  if (functionName === "low_stock") {
    if (!context.restaurant.inventoryEnabled) return { ...base, confidence: 100, answer: "Inventory is currently disabled for this restaurant. Enable the optional Inventory module before Bite2Eat can monitor stock.", links: [{ label: "Open settings", href: `/r/${slug}/admin` }] };
    if (!context.lowStock.length) return { ...base, confidence: 98, answer: "No active ingredients are currently at or below their reorder level.", links: [{ label: "Open inventory", href: `/r/${slug}/inventory` }] };
    const details = context.lowStock.slice(0, 5).map((item) => `${item.name}: ${item.currentStock} ${item.unit.toLowerCase()} (reorder at ${item.reorderLevel})`).join("; ");
    return { ...base, confidence: 99, answer: `${context.lowStock.length} ingredient${context.lowStock.length === 1 ? " is" : "s are"} low. ${details}.`, links: [{ label: "Open inventory", href: `/r/${slug}/inventory` }] };
  }
  if (functionName === "top_customers") {
    if (!context.topCustomers.length) return { ...base, confidence: 95, answer: "There is not enough customer order history yet to rank top customers.", links: [{ label: "Open customers", href: `/r/${slug}/customers` }] };
    const details = context.topCustomers.map((customer, index) => `${index + 1}. ${customer.name} — ${money(customer.totalSpend)} across ${customer.orderCount} order${customer.orderCount === 1 ? "" : "s"}`).join("\n");
    return { ...base, confidence: 98, answer: `Your top customers by recorded spend are:\n${details}`, links: [{ label: "Open CRM", href: `/r/${slug}/customers` }] };
  }
  if (functionName === "best_sellers") {
    if (!context.bestSellers.length) return { ...base, confidence: 95, answer: "There are no paid orders today yet, so I cannot rank today's best sellers.", links: [{ label: "Open analytics", href: `/r/${slug}/analytics` }] };
    const details = context.bestSellers.map((item, index) => `${index + 1}. ${item.name} — ${item.quantity} sold (${money(item.revenue)})`).join("\n");
    return { ...base, confidence: 98, answer: `Today's best sellers are:\n${details}`, links: [{ label: "Open analytics", href: `/r/${slug}/analytics` }] };
  }
  if (functionName === "profitability") {
    const ranked = context.menuItems
      .map((item) => ({ ...item, profit: item.price - item.recipeCost, margin: item.price ? ((item.price - item.recipeCost) / item.price) * 100 : 0 }))
      .filter((item) => item.recipeCost > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 3);
    if (!context.restaurant.recipeCostingEnabled || !ranked.length) return { ...base, confidence: 92, answer: "Recipe costing is disabled or recipe costs are incomplete, so I cannot provide a reliable profitability ranking yet.", links: [{ label: "Open profitability", href: `/r/${slug}/profitability` }] };
    return { ...base, confidence: 94, answer: `Your strongest estimated profit contributors per item are: ${ranked.map((item) => `${item.name} ${money(item.profit)} (${item.margin.toFixed(1)}% margin)`).join("; ")}.`, links: [{ label: "Open profitability", href: `/r/${slug}/profitability` }] };
  }
  if (functionName === "navigate") {
    const q = message.toLowerCase();
    const destination = q.includes("inventory") ? ["Inventory", "inventory"] : q.includes("customer") || q.includes("crm") ? ["CRM", "customers"] : q.includes("marketing") ? ["Marketing", "marketing"] : q.includes("profit") ? ["Profitability", "profitability"] : q.includes("coach") ? ["Restaurant Coach", "coach"] : ["Analytics", "analytics"];
    return { ...base, confidence: 96, answer: `Use the button below to open ${destination[0]}.`, links: [{ label: `Open ${destination[0]}`, href: `/r/${slug}/${destination[1]}` }] };
  }
  return { ...base, confidence: 100, answer: "I am Bite2Eat Copilot. In this read-only milestone I can report today's revenue, low stock, top customers, best sellers and profitability, or take you to the right management screen. Try asking “How are we doing today?”", links: [{ label: "Open Restaurant Coach", href: `/r/${slug}/coach` }] };
}
