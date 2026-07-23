import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import TenantBootstrap from "@/components/TenantBootstrap";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getDb().restaurant.findFirst({ where: { slug, isActive: true }, select: { id: true } });
  if (!restaurant) notFound();
  return <TenantBootstrap slug={slug}><AdminDashboard /></TenantBootstrap>;
}
