import Link from "next/link";
import { notFound } from "next/navigation";
import InventoryDashboard from "@/components/InventoryDashboard";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function InventoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getDb().restaurant.findFirst({
    where: { slug, isActive: true },
    select: { name: true, inventoryEnabled: true }
  });
  if (!restaurant) notFound();

  if (!restaurant.inventoryEnabled) {
    return <main className="moduleDisabledPage">
      <section>
        <span>OPTIONAL MODULE</span>
        <div className="moduleDisabledIcon">📦</div>
        <h1>Inventory is currently switched off</h1>
        <p>{restaurant.name} can use all core Bite2Eat features without inventory. Enable it whenever stock tracking becomes useful; existing inventory data will be preserved.</p>
        <Link href={`/r/${slug}/admin`}>Open restaurant settings</Link>
      </section>
    </main>;
  }

  return <InventoryDashboard />;
}
