-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('NORMAL', 'LATE', 'EARLY_LEAVE', 'ABSENT', 'LEAVE');

-- CreateEnum
CREATE TYPE "ClockEventType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('NORMAL', 'SUSPICIOUS', 'BLOCKED', 'LOCATION_DENIED');

-- CreateTable
CREATE TABLE "workplaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '三峽八方雲集國際店',
    "address" TEXT NOT NULL DEFAULT '新北市三峽區國際一街',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "allowedRadiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "warningRadiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "workplaceToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workplaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clockInTime" TIMESTAMP(3),
    "clockOutTime" TIMESTAMP(3),
    "totalMinutes" INTEGER,
    "totalHours" DOUBLE PRECISION,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'NORMAL',
    "note" TEXT,
    "editedByBoss" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clock_events" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workplaceId" TEXT NOT NULL,
    "eventType" "ClockEventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "distanceMeters" DOUBLE PRECISION,
    "locationStatus" "LocationStatus" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clock_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workplaces_workplaceToken_key" ON "workplaces"("workplaceToken");

-- CreateIndex
CREATE INDEX "attendance_records_date_idx" ON "attendance_records"("date");

-- CreateIndex
CREATE INDEX "attendance_records_employeeId_idx" ON "attendance_records"("employeeId");

-- CreateIndex
CREATE INDEX "attendance_records_employeeId_date_idx" ON "attendance_records"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_employeeId_date_key" ON "attendance_records"("employeeId", "date");

-- CreateIndex
CREATE INDEX "clock_events_employeeId_idx" ON "clock_events"("employeeId");

-- CreateIndex
CREATE INDEX "clock_events_workplaceId_idx" ON "clock_events"("workplaceId");

-- CreateIndex
CREATE INDEX "clock_events_timestamp_idx" ON "clock_events"("timestamp");

-- CreateIndex
CREATE INDEX "clock_events_employeeId_timestamp_idx" ON "clock_events"("employeeId", "timestamp");

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clock_events" ADD CONSTRAINT "clock_events_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clock_events" ADD CONSTRAINT "clock_events_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "workplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
