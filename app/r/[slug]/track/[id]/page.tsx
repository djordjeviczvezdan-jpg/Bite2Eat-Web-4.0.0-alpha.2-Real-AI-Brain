import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import OrderTrackingPage from "@/components/OrderTrackingPage";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const restaurant = await getDb().restaurant.findFirst({
    where: { slug, isActive: true },
    select: { name: true }
  });
  if (!restaurant) notFound();
  return <OrderTrackingPage slug={slug} orderId={id} restaurantName={restaurant.name} />;
}
