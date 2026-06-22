import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "未授權訪問" }, { status: 401 });
    }

    const workplace = await db.workplace.findFirst();

    if (!workplace) {
      return NextResponse.json({ error: "找不到工作地設定" }, { status: 404 });
    }

    // Generate a new secure UUID token
    const newToken = crypto.randomUUID();

    // Update token
    const updatedWorkplace = await db.workplace.update({
      where: { id: workplace.id },
      data: {
        workplaceToken: newToken,
      },
    });

    // Write to audit logs
    await db.auditLog.create({
      data: {
        action: "WORKPLACE_TOKEN_REGENERATED",
        details: `重新產生打卡安全識別碼 (Workplace Token)`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        adminId: admin.userId,
      },
    });

    return NextResponse.json({ success: true, workplace: updatedWorkplace });
  } catch (error) {
    console.error("POST Regenerate Token API Error:", error);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
