-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'MANAGER', 'KITCHEN', 'DRIVER', 'CASHIER');
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');
CREATE TYPE "FulfilmentType" AS ENUM ('DELIVERY', 'COLLECTION');
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'CASH');

CREATE TABLE "Restaurant" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cuisine" TEXT,
  "city" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "tagline" TEXT,
  "accentColor" TEXT NOT NULL DEFAULT '#ffce43',
  "acceptingOrders" BOOLEAN NOT NULL DEFAULT true,
  "cashEnabled" BOOLEAN NOT NULL DEFAULT true,
  "cardEnabled" BOOLEAN NOT NULL DEFAULT true,
  "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "minimumOrder" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "freeDeliveryThreshold" DECIMAL(10,2),
  "deliveryMinutes" TEXT,
  "collectionMinutes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Staff" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "StaffRole" NOT NULL DEFAULT 'MANAGER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MenuItem" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "externalId" INTEGER,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "emoji" TEXT,
  "badge" TEXT,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "customerId" TEXT,
  "orderNumber" INTEGER NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
  "fulfilment" "FulfilmentType" NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerEmail" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "subtotal" DECIMAL(10,2) NOT NULL,
  "deliveryFee" DECIMAL(10,2) NOT NULL,
  "serviceFee" DECIMAL(10,2) NOT NULL,
  "total" DECIMAL(10,2) NOT NULL,
  "estimatedMinutes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "menuItemId" TEXT,
  "name" TEXT NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "modifiers" JSONB,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");
CREATE INDEX "Restaurant_isActive_idx" ON "Restaurant"("isActive");
CREATE UNIQUE INDEX "Staff_restaurantId_email_key" ON "Staff"("restaurantId", "email");
CREATE INDEX "Staff_restaurantId_role_idx" ON "Staff"("restaurantId", "role");
CREATE UNIQUE INDEX "Customer_restaurantId_email_key" ON "Customer"("restaurantId", "email");
CREATE INDEX "Customer_restaurantId_phone_idx" ON "Customer"("restaurantId", "phone");
CREATE UNIQUE INDEX "MenuItem_restaurantId_externalId_key" ON "MenuItem"("restaurantId", "externalId");
CREATE INDEX "MenuItem_restaurantId_category_available_idx" ON "MenuItem"("restaurantId", "category", "available");
CREATE UNIQUE INDEX "Order_restaurantId_orderNumber_key" ON "Order"("restaurantId", "orderNumber");
CREATE INDEX "Order_restaurantId_status_createdAt_idx" ON "Order"("restaurantId", "status", "createdAt");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

ALTER TABLE "Staff" ADD CONSTRAINT "Staff_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
