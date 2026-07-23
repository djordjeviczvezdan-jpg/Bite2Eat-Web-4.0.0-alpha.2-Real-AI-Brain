import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";

function paidOrder(o:{paymentMethod:string;paymentStatus:string;status:string}){
  return o.status!=="CANCELLED" && o.paymentStatus!=="FAILED" && o.paymentStatus!=="REFUNDED" && (o.paymentMethod==="CASH"||o.paymentStatus==="PAID"||o.paymentStatus==="NOT_REQUIRED");
}
function startOfDay(d:Date){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function convert(q:number,from:string,to:string){ if(from===to)return q; if(from==="G"&&to==="KG")return q/1000;if(from==="KG"&&to==="G")return q*1000;if(from==="ML"&&to==="L")return q/1000;if(from==="L"&&to==="ML")return q*1000;return Number.NaN; }

export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const session=await requireRestaurantRole(slug,["OWNER","MANAGER"]); if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
 const db=getDb(); const now=new Date(); const today=startOfDay(now); const yesterday=new Date(today); yesterday.setDate(yesterday.getDate()-1); const prior=new Date(yesterday); prior.setDate(prior.getDate()-1); const inactiveCutoff=new Date(now); inactiveCutoff.setDate(inactiveCutoff.getDate()-21);
 const restaurant=await db.restaurant.findUnique({where:{slug},select:{id:true,name:true,inventoryEnabled:true,recipeCostingEnabled:true}}); if(!restaurant)return NextResponse.json({error:"Restaurant not found"},{status:404});
 const [orders,items,ingredients,customers]=await Promise.all([
  db.order.findMany({where:{restaurantId:restaurant.id,createdAt:{gte:prior,lt:today}},include:{items:true}}),
  db.menuItem.findMany({where:{restaurantId:restaurant.id},include:{recipeIngredients:{include:{ingredient:true}}}}),
  restaurant.inventoryEnabled?db.ingredient.findMany({where:{restaurantId:restaurant.id},orderBy:{currentStock:"asc"}}):Promise.resolve([]),
  db.customer.findMany({where:{restaurantId:restaurant.id},include:{orders:{where:{status:{not:"CANCELLED"}},orderBy:{createdAt:"desc"},take:1}}})
 ]);
 const costs=new Map<string,number>(); for(const item of items){ costs.set(item.id,item.recipeIngredients.reduce((s,r)=>{const q=convert(Number(r.quantity),r.unit,r.ingredient.unit);return s+(Number.isFinite(q)?q*Number(r.ingredient.costPerUnit):0)},0)); }
 const summarise=(from:Date,to:Date)=>{const selected=orders.filter(o=>o.createdAt>=from&&o.createdAt<to&&paidOrder(o));let food=0;const sales=new Map<string,{name:string;sold:number;revenue:number;cost:number}>();for(const o of selected)for(const line of o.items){const c=line.menuItemId?costs.get(line.menuItemId)??0:0;food+=c*line.quantity;const k=line.menuItemId??line.name;const row=sales.get(k)??{name:line.name,sold:0,revenue:0,cost:0};row.sold+=line.quantity;row.revenue+=Number(line.unitPrice)*line.quantity;row.cost+=c*line.quantity;sales.set(k,row);}const revenue=selected.reduce((s,o)=>s+Number(o.total),0);return{orders:selected.length,revenue,foodCost:food,profit:revenue-food,items:[...sales.values()].map(x=>({...x,profit:x.revenue-x.cost,margin:x.revenue?((x.revenue-x.cost)/x.revenue)*100:0})).sort((a,b)=>b.profit-a.profit)}};
 const y=summarise(yesterday,today), p=summarise(prior,yesterday); const change=p.revenue?((y.revenue-p.revenue)/p.revenue)*100:0;
 const low=ingredients.filter(i=>Number(i.currentStock)<=Number(i.reorderLevel)); const out=ingredients.filter(i=>Number(i.currentStock)<=0); const atRisk=customers.filter(c=>c.orders[0]&&c.orders[0].createdAt<inactiveCutoff&&c.loyaltyPoints>0);
 const insights:Array<{type:string;title:string;message:string;impact:string;confidence:number;action:string;href:string}>=[]; const best=y.items[0]; const worst=[...y.items].filter(i=>i.sold>0).sort((a,b)=>a.margin-b.margin)[0];
 if(best)insights.push({type:"growth",title:`Promote ${best.name}`,message:`It generated €${best.profit.toFixed(2)} gross profit yesterday and is your strongest profit contributor.`,impact:"More visibility could increase sales",confidence:88,action:"Create campaign",href:`/r/${slug}/marketing`});
 if(worst&&worst.margin<35)insights.push({type:"margin",title:`Review ${worst.name} pricing`,message:`Its estimated gross margin is ${worst.margin.toFixed(1)}%. Check recipe quantities, ingredient cost or selling price.`,impact:"Protect food margin",confidence:91,action:"Open profitability",href:`/r/${slug}/profitability`});
 if(low.length)insights.push({type:"stock",title:`${low.length} ingredient${low.length===1?" is":"s are"} low`,message:`${low.slice(0,3).map(i=>i.name).join(", ")}${low.length>3?" and more":""} need attention.${out.length?` ${out.length} are out of stock.`:""}`,impact:"Avoid unavailable menu items",confidence:99,action:"Open inventory",href:`/r/${slug}/inventory`});
 if(atRisk.length)insights.push({type:"customer",title:`Win back ${atRisk.length} loyalty customer${atRisk.length===1?"":"s"}`,message:"These customers have points but have not ordered in at least 21 days.",impact:"Recover repeat revenue",confidence:82,action:"Create campaign",href:`/r/${slug}/marketing`});
 if(!insights.length)insights.push({type:"positive",title:"Operations look healthy",message:"No urgent margin, stock or retention issues were detected from the available data.",impact:"Keep monitoring daily",confidence:78,action:"View analytics",href:`/r/${slug}/analytics`});
 let health=100; health-=Math.min(25,low.length*4);health-=Math.min(15,out.length*7);health-=Math.min(15,atRisk.length);if(y.revenue<p.revenue)health-=Math.min(20,Math.round(Math.abs(change)/2));if(y.revenue&&y.foodCost/y.revenue>.4)health-=15;health=Math.max(0,Math.round(health));
 return NextResponse.json({restaurantName:restaurant.name,generatedAt:now.toISOString(),period:{label:"Yesterday",revenue:y.revenue,profit:y.profit,orders:y.orders,revenueChange:change,foodCostPercent:y.revenue?(y.foodCost/y.revenue)*100:0},health,healthLabel:health>=85?"Excellent":health>=70?"Good":health>=50?"Needs attention":"At risk",signals:{lowStock:low.length,outOfStock:out.length,atRiskCustomers:atRisk.length},insights});
}
