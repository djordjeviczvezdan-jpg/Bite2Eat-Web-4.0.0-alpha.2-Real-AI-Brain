"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { CopilotLink } from "@/lib/ai/types";

type Message = { id: string; role: "user" | "assistant"; text: string; links?: CopilotLink[]; confidence?: number };
type StreamEvent =
  | { type: "meta"; provider: string; functionName: string }
  | { type: "delta"; text: string }
  | { type: "done"; links?: CopilotLink[]; confidence?: number }
  | { type: "error"; error: string };

const ADMIN_SEGMENTS = ["admin", "analytics", "kitchen", "customers", "marketing", "inventory", "profitability", "coach", "onboarding"];
const SUGGESTIONS = [
  "Why might profit be lower today?",
  "What stock needs attention?",
  "Which customers should I target?",
  "What menu item should I promote?",
];

export default function AICopilot({ slug }: { slug: string }) {
  const pathname = usePathname();
  const isAdminPage = ADMIN_SEGMENTS.some((segment) => pathname.includes(`/r/${slug}/${segment}`));
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", text: "Hi — I’m Bite2Eat Copilot. I can analyse your live restaurant data, explain performance and suggest practical next steps." },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const storageKey = `bite2eat-copilot:${slug}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30))); } catch {}
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, storageKey]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!isAdminPage || process.env.NEXT_PUBLIC_AI_ENABLED === "false") return null;

  async function submit(event?: FormEvent, suggestion?: string) {
    event?.preventDefault();
    const text = (suggestion ?? input).trim();
    if (!text || loading) return;

    const history = messages
      .filter((message) => message.id !== "welcome")
      .slice(-10)
      .map((message) => ({ role: message.role, content: message.text }));
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text };
    const assistantId = crypto.randomUUID();

    setInput("");
    setLoading(true);
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", text: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`/api/restaurants/${slug}/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, messages: history }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Copilot request failed");
      }
      if (!response.body) throw new Error("Copilot returned no response stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line) as StreamEvent;
          if (data.type === "delta") {
            accumulated += data.text;
            setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, text: accumulated } : message));
          } else if (data.type === "done") {
            setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, links: data.links, confidence: data.confidence } : message));
          } else if (data.type === "error") {
            throw new Error(data.error);
          }
        }
        if (done) break;
      }

      if (!accumulated.trim()) throw new Error("Copilot returned an empty answer.");
    } catch (error) {
      const message = error instanceof Error && error.name === "AbortError"
        ? "Response stopped."
        : error instanceof Error ? error.message : "Something went wrong.";
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, text: message } : item));
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  function stopResponse() {
    abortRef.current?.abort();
  }

  function clearConversation() {
    abortRef.current?.abort();
    setMessages([{ id: "welcome", role: "assistant", text: "Conversation cleared. What would you like to analyse?" }]);
  }

  return <>
    <button className="copilotLauncher" onClick={() => setOpen((value) => !value)} aria-label="Open Bite2Eat Copilot"><span>✦</span><b>Ask AI</b></button>
    {open && <section className="copilotPanel" aria-label="Bite2Eat Copilot">
      <header>
        <div><span>✦</span><div><strong>Bite2Eat Copilot</strong><small>Live, read-only AI analysis</small></div></div>
        <div className="copilotHeaderActions"><button onClick={clearConversation} aria-label="Clear conversation" title="Clear conversation">↺</button><button onClick={() => setOpen(false)} aria-label="Close Copilot">×</button></div>
      </header>
      <div className="copilotMessages">
        {messages.map((message) => <article key={message.id} className={`copilotMessage ${message.role}`}>
          <div>{message.text ? message.text.split("\n").map((line, index) => <span key={index}>{line || " "}</span>) : <span className="copilotCursor">▋</span>}</div>
          {message.links?.length ? <nav>{message.links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label} →</Link>)}</nav> : null}
          {message.role === "assistant" && message.confidence ? <small>AI confidence {message.confidence}%</small> : null}
        </article>)}
        {loading && <button className="copilotStop" type="button" onClick={stopResponse}>Stop response</button>}
        <div ref={endRef}/>
      </div>
      {messages.length < 3 && <div className="copilotSuggestions">{SUGGESTIONS.map((suggestion) => <button key={suggestion} onClick={() => void submit(undefined, suggestion)}>{suggestion}</button>)}</div>}
      <form onSubmit={submit}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your restaurant…" maxLength={1000}/><button disabled={loading || !input.trim()} aria-label="Send">↑</button></form>
      <footer>AI can analyse and recommend, but cannot change data. <kbd>Ctrl K</kbd></footer>
    </section>}
  </>;
}
