import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionAdmin, hashPassword } from "@/lib/auth";
import { createEmployeeSchema } from "@/schemas/employee";

export async function GET(request: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "未授權訪問" }, { status: 401 });
    }

    // Retrieve all employees excluding pinHash
    const employees = await db.employee.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        phone: true,
        hourlyRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("GET Employees API Error:", error);
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
    const result = createEmployeeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "欄位驗證錯誤", details: result.error.format() },
        { status: 400 }
      );
    }

    const { employeeCode, name, phone, hourlyRate, pin } = result.data;

    // Check if employeeCode already exists
    const existingEmployee = await db.employee.findUnique({
      where: { employeeCode },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: "員工編號已存在" },
        { status: 400 }
      );
    }

    // Hash the PIN
    const pinHash = await hashPassword(pin);

    // Create the employee record
    const employee = await db.employee.create({
      data: {
        employeeCode,
        name,
        phone,
        hourlyRate,
        pinHash,
      },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        phone: true,
        hourlyRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Write to audit logs
    await db.auditLog.create({
      data: {
        action: "EMPLOYEE_CREATED",
        details: `建立新員工：${name} (工號: ${employeeCode})`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        adminId: admin.userId,
      },
    });

    return NextResponse.json({ success: true, employee }, { status: 201 });
  } catch (error) {
    console.error("POST Employee API Error:", error);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
