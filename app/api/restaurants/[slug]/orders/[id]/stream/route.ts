import { getDb } from "@/lib/db";
import { toRestaurantOrder } from "@/lib/db-mappers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const include = { items: { include: { menuItem: true } } } as const;
const encoder = new TextEncoder();

function event(name: string, value: unknown) {
  return encoder.encode(`event: ${name}\ndata: ${JSON.stringify(value)}\n\n`);
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let stopped = false;
  request.signal.addEventListener("abort", () => { stopped = true; });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastSignature = "";
      let heartbeatAt = 0;

      while (!stopped) {
        try {
          const order = await getDb().order.findFirst({
            where: { id, restaurant: { slug, isActive: true } },
            include
          });

          if (!order) {
            controller.enqueue(event("order-missing", { message: "Order not found" }));
            controller.close();
            return;
          }

          const mapped = toRestaurantOrder(order);
          const signature = `${mapped.id}:${mapped.status}:${mapped.paymentStatus}:${mapped.updatedAt}`;
          if (signature !== lastSignature) {
            controller.enqueue(event("order", mapped));
            lastSignature = signature;
          }

          if (Date.now() - heartbeatAt > 15_000) {
            controller.enqueue(event("heartbeat", { at: new Date().toISOString() }));
            heartbeatAt = Date.now();
          }
        } catch (error) {
          controller.enqueue(event("stream-error", {
            message: error instanceof Error ? error.message : "Could not read order status."
          }));
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      try { controller.close(); } catch {}
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
