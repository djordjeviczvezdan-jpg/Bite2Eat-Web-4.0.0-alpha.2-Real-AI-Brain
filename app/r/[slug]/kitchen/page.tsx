import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";
import TenantBootstrap from "@/components/TenantBootstrap";
import KitchenDashboard from "@/components/KitchenDashboard";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getDb().restaurant.findFirst({ where: { slug, isActive: true }, select: { id: true } });
  if (!restaurant) notFound();

  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER", "KITCHEN"]);
  if (!session) redirect(`/login?next=/r/${slug}/kitchen`);

  return <TenantBootstrap slug={slug}><KitchenDashboard /></TenantBootstrap>;
}
