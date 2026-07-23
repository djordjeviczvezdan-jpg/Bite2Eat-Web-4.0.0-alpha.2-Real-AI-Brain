CREATE TYPE "SubscriptionPlan" AS ENUM ('PILOT', 'STARTER', 'GROWTH', 'PRO');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

ALTER TABLE "Restaurant"
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "postcode" TEXT,
ADD COLUMN "deliveryRadiusKm" DECIMAL(6,2),
ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "plan" "SubscriptionPlan" NOT NULL DEFAULT 'PILOT',
ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
ADD COLUMN "trialEndsAt" TIMESTAMP(3);

CREATE TABLE "OpeningHour" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  "opensAt" TEXT,
  "closesAt" TEXT,
  CONSTRAINT "OpeningHour_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryZone" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "postcode" TEXT,
  "radiusKm" DECIMAL(6,2),
  "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "minimumOrder" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpeningHour_restaurantId_dayOfWeek_key" ON "OpeningHour"("restaurantId", "dayOfWeek");
CREATE INDEX "OpeningHour_restaurantId_idx" ON "OpeningHour"("restaurantId");
CREATE INDEX "DeliveryZone_restaurantId_isActive_idx" ON "DeliveryZone"("restaurantId", "isActive");
ALTER TABLE "OpeningHour" ADD CONSTRAINT "OpeningHour_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryZone" ADD CONSTRAINT "DeliveryZone_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
