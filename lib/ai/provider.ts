export type AIChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AIStreamRequest = {
  system: string;
  messages: AIChatMessage[];
  signal?: AbortSignal;
};

export interface AIProvider {
  readonly name: string;
  streamText(request: AIStreamRequest): AsyncIterable<string>;
}

export class AIProviderConfigurationError extends Error {}
