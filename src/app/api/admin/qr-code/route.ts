import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "未授權訪問" }, { status: 401 });
    }

    const workplace = await db.workplace.findFirst({
      where: { isActive: true },
    });

    if (!workplace) {
      return NextResponse.json({ error: "找不到啟用的工作場所" }, { status: 404 });
    }

    const clockUrl = `/clock?token=${workplace.workplaceToken}`;
    
    // Ensure NEXT_PUBLIC_APP_URL doesn't end with a slash to avoid duplicate slashes
    const appUrl = env.NEXT_PUBLIC_APP_URL.endsWith("/")
      ? env.NEXT_PUBLIC_APP_URL.slice(0, -1)
      : env.NEXT_PUBLIC_APP_URL;
      
    const fullClockUrl = `${appUrl}${clockUrl}`;

    return NextResponse.json({
      success: true,
      workplace: {
        name: workplace.name,
        address: workplace.address,
        workplaceToken: workplace.workplaceToken,
        allowedRadiusMeters: workplace.allowedRadiusMeters,
        warningRadiusMeters: workplace.warningRadiusMeters,
        clockUrl,
        fullClockUrl,
      },
    });
  } catch (error) {
    console.error("GET QR Code API Error:", error);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
