import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import AICopilot from "@/components/ai/AICopilot";

export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getDb().restaurant.findFirst({
    where: { slug, isActive: true },
    select: { name: true, tagline: true }
  });

  if (!restaurant) {
    return { title: "Restaurant not found" };
  }

  const description = restaurant.tagline?.trim() || `Order online from ${restaurant.name} with Bite2Eat.`;

  return {
    title: restaurant.name,
    description,
    openGraph: {
      type: "website",
      title: `${restaurant.name} | Bite2Eat`,
      description,
      siteName: "Bite2Eat"
    },
    twitter: {
      card: "summary",
      title: `${restaurant.name} | Bite2Eat`,
      description
    }
  };
}

export default async function RestaurantLayout({ children, params }: Props) {
  const { slug } = await params;
  return <>{children}<AICopilot slug={slug} /></>;
}
