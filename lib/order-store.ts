"use client";

import { RestaurantOrder, OrderStatus } from "@/lib/order-types";
import { tenantKey, getActiveTenant } from "@/lib/tenant-context";
import { publishLiveEvent } from "@/lib/live-events";

const CART_STORAGE_KEY = "takeai-cart-v1";
const ORDER_EVENT = "takeai-orders-changed";
export type StoredCartItem = { id:number; name:string; description:string; category:string; price:number; emoji:string; badge?:string; quantity:number; modifiers?:string[] };

export function loadCart(): StoredCartItem[] {
  try { const raw = localStorage.getItem(tenantKey(CART_STORAGE_KEY)); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export function saveCart(cart: StoredCartItem[]) { try { localStorage.setItem(tenantKey(CART_STORAGE_KEY), JSON.stringify(cart)); } catch {} }

export async function getOrder(id: string) { return (await getOrders()).find(order => order.id === id) ?? null; }
export async function getOrders(options?: { kitchen?: boolean }): Promise<RestaurantOrder[]> {
  const query = options?.kitchen ? "?view=kitchen" : "";
  const response = await fetch(`/api/restaurants/${getActiveTenant()}/orders${query}`, { cache: "no-store" });
  if (!response.ok) return [];
  return response.json();
}
export async function saveOrder(order: RestaurantOrder) {
  const response = await fetch(`/api/restaurants/${getActiveTenant()}/orders`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(order) });
  if (!response.ok) throw new Error((await response.json().catch(()=>null))?.error ?? "Could not place order");
  const saved: RestaurantOrder = await response.json();
  window.dispatchEvent(new Event(ORDER_EVENT));
  publishLiveEvent({ type:"order-created", orderId:saved.id, orderNumber:saved.orderNumber, total:saved.total, customerName:saved.customer.name, at:new Date().toISOString() });
  return saved;
}
export async function updateOrderStatus(id: string, status: OrderStatus) {
  const response = await fetch(`/api/restaurants/${getActiveTenant()}/orders/${id}`, { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({status}) });
  if (!response.ok) throw new Error("Could not update order");
  const changed: RestaurantOrder = await response.json();
  window.dispatchEvent(new Event(ORDER_EVENT));
  publishLiveEvent({ type:"order-status", orderId:changed.id, orderNumber:changed.orderNumber, status, at:new Date().toISOString() });
  return changed;
}
export async function seedDemoOrders() { /* PostgreSQL seed owns demo data in Milestone 8.2. */ }
export function subscribeToOrders(callback: () => void) {
  window.addEventListener(ORDER_EVENT, callback);
  const timer = window.setInterval(callback, 3000);
  return () => { window.removeEventListener(ORDER_EVENT, callback); window.clearInterval(timer); };
}
