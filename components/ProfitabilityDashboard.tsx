"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getActiveTenant } from "@/lib/tenant-context";

type RangeKey = "today" | "7d" | "30d" | "90d";
type ProfitData = {
  restaurantName: string;
  generatedAt: string;
  summary: { revenue:number; foodCost:number; grossProfit:number; foodCostPercent:number; grossMargin:number; orders:number; costCoverage:number };
  menuPerformance: { menuItemId:string|null; name:string; sold:number; revenue:number; foodCost:number; profit:number; margin:number; recipeComplete:boolean; category:"STAR"|"WORKHORSE"|"PUZZLE"|"DOG" }[];
  recentOrders: { id:string; orderNumber:number; customerName:string; createdAt:string; revenue:number; foodCost:number; profit:number; margin:number; costCoverage:number }[];
};
const euro=(n:number)=>new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR"}).format(n||0);
const ranges:[RangeKey,string][]=[["today","Today"],["7d","7 days"],["30d","30 days"],["90d","90 days"]];
const labels={STAR:"⭐ Star",WORKHORSE:"🐎 Workhorse",PUZZLE:"🧩 Puzzle",DOG:"🐶 Dog"};

export default function ProfitabilityDashboard(){
  const slug=getActiveTenant();
  const [range,setRange]=useState<RangeKey>("30d");
  const [data,setData]=useState<ProfitData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  async function load(){setLoading(true);try{const r=await fetch(`/api/restaurants/${slug}/profitability?range=${range}`,{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load profitability");setData(j);setError("");}catch(e){setError(e instanceof Error?e.message:"Could not load profitability");}finally{setLoading(false)}}
  useEffect(()=>{void load()},[range]);
  const best=useMemo(()=>data?.menuPerformance[0], [data]);
  return <main className="profitPage">
    <header className="profitHeader"><div><span>RESTAURANT FINANCE</span><h1>{data?.restaurantName||"Restaurant"} profitability</h1><p>Live food cost, gross profit and menu engineering from completed sales and saved recipes.</p></div><nav><Link href={`/r/${slug}/analytics`}>Analytics</Link><Link href={`/r/${slug}/inventory`}>Inventory</Link><Link href={`/r/${slug}/admin`}>Admin</Link></nav></header>
    <div className="profitControls"><div>{ranges.map(([key,label])=><button key={key} className={range===key?"active":""} onClick={()=>setRange(key)}>{label}</button>)}</div><button onClick={()=>void load()} disabled={loading}>{loading?"Refreshing…":"↻ Refresh"}</button></div>
    {error&&<section className="profitError"><strong>Profitability unavailable</strong><p>{error}</p><Link href={`/r/${slug}/admin`}>Open module settings</Link></section>}
    {loading&&!data?<div className="profitLoading">Calculating food cost and profit…</div>:data&&<>
      <section className="profitKpis"><article><span>Revenue</span><strong>{euro(data.summary.revenue)}</strong><small>{data.summary.orders} counted orders</small></article><article><span>Food cost</span><strong>{euro(data.summary.foodCost)}</strong><small>{data.summary.foodCostPercent.toFixed(1)}% of revenue</small></article><article><span>Gross profit</span><strong>{euro(data.summary.grossProfit)}</strong><small>{data.summary.grossMargin.toFixed(1)}% gross margin</small></article><article><span>Recipe coverage</span><strong>{data.summary.costCoverage.toFixed(0)}%</strong><small>Sold units with saved recipes</small></article></section>
      {data.summary.costCoverage<100&&<div className="profitNotice">Some sold items do not have a saved recipe, so food cost and profit are understated. Complete their recipes for accurate reporting.</div>}
      <section className="profitGrid"><article className="profitCard"><header><div><span>MENU ENGINEERING</span><h2>Profitability by item</h2></div><small>Popularity and margin are compared with the median for this period.</small></header>{data.menuPerformance.length?<div className="profitTableWrap"><table><thead><tr><th>Menu item</th><th>Class</th><th>Sold</th><th>Revenue</th><th>Food cost</th><th>Profit</th><th>Margin</th></tr></thead><tbody>{data.menuPerformance.map(item=><tr key={item.menuItemId||item.name}><td><strong>{item.name}</strong>{!item.recipeComplete&&<small>No complete recipe</small>}</td><td><span className={`profitBadge ${item.category.toLowerCase()}`}>{labels[item.category]}</span></td><td>{item.sold}</td><td>{euro(item.revenue)}</td><td>{euro(item.foodCost)}</td><td><strong>{euro(item.profit)}</strong></td><td>{item.margin.toFixed(1)}%</td></tr>)}</tbody></table></div>:<p className="profitEmpty">No paid sales in this period.</p>}</article>
      <aside className="profitCard profitInsight"><span>TOP PROFIT CONTRIBUTOR</span><h2>{best?.name||"No sales yet"}</h2>{best&&<><strong>{euro(best.profit)}</strong><p>{best.sold} sold · {best.margin.toFixed(1)}% margin</p><div className={`profitHeroBadge ${best.category.toLowerCase()}`}>{labels[best.category]}</div></>}</aside></section>
      <section className="profitCard"><header><div><span>ORDER PROFIT</span><h2>Recent counted orders</h2></div></header>{data.recentOrders.length?<div className="profitTableWrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Revenue</th><th>Food cost</th><th>Gross profit</th><th>Margin</th><th>Coverage</th></tr></thead><tbody>{data.recentOrders.map(o=><tr key={o.id}><td><strong>#{o.orderNumber}</strong></td><td>{o.customerName}</td><td>{new Date(o.createdAt).toLocaleString("en-IE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</td><td>{euro(o.revenue)}</td><td>{euro(o.foodCost)}</td><td><strong>{euro(o.profit)}</strong></td><td>{o.margin.toFixed(1)}%</td><td>{o.costCoverage.toFixed(0)}%</td></tr>)}</tbody></table></div>:<p className="profitEmpty">No paid orders in this period.</p>}</section>
      <p className="profitUpdated">Calculated {new Date(data.generatedAt).toLocaleTimeString("en-IE")}</p>
    </>}
  </main>
}
