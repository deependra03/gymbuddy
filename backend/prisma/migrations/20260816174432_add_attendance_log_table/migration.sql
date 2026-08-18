/*
  Warnings:

  - A unique constraint covering the columns `[externalLogId]` on the table `attendance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[esslEnrollNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "externalLogId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "esslEnrollNumber" INTEGER;

-- CreateTable
CREATE TABLE "essl_sync_state" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "lastSyncAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "essl_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" TEXT NOT NULL,
    "sourceLogId" TEXT NOT NULL,
    "sourceTable" TEXT NOT NULL,
    "userId" TEXT,
    "esslEnrollNumber" INTEGER,
    "logDate" TIMESTAMP(3) NOT NULL,
    "direction" TEXT,
    "attDirection" TEXT,
    "deviceId" DOUBLE PRECISION,
    "workCode" TEXT,
    "isApproved" BOOLEAN,
    "downloadDate" TIMESTAMP(3),
    "createdDate" TIMESTAMP(3),
    "lastModifiedDate" TIMESTAMP(3),
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "locationAddress" TEXT,
    "bodyTemperature" DOUBLE PRECISION,
    "isMaskOn" BOOLEAN,
    "rawJson" JSONB NOT NULL,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_sourceLogId_key" ON "attendance_logs"("sourceLogId");

-- CreateIndex
CREATE INDEX "attendance_logs_sourceLogId_idx" ON "attendance_logs"("sourceLogId");

-- CreateIndex
CREATE INDEX "attendance_logs_isProcessed_idx" ON "attendance_logs"("isProcessed");

-- CreateIndex
CREATE INDEX "attendance_logs_logDate_idx" ON "attendance_logs"("logDate");

-- CreateIndex
CREATE INDEX "attendance_logs_esslEnrollNumber_idx" ON "attendance_logs"("esslEnrollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_externalLogId_key" ON "attendance"("externalLogId");

-- CreateIndex
CREATE UNIQUE INDEX "users_esslEnrollNumber_key" ON "users"("esslEnrollNumber");
