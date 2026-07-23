"use client";

import { menuItems as defaultMenuItems, type MenuItem } from "@/data/menu";
import { getActiveTenant } from "@/lib/tenant-context";

const MENU_EVENT = "takeai-menu-changed";
const SETTINGS_EVENT = "takeai-settings-changed";

export type RestaurantSettings = {
  restaurantName: string; tagline: string; phone: string; address: string;
  deliveryFee: number; freeDeliveryThreshold: number; minimumOrder: number;
  deliveryMinutes: string; collectionMinutes: string; acceptingOrders: boolean;
  cashEnabled: boolean; cardEnabled: boolean; minimumCardOrder: number; stripeChargesEnabled: boolean;
  requireCardPaymentBeforeKitchen: boolean;
  loyaltyEnabled: boolean; loyaltyPointsPerEuro: number; loyaltyRewardPoints: number; loyaltyRewardValue: number; loyaltySignupBonus: number;
  inventoryEnabled: boolean; recipeCostingEnabled: boolean;
};

export const defaultSettings: RestaurantSettings = {
  restaurantName: "Jimmy's Takeaway", tagline: "Your favourites, ordered your way.", phone: "01 555 0148",
  address: "Dublin 15", deliveryFee: 3.5, freeDeliveryThreshold: 25, minimumOrder: 15,
  deliveryMinutes: "35–45", collectionMinutes: "15–20", acceptingOrders: true, cashEnabled: true, cardEnabled: true, minimumCardOrder: 0, stripeChargesEnabled: false, requireCardPaymentBeforeKitchen: true, loyaltyEnabled: true, loyaltyPointsPerEuro: 1, loyaltyRewardPoints: 100, loyaltyRewardValue: 5, loyaltySignupBonus: 0, inventoryEnabled: false, recipeCostingEnabled: false
};

export async function loadMenu(): Promise<MenuItem[]> {
  const slug = getActiveTenant();
  try {
    const response = await fetch(`/api/restaurants/${slug}/menu`, { cache: "no-store" });
    if (!response.ok) throw new Error("Menu request failed");
    return await response.json();
  } catch {
    console.error("Could not load restaurant menu from PostgreSQL.");
    return [];
  }
}

export async function saveMenu(menu: MenuItem[]) {
  const slug = getActiveTenant();
  const response = await fetch(`/api/restaurants/${slug}/menu`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(menu) });
  if (!response.ok) throw new Error("Could not save menu");
  window.dispatchEvent(new Event(MENU_EVENT));
}

export async function resetMenu() {
  await saveMenu([]);
}

export async function loadSettings(): Promise<RestaurantSettings> {
  const slug = getActiveTenant();
  try {
    const response = await fetch(`/api/restaurants/${slug}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Settings request failed");
    return { ...defaultSettings, ...(await response.json()) };
  } catch {
    console.error("Could not load restaurant settings from PostgreSQL.");
    return defaultSettings;
  }
}

export async function saveSettings(settings: RestaurantSettings) {
  const slug = getActiveTenant();
  const response = await fetch(`/api/restaurants/${slug}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
  if (!response.ok) throw new Error("Could not save settings");
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function subscribeToMenu(callback: () => void) {
  window.addEventListener(MENU_EVENT, callback);
  return () => window.removeEventListener(MENU_EVENT, callback);
}
export function subscribeToSettings(callback: () => void) {
  window.addEventListener(SETTINGS_EVENT, callback);
  return () => window.removeEventListener(SETTINGS_EVENT, callback);
}

export type OpeningHour = {
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
};

export async function loadOpeningHours(): Promise<OpeningHour[]> {
  const slug = getActiveTenant();
  const response = await fetch(`/api/restaurants/${slug}/opening-hours`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load opening hours");
  return response.json();
}

export async function saveOpeningHours(hours: OpeningHour[]) {
  const slug = getActiveTenant();
  const response = await fetch(`/api/restaurants/${slug}/opening-hours`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(hours)
  });
  if (!response.ok) throw new Error("Could not save opening hours");
}
