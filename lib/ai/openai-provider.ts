import OpenAI from "openai";
import type { AIProvider, AIStreamRequest } from "@/lib/ai/provider";
import { AIProviderConfigurationError } from "@/lib/ai/provider";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new AIProviderConfigurationError("OPENAI_API_KEY is not configured.");
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
  }

  async *streamText(request: AIStreamRequest): AsyncIterable<string> {
    const input = request.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const stream = await this.client.responses.create(
      {
        model: this.model,
        instructions: request.system,
        input,
        stream: true,
        max_output_tokens: 900,
      },
      { signal: request.signal },
    );

    for await (const event of stream) {
      if (event.type === "response.output_text.delta" && event.delta) {
        yield event.delta;
      }
    }
  }
}
