"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { type MenuItem } from "@/data/menu";
import type { AIOrderResponse, BasketUpdate } from "@/lib/ai-types";

type CartItem = MenuItem & { quantity: number; modifiers?: string[] };

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  open: boolean;
  menuItems: MenuItem[];
  basket: CartItem[];
  onClose: () => void;
  onBasketChange: (basket: CartItem[]) => void;
  onOpenBasket: () => void;
};

const examples = [
  "Two cheeseburgers and a Coke Zero",
  "A pepperoni pizza with onion rings",
  "What do you recommend for two people?"
];

function hydrateBasket(items: BasketUpdate[], menuItems: MenuItem[]): CartItem[] {
  return items.flatMap((update) => {
    const menuItem = menuItems.find((item) => item.id === update.id);
    return menuItem ? [{ ...menuItem, quantity: update.quantity, modifiers: update.modifiers ?? [] }] : [];
  });
}

export default function AIOrderModal({
  open,
  menuItems,
  basket,
  onClose,
  onBasketChange,
  onOpenBasket
}: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi 👋 Tell me what you’d like and I’ll build your basket."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<number[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!open) return null;

  async function sendMessage(messageText: string) {
    const text = messageText.trim();
    if (!text || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setSuggestions([]);

    try {
      const response = await fetch("/api/ai-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          messages: nextMessages.slice(-8),
          basket: basket.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            modifiers: item.modifiers ?? []
          }))
        })
      });

      const data = (await response.json()) as AIOrderResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "The assistant could not respond.");
      }

      onBasketChange(hydrateBasket(data.basket, menuItems));
      setSuggestions(data.suggestions ?? []);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  const suggestedItems = suggestions
    .map((id) => menuItems.find((item) => item.id === id))
    .filter((item): item is MenuItem => Boolean(item));

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <section
        className="aiModal liveAiModal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawerHeader">
          <div className="aiTitleRow">
            <div className="aiAvatar">✦</div>
            <div>
              <span className="sectionLabel">Bite2Eat live ordering</span>
              <h2>Bite2Eat assistant</h2>
            </div>
          </div>
          <button className="closeButton" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="liveAiLayout">
          <div className="conversationColumn">
            <div className="conversationMessages">
              {messages.map((message, index) => (
                <div
                  className={`liveMessage ${
                    message.role === "user" ? "liveUserMessage" : "liveAssistantMessage"
                  }`}
                  key={`${message.role}-${index}`}
                >
                  {message.role === "assistant" && <span className="messageSpark">✦</span>}
                  <p>{message.content}</p>
                </div>
              ))}

              {loading && (
                <div className="liveMessage liveAssistantMessage">
                  <span className="messageSpark">✦</span>
                  <div className="typingDots"><i /><i /><i /></div>
                </div>
              )}

              {suggestedItems.length > 0 && !loading && (
                <div className="aiSuggestions">
                  <small>You may also like</small>
                  <div>
                    {suggestedItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => void sendMessage(`Add one ${item.name}`)}
                      >
                        <span>{item.emoji}</span>
                        <span>
                          <strong>{item.name}</strong>
                          <small>€{item.price.toFixed(2)}</small>
                        </span>
                        <b>+</b>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {messages.length === 1 && (
              <div className="promptExamples">
                {examples.map((example) => (
                  <button key={example} onClick={() => void sendMessage(example)}>
                    {example}
                  </button>
                ))}
              </div>
            )}

            <form className="liveChatInput" onSubmit={submit}>
              <input
                autoFocus
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type your order naturally..."
                disabled={loading}
              />
              <button disabled={!input.trim() || loading}>Send</button>
            </form>
          </div>

          <aside className="aiBasketPreview">
            <div className="aiBasketHeader">
              <span>Your basket</span>
              <strong>{basket.reduce((sum, item) => sum + item.quantity, 0)} items</strong>
            </div>

            <div className="aiBasketItems">
              {basket.length === 0 ? (
                <div className="miniEmptyBasket">
                  <span>🛍️</span>
                  <p>Your basket will update here while you chat.</p>
                </div>
              ) : (
                basket.map((item) => (
                  <div className="aiBasketItem" key={item.id}>
                    <span>{item.emoji}</span>
                    <div>
                      <strong>{item.quantity} × {item.name}</strong>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <small className="itemModifiers">{item.modifiers.join(" · ")}</small>
                      )}
                      <small>€{(item.price * item.quantity).toFixed(2)}</small>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="aiBasketFooter">
              <div>
                <span>Subtotal</span>
                <strong>
                  €{basket
                    .reduce((sum, item) => sum + item.price * item.quantity, 0)
                    .toFixed(2)}
                </strong>
              </div>
              <button
                disabled={basket.length === 0}
                onClick={() => {
                  onClose();
                  onOpenBasket();
                }}
              >
                Review basket
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
