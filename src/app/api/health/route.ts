import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import pkg from "@/../package.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Lightweight database connectivity verification
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "UP",
        database: "connected",
        timestamp: new Date().toISOString(),
        version: pkg.version || "0.1.0",
      },
      { status: 200 }
    );
  } catch (error) {
    // Log the error internally for server troubleshooting
    console.error("Health check failed:", error);

    // Keep response opaque in production to prevent security/infrastructure leaks
    return NextResponse.json(
      {
        status: "DOWN",
        database: "disconnected",
        timestamp: new Date().toISOString(),
        version: pkg.version || "0.1.0",
      },
      { status: 500 }
    );
  }
}
