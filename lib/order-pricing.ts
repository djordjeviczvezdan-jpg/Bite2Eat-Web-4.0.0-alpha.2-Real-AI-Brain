
type CheckoutBody = {
  fulfilment: "delivery" | "collection";
  paymentMethod: "card" | "cash";
  customer: { name: string; phone: string; email?: string; address?: string; postcode?: string; notes?: string };
  items: Array<{ id: number; quantity: number; modifiers?: string[] }>;
};

export async function buildValidatedOrder(db: any, slug: string, body: CheckoutBody) {
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    include: {
      menuItems: {
        where: { available: true },
        include: { modifierLinks: { include: { modifierGroup: { include: { options: true } } } } }
      }
    }
  });
  if (!restaurant) throw new Error("Restaurant not found");
  if (!restaurant.acceptingOrders) throw new Error("Restaurant is not accepting orders");
  if (!String(body.customer?.name ?? "").trim() || String(body.customer?.phone ?? "").trim().length < 7) throw new Error("Please complete the required customer details");
  if (body.fulfilment === "delivery" && !String(body.customer?.address ?? "").trim()) throw new Error("A delivery address is required");
  if (!Array.isArray(body.items) || body.items.length === 0) throw new Error("Your basket is empty");

  const menu = new Map<number | null, any>(restaurant.menuItems.map((item: any) => [item.externalId, item]));
  const items = body.items.map(line => {
    const item = menu.get(Number(line.id));
    if (!item) throw new Error("One or more basket items are unavailable");
    const quantity = Math.max(1, Math.min(50, Number(line.quantity) || 1));
    const modifierLabels = Array.isArray(line.modifiers) ? line.modifiers.filter(v => typeof v === "string").slice(0, 30) : [];
    let modifierTotal = 0;
    const optionPrices = new Map<string, number>();
    for (const link of item.modifierLinks as any[]) {
      for (const option of link.modifierGroup.options as any[]) optionPrices.set(option.name, Number(option.priceDelta));
    }
    for (const label of modifierLabels) {
      const selected = label.split(":").slice(1).join(":").replace(/\s*\(\+€[\d.]+\)\s*$/, "").trim();
      if (optionPrices.has(selected)) modifierTotal += optionPrices.get(selected) ?? 0;
    }
    const unitPrice = Number(item.price) + modifierTotal;
    return { menuItemId: item.id, externalId: item.externalId ?? Number(line.id), name: item.name, emoji: item.emoji ?? "🍽️", quantity, unitPrice, modifiers: modifierLabels };
  });

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const fulfilment = body.fulfilment === "collection" ? "COLLECTION" : "DELIVERY";
  if (fulfilment === "DELIVERY" && subtotal < Number(restaurant.minimumOrder)) throw new Error(`Delivery requires a minimum food order of €${Number(restaurant.minimumOrder).toFixed(2)}.`);
  if (body.paymentMethod === "card" && (!restaurant.cardEnabled || subtotal < Number(restaurant.minimumCardOrder))) throw new Error("Card payment is not available for this order");
  if (body.paymentMethod === "cash" && !restaurant.cashEnabled) throw new Error("Cash payment is not available");

  const free = fulfilment === "DELIVERY" && restaurant.freeDeliveryThreshold && subtotal >= Number(restaurant.freeDeliveryThreshold);
  const deliveryFee = fulfilment === "DELIVERY" && !free ? Number(restaurant.deliveryFee) : 0;
  const serviceFee = 0.5;
  const total = subtotal + deliveryFee + serviceFee;
  const estimateSource = fulfilment === "DELIVERY" ? restaurant.deliveryMinutes : restaurant.collectionMinutes;
  const estimatedMinutes = Number.parseInt(estimateSource ?? "30", 10) || 30;
  return { restaurant, items, subtotal, deliveryFee, serviceFee, total, estimatedMinutes, fulfilment };
}
