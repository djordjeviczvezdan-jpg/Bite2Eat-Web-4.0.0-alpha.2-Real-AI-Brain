"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getOrders, subscribeToOrders } from "@/lib/order-store";
import type { RestaurantOrder } from "@/lib/order-types";
const KEY="takeai-customer-profile-v1";
function euro(n:number){return new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR"}).format(n)}
export default function CustomerAccount(){
 const [orders,setOrders]=useState<RestaurantOrder[]>([]),[name,setName]=useState("Zvezdan"),[email,setEmail]=useState("customer@example.com"),[saved,setSaved]=useState(false);
 useEffect(()=>{try{const p=JSON.parse(localStorage.getItem(KEY)||"null");if(p){setName(p.name);setEmail(p.email)}}catch{};const refresh=()=>{getOrders().then(setOrders)};refresh();return subscribeToOrders(refresh)},[]);
 const points=Math.floor(orders.reduce((s,o)=>s+o.total,0)*10), progress=points%500;
 const favourites=useMemo(()=>{const m=new Map<string,{emoji:string,count:number}>();orders.forEach(o=>o.items.forEach(i=>{const x=m.get(i.name)||{emoji:i.emoji,count:0};m.set(i.name,{...x,count:x.count+i.quantity})}));return [...m].sort((a,b)=>b[1].count-a[1].count).slice(0,4)},[orders]);
 function save(){localStorage.setItem(KEY,JSON.stringify({name,email}));setSaved(true);setTimeout(()=>setSaved(false),1800)}
 return <main className="accountPage">
  <header className="accountHeader"><Link href="/" className="accountBrand"><span>B2E</span><div><strong>Bite2Eat</strong><small>Customer account</small></div></Link><nav><Link href="/">Order food</Link><button>Sign out</button></nav></header>
  <section className="accountHero"><div><span>MY ACCOUNT</span><h1>Welcome back, {name}.</h1><p>Your favourites, rewards and previous orders—all in one place.</p></div><div className="loyaltyCard"><span>BITE2EAT REWARDS</span><strong>{points.toLocaleString()} points</strong><p>{500-progress} points until your next €5 reward</p><div><i style={{width:`${progress/5}%`}}/></div></div></section>
  <section className="accountGrid">
   <article className="accountPanel orderHistory"><div className="accountPanelHead"><div><span>RECENT ACTIVITY</span><h2>Your orders</h2></div><Link href="/">Order again</Link></div>{orders.length===0?<div className="accountEmpty">Your placed orders will appear here.</div>:orders.slice(0,5).map(o=><div className="historyOrder" key={o.id}><div><b>#{o.orderNumber}</b><span>{new Date(o.createdAt).toLocaleDateString("en-IE",{day:"numeric",month:"short",year:"numeric"})}</span></div><p>{o.items.map(i=>`${i.quantity}× ${i.name}`).join(" · ")}</p><strong>{euro(o.total)}</strong><em>{o.status.replaceAll("-"," ")}</em><Link href="/">Reorder</Link></div>)}</article>
   <aside className="accountSide">
    <article className="accountPanel"><div className="accountPanelHead"><div><span>YOUR TASTE</span><h2>Favourites</h2></div></div><div className="favouriteGrid">{(favourites.length?favourites:[["Signature Cheeseburger",{emoji:"🍔",count:3}],["Coke Zero",{emoji:"🥤",count:2}]] as any).map(([n,v]:any)=><Link href="/" key={n}><i>{v.emoji}</i><strong>{n}</strong><small>Ordered {v.count} times</small></Link>)}</div></article>
    <article className="accountPanel profilePanel"><div className="accountPanelHead"><div><span>PROFILE</span><h2>Your details</h2></div></div><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Email<input value={email} onChange={e=>setEmail(e.target.value)}/></label><button onClick={save}>{saved?"✓ Saved":"Save details"}</button></article>
   </aside>
  </section>
 </main>
}
