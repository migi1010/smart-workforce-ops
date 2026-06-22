import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTaiwanNow, getTaiwanBusinessDate } from "@/lib/date";
import { haversineDistanceMeters, evaluateLocationStatus } from "@/lib/location";
import { comparePassword } from "@/lib/auth";
import { clockSubmitSchema } from "@/schemas/clock";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = clockSubmitSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "欄位驗證錯誤", details: result.error.format() },
        { status: 400 }
      );
    }

    const { workplaceToken, employeeId, pin, eventType, latitude, longitude } = result.data;

    // 1. Verify workplace exists and is active
    const workplace = await db.workplace.findUnique({
      where: { workplaceToken },
    });

    if (!workplace || !workplace.isActive) {
      return NextResponse.json({ error: "工作場所不存在或已停用" }, { status: 400 });
    }

    // 2. Verify employee exists and is active
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee || !employee.isActive) {
      return NextResponse.json({ error: "員工不存在或已被停用" }, { status: 400 });
    }

    // 3. Verify employee PIN
    const isPinValid = await comparePassword(pin, employee.pinHash);
    if (!isPinValid) {
      return NextResponse.json({ error: "安全密碼錯誤" }, { status: 400 });
    }

    // 4. Evaluate GPS location status
    let distance: number | null = null;
    if (latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined) {
      distance = haversineDistanceMeters(
        workplace.latitude,
        workplace.longitude,
        latitude,
        longitude
      );
    }

    const locationStatus = evaluateLocationStatus(
      distance,
      workplace.allowedRadiusMeters,
      workplace.warningRadiusMeters
    );

    // 5. Reject if location is BLOCKED or LOCATION_DENIED
    if (locationStatus === "BLOCKED") {
      return NextResponse.json({ error: "打卡失敗：您已超出允許的範圍" }, { status: 400 });
    }
    if (locationStatus === "LOCATION_DENIED") {
      return NextResponse.json({ error: "打卡失敗：無法取得 GPS 定位資訊" }, { status: 400 });
    }

    // 6. Get business date and current time in Taiwan
    const now = getTaiwanNow();
    const businessDate = getTaiwanBusinessDate(now);

    // Get client request metadata
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    let feedback: any = null;

    // 7. Perform Clock-In or Clock-Out in a transaction
    await db.$transaction(async (tx) => {
      // Find today's attendance record
      const existingRecord = await tx.attendanceRecord.findUnique({
        where: {
          employeeId_date: {
            employeeId,
            date: businessDate,
          },
        },
      });

      if (eventType === "CLOCK_IN") {
        // Reject duplicate clock-in
        if (existingRecord && existingRecord.clockInTime) {
          throw new Error("今日已完成上班打卡，請勿重複打卡");
        }

        // Upsert daily attendance record
        await tx.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId,
              date: businessDate,
            },
          },
          create: {
            employeeId,
            date: businessDate,
            clockInTime: now,
            status: "NORMAL",
          },
          update: {
            clockInTime: now,
            status: "NORMAL",
          },
        });

        // Create ClockEvent
        await tx.clockEvent.create({
          data: {
            employeeId,
            workplaceId: workplace.id,
            eventType: "CLOCK_IN",
            timestamp: now,
            latitude,
            longitude,
            distanceMeters: distance,
            locationStatus,
            ipAddress,
            userAgent,
          },
        });

        feedback = {
          employeeName: employee.name,
          eventType: "CLOCK_IN",
          timestamp: now.toISOString(),
          locationStatus,
        };
      } else if (eventType === "CLOCK_OUT") {
        // Reject clock-out without clock-in
        if (!existingRecord || !existingRecord.clockInTime) {
          throw new Error("今日尚未進行上班打卡，無法進行下班打卡");
        }

        // Reject duplicate clock-out
        if (existingRecord.clockOutTime) {
          throw new Error("今日已完成下班打卡，請勿重複打卡");
        }

        // Calculate hours and minutes worked
        const clockInTime = existingRecord.clockInTime;
        const diffMs = now.getTime() - clockInTime.getTime();
        const totalMinutes = Math.max(0, Math.round(diffMs / 60000));
        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

        // Update attendance record
        await tx.attendanceRecord.update({
          where: { id: existingRecord.id },
          data: {
            clockOutTime: now,
            totalMinutes,
            totalHours,
          },
        });

        // Create ClockEvent
        await tx.clockEvent.create({
          data: {
            employeeId,
            workplaceId: workplace.id,
            eventType: "CLOCK_OUT",
            timestamp: now,
            latitude,
            longitude,
            distanceMeters: distance,
            locationStatus,
            ipAddress,
            userAgent,
          },
        });

        feedback = {
          employeeName: employee.name,
          eventType: "CLOCK_OUT",
          timestamp: now.toISOString(),
          locationStatus,
          totalHours,
        };
      }
    });

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error: any) {
    console.error("POST Clock Submit API Error:", error);
    // If it's a validation/business error thrown inside transaction
    const errorMessage = error.message || "伺服器內部錯誤";
    // Check if error is one of our business errors
    if (
      errorMessage.includes("已完成上班打卡") ||
      errorMessage.includes("尚未進行上班打卡") ||
      errorMessage.includes("已完成下班打卡")
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
