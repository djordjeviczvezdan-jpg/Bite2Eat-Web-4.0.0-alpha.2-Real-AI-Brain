import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function foodPrompt(input: {
  restaurantName: string;
  cuisine?: string | null;
  name: string;
  description: string;
  category: string;
}) {
  const details = input.description || `A classic ${input.category.toLowerCase()} takeaway dish.`;
  return [
    `Create a photorealistic professional menu photograph of “${input.name}”.`,
    `Dish details: ${details}`,
    `Cuisine context: ${input.cuisine || "Irish takeaway food"}.`,
    "Show exactly one generous serving, freshly prepared and appetising, with realistic ingredients that match the description.",
    "Use warm natural restaurant lighting, a clean dark slate or neutral tabletop, subtle steam where appropriate, shallow depth of field, crisp texture and premium commercial food photography.",
    "Square composition, food centred, no people, no hands, no logos, no brand packaging, no menu text, no labels, no watermark, no extra unrelated dishes."
  ].join(" ");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is missing from .env. Add it, restart Bite2Eat, then try again." },
      { status: 503 }
    );
  }

  const externalId = Number(id);
  if (!Number.isFinite(externalId)) return NextResponse.json({ error: "Invalid menu item id" }, { status: 400 });

  const db = getDb();
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true, name: true, cuisine: true }
  });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const item = await db.menuItem.findUnique({
    where: { restaurantId_externalId: { restaurantId: restaurant.id, externalId } },
    select: { id: true, name: true, description: true, category: true }
  });
  if (!item) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });

  const name = clean(body.name, item.name);
  const description = clean(body.description, item.description);
  const category = clean(body.category, item.category);
  const prompt = foodPrompt({ restaurantName: restaurant.name, cuisine: restaurant.cuisine, name, description, category });

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.IMAGE_GENERATION_MODEL || "gpt-image-1",
        prompt,
        size: "1024x1024",
        quality: "medium",
        output_format: "png"
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload?.error?.message || "Image generation failed";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const b64 = payload?.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "Image service returned no image data" }, { status: 502 });

    const directory = path.join(process.cwd(), "public", "generated-food");
    await mkdir(directory, { recursive: true });
    const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const fileName = `${safeSlug}-${externalId}-${Date.now()}.png`;
    await writeFile(path.join(directory, fileName), Buffer.from(b64, "base64"));
    const imageUrl = `/generated-food/${fileName}`;

    await db.menuItem.update({
      where: { id: item.id },
      data: { imageUrl, name, description, category }
    });

    return NextResponse.json({ ok: true, imageUrl, prompt });
  } catch (error) {
    console.error("AI food image generation failed", error);
    return NextResponse.json({ error: "Could not contact the image-generation service" }, { status: 500 });
  }
}
