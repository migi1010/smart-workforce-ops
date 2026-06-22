import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth";
import { updateAttendanceSchema } from "@/schemas/attendance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "未授權訪問" }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const result = updateAttendanceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "欄位驗證錯誤", details: result.error.format() },
        { status: 400 }
      );
    }

    const { clockInTime, clockOutTime, status, note } = result.data;

    // Fetch the existing record to compare changes and get employee info
    const existingRecord = await db.attendanceRecord.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true,
          },
        },
      },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "找不到該筆出勤紀錄" }, { status: 404 });
    }

    // Calculate manual hours
    let totalMinutes: number | null = null;
    let totalHours: number | null = null;

    if (clockInTime && clockOutTime) {
      const inTime = new Date(clockInTime);
      const outTime = new Date(clockOutTime);
      const diffMs = outTime.getTime() - inTime.getTime();
      totalMinutes = Math.max(0, Math.round(diffMs / 60000));
      totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    }

    // Perform database update
    const updatedRecord = await db.attendanceRecord.update({
      where: { id },
      data: {
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

    // Formulate descriptive audit changes log details
    const changes: string[] = [];
    
    // Compare clockInTime
    const oldInStr = existingRecord.clockInTime ? new Date(existingRecord.clockInTime).toLocaleTimeString("zh-TW") : "無";
    const newInStr = clockInTime ? new Date(clockInTime).toLocaleTimeString("zh-TW") : "無";
    if (oldInStr !== newInStr) {
      changes.push(`上班時間: [${oldInStr} -> ${newInStr}]`);
    }

    // Compare clockOutTime
    const oldOutStr = existingRecord.clockOutTime ? new Date(existingRecord.clockOutTime).toLocaleTimeString("zh-TW") : "無";
    const newOutStr = clockOutTime ? new Date(clockOutTime).toLocaleTimeString("zh-TW") : "無";
    if (oldOutStr !== newOutStr) {
      changes.push(`下班時間: [${oldOutStr} -> ${newOutStr}]`);
    }

    // Compare status
    if (existingRecord.status !== status) {
      changes.push(`出勤狀態: [${existingRecord.status} -> ${status}]`);
    }

    // Compare note
    if (existingRecord.note !== note) {
      changes.push(`備註: [${existingRecord.note || "無"} -> ${note || "無"}]`);
    }

    const formattedDate = existingRecord.date.toISOString().split("T")[0];
    const details = `修改員工 ${existingRecord.employee.name} (工號: ${existingRecord.employee.employeeCode}) 在 ${formattedDate} 的出勤紀錄。變更項: ` +
      (changes.length > 0 ? changes.join(", ") : "無變更");

    // Write audit log
    await db.auditLog.create({
      data: {
        action: "ATTENDANCE_RECORD_UPDATED",
        details,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        adminId: admin.userId,
      },
    });

    return NextResponse.json({ success: true, attendanceRecord: updatedRecord });
  } catch (error) {
    console.error("PATCH Admin Attendance API Error:", error);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
