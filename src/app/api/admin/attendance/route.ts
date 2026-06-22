import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth";
import { getTaiwanBusinessDate, getTaiwanDayRange } from "@/lib/date";
import { createAttendanceSchema } from "@/schemas/attendance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "未授權訪問" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const locationStatus = searchParams.get("locationStatus");

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    if (dateParam) {
      // Input date is formatted YYYY-MM-DD from picker
      const targetDate = new Date(dateParam);
      const businessDate = getTaiwanBusinessDate(targetDate);
      where.date = businessDate;
    }

    // Fetch matching records
    const records = await db.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Populate daily ClockEvents and summarize location status
    const recordsWithEvents = await Promise.all(
      records.map(async (record) => {
        const { start, end } = getTaiwanDayRange(record.date);
        const events = await db.clockEvent.findMany({
          where: {
            employeeId: record.employeeId,
            timestamp: {
              gte: start,
              lte: end,
            },
          },
          orderBy: {
            timestamp: "asc",
          },
        });

        // Compute summary locationStatus based on evaluated events
        let summaryLocationStatus = "UNKNOWN";
        if (events.length > 0) {
          if (events.some((e) => e.locationStatus === "BLOCKED")) {
            summaryLocationStatus = "BLOCKED";
          } else if (events.some((e) => e.locationStatus === "LOCATION_DENIED")) {
            summaryLocationStatus = "LOCATION_DENIED";
          } else if (events.some((e) => e.locationStatus === "SUSPICIOUS")) {
            summaryLocationStatus = "SUSPICIOUS";
          } else if (events.every((e) => e.locationStatus === "NORMAL")) {
            summaryLocationStatus = "NORMAL";
          }
        }

        return {
          ...record,
          clockEvents: events,
          summaryLocationStatus,
        };
      })
    );

    // Apply in-memory locationStatus filtering if active
    const filteredRecords = locationStatus
      ? recordsWithEvents.filter((r) => r.summaryLocationStatus === locationStatus)
      : recordsWithEvents;

    return NextResponse.json({ attendanceRecords: filteredRecords });
  } catch (error) {
    console.error("GET Admin Attendance API Error:", error);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "未授權訪問" }, { status: 401 });
    }

    const body = await request.json();
    const result = createAttendanceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "欄位驗證錯誤", details: result.error.format() },
        { status: 400 }
      );
    }

    const { employeeId, date, clockInTime, clockOutTime, status, note } = result.data;

    // Verify employee exists
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json({ error: "員工不存在" }, { status: 400 });
    }

    // Convert date to local Taiwan business date midnight
    const targetDate = new Date(date);
    const businessDate = getTaiwanBusinessDate(targetDate);

    // Check for duplicate record
    const existingRecord = await db.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: businessDate,
        },
      },
    });

    if (existingRecord) {
      return NextResponse.json(
        { error: "該員工在此日期的出勤紀錄已存在，請使用修改功能" },
        { status: 400 }
      );
    }

    // Calculate elapsed minutes and hours manually
    let totalMinutes: number | null = null;
    let totalHours: number | null = null;

    if (clockInTime && clockOutTime) {
      const inTime = new Date(clockInTime);
      const outTime = new Date(clockOutTime);
      const diffMs = outTime.getTime() - inTime.getTime();
      totalMinutes = Math.max(0, Math.round(diffMs / 60000));
      totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    }

    // Create the attendance record
    const record = await db.attendanceRecord.create({
      data: {
        employeeId,
        date: businessDate,
        clockInTime: clockInTime ? new Date(clockInTime) : null,
        clockOutTime: clockOutTime ? new Date(clockOutTime) : null,
        totalMinutes,
        totalHours,
        status,
        note,
        editedByBoss: true,
      },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true,
          },
        },
      },
    });

    // Write audit trail
    const formattedDate = businessDate.toISOString().split("T")[0];
    const details = `手動建立員工 ${employee.name} (工號: ${employee.employeeCode}) 在 ${formattedDate} 的出勤紀錄。狀態: [${status}]` +
      (clockInTime ? `, 上班: ${new Date(clockInTime).toLocaleTimeString("zh-TW")}` : "") +
      (clockOutTime ? `, 下班: ${new Date(clockOutTime).toLocaleTimeString("zh-TW")}` : "") +
      (note ? `, 備註: ${note}` : "");

    await db.auditLog.create({
      data: {
        action: "ATTENDANCE_RECORD_CREATED",
        details,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        adminId: admin.userId,
      },
    });

    return NextResponse.json({ success: true, attendanceRecord: record }, { status: 201 });
  } catch (error) {
    console.error("POST Admin Attendance API Error:", error);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
