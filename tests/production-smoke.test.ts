import "dotenv/config";

import { spawn } from "child_process";
import { join } from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ ${message}`);
}

async function waitServerReady(url: string, timeoutMs: number = 15000): Promise<boolean> {
  const start = Date.now();
  console.log(`⏳ Waiting for server to become ready at ${url}...`);
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200 || res.status === 404 || res.status === 401 || res.status === 400) {
        return true;
      }
    } catch (e) {
      // Server not started yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function runTests() {
  console.log("🧪 Running Phase 8 Production Smoke Verification Tests...\n");

  const port = "3829";
  const baseUrl = `http://localhost:${port}`;
  const clockUrl = `${baseUrl}/clock`;
  const adminLoginUrl = `${baseUrl}/admin/login`;
  const adminUrl = `${baseUrl}/admin`;
  const apiHealthUrl = `${baseUrl}/api/health`;
  const apiEmployeesUrl = `${baseUrl}/api/admin/employees`;

  // 1. Check if database is online using Prisma client
  let isDbOnline = false;
  try {
    const { db } = await import("../src/lib/db");
    await db.$connect();
    isDbOnline = true;
    console.log("🔌 Database connection is ONLINE.");
    await db.$disconnect();
  } catch (e) {
    console.log("🔌 Database connection is OFFLINE. Smoke test will assert database status as DOWN.");
  }

  // 2. Spawn Next.js server
  const nextBin = join("node_modules", "next", "dist", "bin", "next");
  console.log(`🚀 Spawning Next.js server using: node ${nextBin} start -p ${port}`);
  
  const server = spawn("node", [nextBin, "start", "-p", port], {
    env: { ...process.env, NODE_ENV: "production" }
  });

  server.stdout.on("data", (data) => {
    // console.log(`[Server]: ${data}`);
  });

  server.stderr.on("data", (data) => {
    console.error(`[Server Error]: ${data}`);
  });

  let testSuccess = false;

  try {
    const isReady = await waitServerReady(clockUrl);
    if (!isReady) {
      throw new Error("Server failed to start or did not become ready within timeout.");
    }
    console.log("✅ Next.js server is ready. Beginning HTTP verification...\n");

    // A. Verify /api/health structure and connectivity status
    console.log("📋 A. Testing Health Endpoint (/api/health)...");
    const healthRes = await fetch(apiHealthUrl);
    assert(
      healthRes.status === (isDbOnline ? 200 : 500),
      `GET /api/health returned expected status code ${healthRes.status}`
    );
    const healthData = await healthRes.json();
    assert(
      healthData.status === (isDbOnline ? "UP" : "DOWN"),
      `Health status matches expected '${isDbOnline ? "UP" : "DOWN"}', got '${healthData.status}'`
    );
    assert(
      healthData.database === (isDbOnline ? "connected" : "disconnected"),
      `Database status matches expected '${isDbOnline ? "connected" : "disconnected"}', got '${healthData.database}'`
    );
    assert(!!healthData.timestamp, "Response contains timestamp");
    assert(!!healthData.version, `Response contains version: ${healthData.version}`);

    // B. Verify /admin/login is accessible
    console.log("\n📋 B. Testing /admin/login accessibility...");
    const adminLoginRes = await fetch(adminLoginUrl);
    assert(adminLoginRes.status === 200, "GET /admin/login is accessible (returns 200)");

    // C. Verify /clock is public
    console.log("\n📋 C. Testing /clock accessibility...");
    const clockRes = await fetch(clockUrl);
    assert(clockRes.status === 200, "GET /clock is publicly accessible (returns 200)");

    // D. Verify /admin redirects when unauthenticated
    console.log("\n🔒 D. Testing /admin middleware redirection...");
    const adminRes = await fetch(adminUrl, { redirect: "manual" });
    assert(
      adminRes.status === 307 || adminRes.status === 302,
      `GET /admin redirects unauthenticated requests (status: ${adminRes.status})`
    );
    const locationHeader = adminRes.headers.get("location") || "";
    assert(locationHeader.includes("/admin/login"), `Redirects to login page (Location: ${locationHeader})`);

    // E. Verify /api/admin/employees rejects unauthenticated requests
    console.log("\n🔒 E. Testing /api/admin/employees authentication enforcement...");
    const employeesRes = await fetch(apiEmployeesUrl);
    assert(employeesRes.status === 401, "GET /api/admin/employees without authentication returns 401 Unauthorized");

    testSuccess = true;
    console.log("\n🎉 All Phase 8 Production Smoke Tests Passed successfully!");
  } catch (error: any) {
    console.error("\n❌ Phase 8 Production Smoke tests failed!");
    console.error(error.message || error);
    process.exit(1);
  } finally {
    console.log("\n🛑 Terminating background Next.js server...");
    server.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    if (testSuccess) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

runTests().catch((err) => {
  console.error("💥 Integration test process failed:", err);
  process.exit(1);
});
