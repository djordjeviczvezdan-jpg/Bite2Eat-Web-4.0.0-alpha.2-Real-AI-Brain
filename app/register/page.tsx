"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", restaurantName: "" });
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Registration failed.");
      router.push(`/r/${data.restaurantSlug}/onboarding`); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Registration failed."); }
    finally { setLoading(false); }
  }
  const field = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  return <main className="saasLoginPage"><form onSubmit={submit}>
    <div className="saasLogo"><span>TA</span><strong>Bite2Eat</strong></div><span className="adminEyebrow">START YOUR FREE PILOT</span>
    <h1>Create your restaurant.</h1><p>Your secure owner workspace and public ordering URL will be created instantly.</p>
    <label>Your name<input required minLength={2} value={form.name} onChange={e => field("name", e.target.value)} /></label>
    <label>Restaurant name<input required minLength={2} value={form.restaurantName} onChange={e => field("restaurantName", e.target.value)} /></label>
    <label>Email<input required type="email" autoComplete="email" value={form.email} onChange={e => field("email", e.target.value)} /></label>
    <label>Password<input required type="password" minLength={10} autoComplete="new-password" value={form.password} onChange={e => field("password", e.target.value)} /></label>
    <small>Use at least 10 characters.</small>{error && <div className="adminError">{error}</div>}
    <button disabled={loading}>{loading ? "Creating workspace…" : "Create Bite2Eat account"}</button>
    <p className="authSwitch">Already registered? <Link href="/login">Sign in</Link></p>
  </form></main>;
}
