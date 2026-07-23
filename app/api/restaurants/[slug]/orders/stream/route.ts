import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";
import { toRestaurantOrder } from "@/lib/db-mappers";
import { canReleaseOrderToKitchen } from "@/lib/kitchen-order-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const include = { items: { include: { menuItem: true } } } as const;
const encoder = new TextEncoder();

function event(name: string, value: unknown) {
  return encoder.encode(`event: ${name}\ndata: ${JSON.stringify(value)}\n\n`);
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER", "KITCHEN"]);
  if (!session) return new Response("Unauthorized", { status: 401 });

  let stopped = false;
  request.signal.addEventListener("abort", () => { stopped = true; });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastSignature = "";
      let heartbeatAt = 0;

      const close = () => {
        if (stopped) {
          try { controller.close(); } catch {}
          return true;
        }
        return false;
      };

      while (!close()) {
        try {
          const db = getDb();
          const restaurant = await db.restaurant.findUnique({
            where: { slug },
            select: { id: true, requireCardPaymentBeforeKitchen: true }
          });
          if (!restaurant) throw new Error("Restaurant not found");

          const orders = await db.order.findMany({
            where: { restaurantId: restaurant.id },
            include,
            orderBy: { createdAt: "desc" },
            take: 250
          });
          const mapped = orders
            .filter((order: any) => canReleaseOrderToKitchen(order, restaurant as any))
            .map((order: any) => toRestaurantOrder(order));
          const signature = mapped.map((order: any) => `${order.id}:${order.status}:${order.paymentStatus}:${order.updatedAt}`).join("|");

          if (signature !== lastSignature) {
            controller.enqueue(event("orders", mapped));
            lastSignature = signature;
          }

          if (Date.now() - heartbeatAt > 15_000) {
            controller.enqueue(event("heartbeat", { at: new Date().toISOString() }));
            heartbeatAt = Date.now();
          }
        } catch (error) {
          controller.enqueue(event("stream-error", {
            message: error instanceof Error ? error.message : "Could not read kitchen orders."
          }));
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    },
    cancel() { stopped = true; }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
