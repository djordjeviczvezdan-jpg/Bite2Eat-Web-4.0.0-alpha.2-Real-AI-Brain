"use client";
const ACTIVE_TENANT_KEY = "takeai-active-tenant";
export function setActiveTenant(slug: string) { if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_TENANT_KEY, slug); }
export function getActiveTenant() { return typeof window === "undefined" ? "" : (window.localStorage.getItem(ACTIVE_TENANT_KEY) || ""); }
export function tenantKey(base: string, slug = getActiveTenant()) { return `${base}:${slug}`; }
