import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (token) {
      const payload = await verifyJWT(token);
      if (payload) {
        await db.auditLog.create({
          data: {
            action: "ADMIN_LOGOUT",
            details: `管理員 ${payload.username} 登出`,
            ipAddress: request.headers.get("x-forwarded-for") || "unknown",
            adminId: payload.userId,
          },
        });
      }
    }

    // Clear the HTTP-only cookie by setting maxAge to 0
    cookieStore.set({
      name: "admin_token",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout API Error:", error);
    return NextResponse.json(
      { error: "伺服器內部錯誤" },
      { status: 500 }
    );
  }
}
