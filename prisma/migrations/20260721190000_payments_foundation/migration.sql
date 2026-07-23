CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'NOT_REQUIRED');

ALTER TABLE "Restaurant"
ADD COLUMN "stripeAccountId" TEXT,
ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "platformFeePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "minimumCardOrder" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "Order"
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN "stripeSessionId" TEXT,
ADD COLUMN "stripePaymentIntentId" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "refundedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");
