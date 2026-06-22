import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionAdmin, hashPassword } from "@/lib/auth";
import { updatePinSchema } from "@/schemas/employee";

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
    const result = updatePinSchema.safeParse(body);

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

    const { pin } = result.data;

    // Hash the new PIN
    const pinHash = await hashPassword(pin);

    // Update the employee PIN
    await db.employee.update({
      where: { id },
      data: { pinHash },
    });

    // Write to audit logs
    await db.auditLog.create({
      data: {
        action: "EMPLOYEE_PIN_CHANGED",
        details: `變更員工密碼：${employee.name} (工號: ${employee.employeeCode})`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        adminId: admin.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH Employee PIN API Error:", error);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
