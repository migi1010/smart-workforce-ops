import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparePassword, signJWT } from "@/lib/auth";
import { loginSchema } from "@/schemas/auth";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "欄位驗證錯誤", details: result.error.format() },
        { status: 400 }
      );
    }

    const { username, password } = result.data;

    // Find the admin user
    const user = await db.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: "帳號或密碼錯誤" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordCorrect = await comparePassword(password, user.passwordHash);

    if (!isPasswordCorrect) {
      // Create a failed audit log entry
      await db.auditLog.create({
        data: {
          action: "ADMIN_LOGIN_FAILED",
          details: `帳號 ${username} 密碼驗證失敗`,
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return NextResponse.json(
        { error: "帳號或密碼錯誤" },
        { status: 401 }
      );
    }

    // Sign JWT
    const token = await signJWT({
      userId: user.id,
      username: user.username,
    });

    // Await cookies() according to Next.js 15+ specifications
    const cookieStore = await cookies();
    cookieStore.set({
      name: "admin_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Create success audit log
    await db.auditLog.create({
      data: {
        action: "ADMIN_LOGIN_SUCCESS",
        details: `管理員 ${username} 登入成功`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        adminId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "伺服器內部錯誤" },
      { status: 500 }
    );
  }
}
