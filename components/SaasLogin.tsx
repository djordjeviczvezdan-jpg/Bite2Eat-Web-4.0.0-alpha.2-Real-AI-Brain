"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SaasLogin() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("admin@jimmys.ie");
  const [password, setPassword] = useState("demo12345");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      const requested = search.get("next");
      router.push(requested?.startsWith(`/r/${data.user.restaurantSlug}/`) ? requested : `/r/${data.user.restaurantSlug}/admin`);
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in."); }
    finally { setLoading(false); }
  }

  return <main className="saasLoginPage"><form onSubmit={submit}>
    <div className="saasLogo"><span>TA</span><strong>Bite2Eat</strong></div>
    <span className="adminEyebrow">SECURE RESTAURANT PORTAL</span>
    <h1>Welcome back.</h1><p>Sign in to manage your restaurant, menu and live orders.</p>
    <label>Email<input autoComplete="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label>Password<input autoComplete="current-password" type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label>
    {error && <div className="adminError" role="alert">{error}</div>}
    <button disabled={loading}>{loading ? "Signing in…" : "Sign in securely"}</button>
    <small>Demo owner: admin@jimmys.ie / demo12345</small>
    <p className="authSwitch">New to Bite2Eat? <Link href="/register">Create a restaurant account</Link></p>
  </form></main>;
}
