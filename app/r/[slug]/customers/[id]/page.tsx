import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import TenantBootstrap from "@/components/TenantBootstrap";
import CustomerProfile from "@/components/CustomerProfile";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const restaurant = await getDb().restaurant.findFirst({ where: { slug, isActive: true }, select: { id: true } });
  if (!restaurant) notFound();
  return <TenantBootstrap slug={slug}><CustomerProfile customerId={id} /></TenantBootstrap>;
}
