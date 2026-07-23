"use client";
import { useEffect, useState } from "react";
import { setActiveTenant } from "@/lib/tenant-context";
export default function TenantBootstrap({slug,children}:{slug:string;children:React.ReactNode}) {
 const [ready,setReady]=useState(false);
 useEffect(()=>{setActiveTenant(slug);setReady(true)},[slug]);
 if(!ready) return <main className="tenantLoading"><div>TA</div><p>Loading restaurant…</p></main>;
 return <>{children}</>;
}
