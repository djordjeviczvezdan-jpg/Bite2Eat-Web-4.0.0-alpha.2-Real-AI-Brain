// @ts-nocheck
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";
import OnboardingWizard from "@/components/OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) redirect(`/login?next=/r/${slug}/onboarding`);
  const restaurant = await getDb().restaurant.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true, cuisine: true, phone: true, address: true, postcode: true,
      tagline: true, website: true, accentColor: true, deliveryFee: true,
      minimumOrder: true, freeDeliveryThreshold: true, deliveryRadiusKm: true,
      deliveryMinutes: true, collectionMinutes: true, cashEnabled: true,
      cardEnabled: true, onboardingCompleted: true, onboardingStep: true
    }
  });
  if (!restaurant) notFound();
  return <OnboardingWizard slug={slug} initial={{
    ...restaurant,
    deliveryFee: Number(restaurant.deliveryFee),
    minimumOrder: Number(restaurant.minimumOrder),
    freeDeliveryThreshold: restaurant.freeDeliveryThreshold == null ? null : Number(restaurant.freeDeliveryThreshold),
    deliveryRadiusKm: restaurant.deliveryRadiusKm == null ? null : Number(restaurant.deliveryRadiusKm)
  }} />;
}
