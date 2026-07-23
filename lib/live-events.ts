"use client";

import { getActiveTenant } from "@/lib/tenant-context";

export type LiveEvent =
  | { type: "order-created"; orderId: string; orderNumber: number; total: number; customerName: string; at: string }
  | { type: "order-status"; orderId: string; orderNumber: number; status: string; at: string }
  | { type: "menu-updated"; at: string };

const EVENT_NAME = "takeai-live-event";
const CHANNEL = "takeai-restaurant-os";

export function publishLiveEvent(event: LiveEvent) {
  if (typeof window === "undefined") return;
  const detail = { ...event, tenant: getActiveTenant() };
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
  try {
    const channel = new BroadcastChannel(`${CHANNEL}:${getActiveTenant()}`);
    channel.postMessage(detail);
    channel.close();
  } catch {}
}

export function subscribeToLiveEvents(callback: (event: LiveEvent) => void) {
  if (typeof window === "undefined") return () => {};
  const local = (event: Event) => callback((event as CustomEvent).detail as LiveEvent);
  window.addEventListener(EVENT_NAME, local);
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(`${CHANNEL}:${getActiveTenant()}`);
    channel.addEventListener("message", (event) => callback(event.data as LiveEvent));
  } catch {}
  return () => {
    window.removeEventListener(EVENT_NAME, local);
    channel?.close();
  };
}

export function playNewOrderSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.65);
    gain.connect(context.destination);
    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.16);
      oscillator.stop(context.currentTime + 0.22 + index * 0.16);
    });
    setTimeout(() => context.close(), 900);
  } catch {}
}
