import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "缺少工作場所 Token" }, { status: 400 });
    }

    const workplace = await db.workplace.findUnique({
      where: { workplaceToken: token },
    });

    if (!workplace || !workplace.isActive) {
      return NextResponse.json({ error: "工作場所不存在或已停用" }, { status: 404 });
    }

    // Retrieve active employees
    const employees = await db.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        employeeCode: true,
      },
      orderBy: { employeeCode: "asc" },
    });

    return NextResponse.json({
      workplace: {
        id: workplace.id,
        name: workplace.name,
        latitude: workplace.latitude,
        longitude: workplace.longitude,
        allowedRadiusMeters: workplace.allowedRadiusMeters,
        warningRadiusMeters: workplace.warningRadiusMeters,
      },
      employees,
    });
  } catch (error) {
    console.error("GET Clock Workplace API Error:", error);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
