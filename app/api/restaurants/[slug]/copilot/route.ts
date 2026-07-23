import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRestaurantRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildRestaurantContext } from "@/lib/ai/context";
import { answerCopilot, detectFunction } from "@/lib/ai/copilot";
import { OpenAIProvider } from "@/lib/ai/openai-provider";
import { AIProviderConfigurationError, type AIChatMessage } from "@/lib/ai/provider";
import { buildCopilotSystemPrompt, sanitiseConversation } from "@/lib/ai/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1500),
});
const requestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  messages: z.array(messageSchema).max(12).optional().default([]),
});

function jsonLine(value: unknown) {
  return `${JSON.stringify(value)}\n`;
}

async function writeAudit(input: {
  restaurantId: string;
  staffId: string;
  prompt: string;
  functionName: string;
  success: boolean;
  errorMessage?: string;
}) {
  try {
    await getDb().$executeRaw`INSERT INTO "AiAuditLog" ("id", "restaurantId", "staffId", "prompt", "functionName", "success", "errorMessage", "createdAt") VALUES (${randomUUID()}, ${input.restaurantId}, ${input.staffId}, ${input.prompt}, ${input.functionName}, ${input.success}, ${input.errorMessage || null}, NOW())`;
  } catch (error) {
    console.error("AI audit logging failed", error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (process.env.AI_ENABLED === "false") return NextResponse.json({ error: "Bite2Eat Copilot is disabled." }, { status: 503 });
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid message of up to 1,000 characters." }, { status: 400 });

  const prompt = parsed.data.message;
  const functionName = detectFunction(prompt);
  const context = await buildRestaurantContext(session.restaurantId);
  const fallback = answerCopilot(prompt, context);

  let provider: OpenAIProvider;
  try {
    provider = new OpenAIProvider();
  } catch (error) {
    if (error instanceof AIProviderConfigurationError) {
      return NextResponse.json({ error: "Real AI is not configured. Add OPENAI_API_KEY to .env and restart the server." }, { status: 503 });
    }
    throw error;
  }

  const messages = sanitiseConversation(parsed.data.messages as AIChatMessage[], prompt);
  const system = buildCopilotSystemPrompt(context);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let completeText = "";
      try {
        controller.enqueue(encoder.encode(jsonLine({ type: "meta", provider: provider.name, functionName })));
        for await (const delta of provider.streamText({ system, messages, signal: request.signal })) {
          completeText += delta;
          controller.enqueue(encoder.encode(jsonLine({ type: "delta", text: delta })));
        }
        if (!completeText.trim()) {
          completeText = fallback.answer;
          controller.enqueue(encoder.encode(jsonLine({ type: "delta", text: completeText })));
        }
        controller.enqueue(encoder.encode(jsonLine({ type: "done", links: fallback.links || [], confidence: 95 })));
        await writeAudit({ restaurantId: session.restaurantId, staffId: session.staffId, prompt, functionName, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown AI provider error";
        console.error("Copilot streaming request failed", error);
        controller.enqueue(encoder.encode(jsonLine({ type: "error", error: "The AI service could not answer. Check your API key, model and account billing, then try again." })));
        await writeAudit({ restaurantId: session.restaurantId, staffId: session.staffId, prompt, functionName, success: false, errorMessage: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
