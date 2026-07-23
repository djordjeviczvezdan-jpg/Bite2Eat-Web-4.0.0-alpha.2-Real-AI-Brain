CREATE TABLE "AiAuditLog" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "functionName" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiAuditLog_restaurantId_createdAt_idx" ON "AiAuditLog"("restaurantId", "createdAt");
CREATE INDEX "AiAuditLog_staffId_createdAt_idx" ON "AiAuditLog"("staffId", "createdAt");
ALTER TABLE "AiAuditLog" ADD CONSTRAINT "AiAuditLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
