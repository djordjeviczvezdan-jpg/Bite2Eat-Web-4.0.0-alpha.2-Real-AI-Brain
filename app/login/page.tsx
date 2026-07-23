import { Suspense } from "react";
import SaasLogin from "@/components/SaasLogin";

export default function Page() {
  return <Suspense fallback={<main className="tenantLoading"><div>TA</div><p>Loading secure sign in…</p></main>}><SaasLogin /></Suspense>;
}
