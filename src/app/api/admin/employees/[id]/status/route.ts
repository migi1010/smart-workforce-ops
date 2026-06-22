import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth";
import { updateStatusSchema } from "@/schemas/employee";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "未授權訪問" }, { status: 401 });
    }

    // Await params according to Next.js 15+ specifications
    const { id } = await params;

    const body = await request.json();
    const result = updateStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "欄位驗證錯誤", details: result.error.format() },
        { status: 400 }
      );
    }

    // Check if the employee exists
    const employee = await db.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return NextResponse.json({ error: "找不到該員工" }, { status: 404 });
    }

    const { isActive } = result.data;

    // Update the employee status
    const updatedEmployee = await db.employee.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        isActive: true,
      },
    });

    // Write to audit logs
    const action = isActive ? "EMPLOYEE_REACTIVATED" : "EMPLOYEE_DISABLED";
    const statusText = isActive ? "啟用" : "停用";
    await db.auditLog.create({
      data: {
        action,
        details: `${statusText}員工：${employee.name} (工號: ${employee.employeeCode})`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        adminId: admin.userId,
      },
    });

    return NextResponse.json({ success: true, employee: updatedEmployee });
  } catch (error) {
    console.error("PATCH Employee Status API Error:", error);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
