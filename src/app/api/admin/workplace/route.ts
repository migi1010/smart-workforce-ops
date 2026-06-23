import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth";
import { updateWorkplaceSchema } from "@/schemas/workplace";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "未授權訪問" }, { status: 401 });
    }

    // Retrieve the first workplace. If none exists, create a default one (self-healing)
    let workplace = await db.workplace.findFirst();

    if (!workplace) {
      const token = crypto.randomUUID();
      workplace = await db.workplace.create({
        data: {
          name: "三峽八方雲集國際店",
          address: "新北市三峽區國際一街",
          latitude: 24.9376,
          longitude: 121.3688,
          allowedRadiusMeters: 100,
          warningRadiusMeters: 300,
          workplaceToken: token,
        },
      });
      
      // Log bootstrap event
      await db.auditLog.create({
        data: {
          action: "WORKPLACE_BOOTSTRAP",
          details: "系統自動初始化預設工作地設定",
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          adminId: admin.userId,
        },
      });
    }

    return NextResponse.json({ workplace });
  } catch (error) {
    console.error("GET Workplace API Error:", error);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return Response.json(
        {
          success: false,
          error: "未授權訪問"
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = updateWorkplaceSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          success: false,
          error: "欄位驗證錯誤"
        },
        { status: 400 }
      );
    }

    // Find the first workplace to update
    const workplace = await db.workplace.findFirst();

    if (!workplace) {
      return Response.json(
        {
          success: false,
          error: "找不到工作地設定"
        },
        { status: 400 }
      );
    }

    const { name, address, latitude, longitude, allowedRadiusMeters, warningRadiusMeters } = result.data;

    // Update settings
    const updatedWorkplace = await db.workplace.update({
      where: { id: workplace.id },
      data: {
        name,
        address,
        latitude,
        longitude,
        allowedRadiusMeters,
        warningRadiusMeters,
      },
    });

    // Write to audit logs
    await db.auditLog.create({
      data: {
        action: "WORKPLACE_UPDATED",
        details: `更新工作地設定：${name} (允許半徑: ${allowedRadiusMeters}米, 警告半徑: ${warningRadiusMeters}米)`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        adminId: admin.userId,
      },
    });

    return Response.json({
      success: true,
      workplace: updatedWorkplace
    });
  } catch (error) {
    console.error("PATCH Workplace API Error:", error);
    return Response.json(
      {
        success: false,
        error: "伺服器內部錯誤"
      },
      { status: 400 }
    );
  }
}
