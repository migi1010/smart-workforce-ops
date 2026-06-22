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
      if (res.status === 200) {
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
  console.log("🧪 Running Auth API & Middleware Integration Verification Tests...\n");

  const port = "3827";
  const baseUrl = `http://localhost:${port}`;
  const clockUrl = `${baseUrl}/clock`;
  const adminUrl = `${baseUrl}/admin`;
  const adminLoginUrl = `${baseUrl}/admin/login`;
  const apiLoginUrl = `${baseUrl}/api/auth/login`;
  const apiLogoutUrl = `${baseUrl}/api/auth/logout`;
  const apiMeUrl = `${baseUrl}/api/auth/me`;

  // Determine admin credentials
  const username = process.env.INIT_ADMIN_USERNAME || "admin";
  const password = process.env.INIT_ADMIN_PASSWORD || "admin123456";

  console.log(`🔑 Using Admin credentials for verification: ${username} / ${password.substring(0, 3)}***`);

  // Spawn Next.js server directly
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

    // 1. Verify Public routes are accessible
    console.log("📋 1. Checking Public Routes...");
    const clockRes = await fetch(clockUrl);
    assert(clockRes.status === 200, "GET /clock is publicly accessible (returns 200)");

    const adminLoginRes = await fetch(adminLoginUrl);
    assert(adminLoginRes.status === 200, "GET /admin/login is publicly accessible (returns 200)");

    // 2. Verify Protected routes redirect
    console.log("\n🔒 2. Checking Middleware protection...");
    const adminRes = await fetch(adminUrl, { redirect: "manual" });
    // Since redirect: 'manual' is set, we check for redirect status (307 or 302)
    assert(
      adminRes.status === 307 || adminRes.status === 302, 
      `GET /admin redirects unauthenticated users (status: ${adminRes.status})`
    );
    const location = adminRes.headers.get("location");
    assert(location !== null && location.includes("/admin/login"), `Redirect targets /admin/login (Location: ${location})`);

    // Check if database is online using Prisma client
    let isDbOnline = false;
    try {
      const { db } = await import("../src/lib/db");
      await db.$connect();
      isDbOnline = true;
      console.log("\n🔌 Database is ONLINE. Running full API suite...");
      await db.$disconnect();
    } catch (e) {
      console.log("\n🔌 Database is OFFLINE. Skipping database-dependent API checks (login, logout, session profile).");
    }

    if (isDbOnline) {
      // 3. Verify POST /api/auth/login validation
      console.log("\n🚪 3. Checking POST /api/auth/login...");
      
      // Wrong password
      const wrongLoginRes = await fetch(apiLoginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: "incorrectpassword123" })
      });
      assert(wrongLoginRes.status === 401, "POST /api/auth/login with incorrect password returns 401");

      // Correct password
      const correctLoginRes = await fetch(apiLoginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      assert(correctLoginRes.status === 200, "POST /api/auth/login with correct password returns 200");
      
      // Extract cookie
      const setCookie = correctLoginRes.headers.get("set-cookie");
      assert(setCookie !== null && setCookie.includes("admin_token="), "Login response returns a Set-Cookie header containing 'admin_token'");
      
      // Parse cookie token
      const tokenCookie = setCookie!.split(";")[0]; // e.g. "admin_token=xxxx"

      // 4. Verify GET /api/auth/me protection
      console.log("\n👤 4. Checking GET /api/auth/me session check...");
      
      // Without cookie
      const meWithoutCookieRes = await fetch(apiMeUrl);
      assert(meWithoutCookieRes.status === 401, "GET /api/auth/me without cookie returns 401 Unauthorized");

      // With cookie
      const meWithCookieRes = await fetch(apiMeUrl, {
        headers: { Cookie: tokenCookie }
      });
      assert(meWithCookieRes.status === 200, "GET /api/auth/me with valid cookie returns 200 OK");
      const meData = await meWithCookieRes.json();
      assert(meData.user.username === username, `Profile username matches: ${meData.user.username}`);

      // 5. Verify access to protected dashboard with cookie
      console.log("\n📊 5. Checking GET /admin with valid session...");
      const adminWithCookieRes = await fetch(adminUrl, {
        headers: { Cookie: tokenCookie },
        redirect: "manual"
      });
      assert(adminWithCookieRes.status === 200, "GET /admin with valid session cookie returns 200 OK (no redirect)");

      // 6. Verify POST /api/auth/logout clears cookie
      console.log("\n🚪 6. Checking POST /api/auth/logout...");
      const logoutRes = await fetch(apiLogoutUrl, {
        method: "POST",
        headers: { Cookie: tokenCookie }
      });
      assert(logoutRes.status === 200, "POST /api/auth/logout returns 200 OK");
      
      const logoutSetCookie = logoutRes.headers.get("set-cookie");
      assert(
        logoutSetCookie !== null && (logoutSetCookie.includes("Max-Age=0") || logoutSetCookie.includes("expires=")),
        "Logout response clears cookie (contains Max-Age=0 or expiration)"
      );

      console.log("\n🎉 All Auth API and Middleware Integration Verification Tests Passed successfully!");
    } else {
      console.log("\n🎉 Public routes and Middleware redirect checks verified successfully!");
    }

    testSuccess = true;
  } catch (error: any) {
    console.error("\n❌ Auth/Middleware Integration verification failed!");
    console.error(error.message || error);
    process.exit(1);
  } finally {
    console.log("\n🛑 Terminating background Next.js server...");
    server.kill("SIGTERM");
    // Wait a brief moment to ensure port release
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
