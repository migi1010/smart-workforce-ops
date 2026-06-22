import "dotenv/config";

import { spawn } from "child_process";
import { join } from "path";
import { haversineDistanceMeters, evaluateLocationStatus } from "../src/lib/location";

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
  console.log("🧪 Running Phase 2 Attendance Foundation Integration Tests...\n");

  // 1. Verify Location Utilities (Haversine Distance & Status Evaluation)
  console.log("📋 1. Checking Location Mathematics & Logic...");
  
  // Test coordinate 1 (Sanxia shop approx): 24.9376, 121.3688
  // Test coordinate 2 (approx 100 meters away): 24.9381, 121.3696
  const distance = haversineDistanceMeters(24.9376, 121.3688, 24.9381, 121.3696);
  console.log(`   Calculated distance between points: ${distance.toFixed(2)} meters`);
  assert(distance > 50 && distance < 150, "Haversine formula computes approximate distance correctly");

  // Evaluate status tests
  assert(evaluateLocationStatus(50, 100, 300) === "NORMAL", "evaluateLocationStatus: distance <= allowedRadius is NORMAL");
  assert(evaluateLocationStatus(150, 100, 300) === "SUSPICIOUS", "evaluateLocationStatus: distance between allowed & warning is SUSPICIOUS");
  assert(evaluateLocationStatus(350, 100, 300) === "BLOCKED", "evaluateLocationStatus: distance > warningRadius is BLOCKED");
  assert(evaluateLocationStatus(null, 100, 300) === "LOCATION_DENIED", "evaluateLocationStatus: null distance is LOCATION_DENIED");
  assert(evaluateLocationStatus(undefined, 100, 300) === "LOCATION_DENIED", "evaluateLocationStatus: undefined distance is LOCATION_DENIED");

  // 2. Setup server configuration for integration checks
  const port = "3827";
  const baseUrl = `http://localhost:${port}`;
  const clockUrl = `${baseUrl}/clock`;
  const apiLoginUrl = `${baseUrl}/api/auth/login`;
  const apiWorkplaceUrl = `${baseUrl}/api/admin/workplace`;
  const apiRegenerateUrl = `${baseUrl}/api/admin/workplace/regenerate-token`;

  const adminUsername = process.env.INIT_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.INIT_ADMIN_PASSWORD || "admin123456";

  // Check if database is online
  let isDbOnline = false;
  try {
    const { db } = await import("../src/lib/db");
    await db.$connect();
    isDbOnline = true;
    console.log("\n🔌 Database is ONLINE. Running integration tests...");
    await db.$disconnect();
  } catch (e) {
    console.log("\n🔌 Database is OFFLINE. Skipping database-dependent Workplace API integration checks.");
    console.log("🎉 Public verification completed (DB skipped).");
    process.exit(0);
  }

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
  let originalWorkplaceConfig: any = null;

  try {
    const isReady = await waitServerReady(clockUrl);
    if (!isReady) {
      throw new Error("Server failed to start or did not become ready within timeout.");
    }
    console.log("✅ Next.js server is ready. Beginning HTTP verification...\n");

    // 3. Verify Admin Route protection without session cookie
    console.log("🔒 3. Checking API Protection...");
    const getWpWithoutCookieRes = await fetch(apiWorkplaceUrl);
    assert(getWpWithoutCookieRes.status === 401, "GET /api/admin/workplace without cookie returns 401");

    const patchWpWithoutCookieRes = await fetch(apiWorkplaceUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Testing" })
    });
    assert(patchWpWithoutCookieRes.status === 401, "PATCH /api/admin/workplace without cookie returns 401");

    const postTokenWithoutCookieRes = await fetch(apiRegenerateUrl, { method: "POST" });
    assert(postTokenWithoutCookieRes.status === 401, "POST /api/admin/workplace/regenerate-token without cookie returns 401");

    // 4. Perform Admin login
    console.log("\n🔑 4. Authenticating as Admin...");
    const loginRes = await fetch(apiLoginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: adminUsername, password: adminPassword })
    });
    assert(loginRes.status === 200, "Admin login successful");
    const setCookie = loginRes.headers.get("set-cookie");
    const tokenCookie = setCookie!.split(";")[0];

    // 5. Query workplace config
    console.log("\n🔌 5. Testing Workplace Fetch (GET /api/admin/workplace)...");
    const getWpRes = await fetch(apiWorkplaceUrl, {
      headers: { Cookie: tokenCookie }
    });
    assert(getWpRes.status === 200, "GET /api/admin/workplace returns 200");
    const getWpData = await getWpRes.json();
    assert(!!getWpData.workplace, "Response contains workplace configuration");
    assert(getWpData.workplace.name === "三峽八方雲集國際店", "Default workplace name matches");
    assert(getWpData.workplace.address === "新北市三峽區國際一街", "Default address matches");
    assert(!!getWpData.workplace.workplaceToken, "workplaceToken is returned in GET settings response");

    originalWorkplaceConfig = getWpData.workplace;

    // 6. Test PATCH /api/admin/workplace settings update
    console.log("\n📝 6. Testing Workplace Settings Update (PATCH /api/admin/workplace)...");
    const updatedName = "八方雲集三峽店（測試中）";
    const updatedAddress = "新北市三峽區國慶路";
    const updatedLat = 24.9380;
    const updatedLon = 121.3690;
    const updatedAllowedRadius = 150;
    const updatedWarningRadius = 350;

    const patchWpRes = await fetch(apiWorkplaceUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie
      },
      body: JSON.stringify({
        name: updatedName,
        address: updatedAddress,
        latitude: updatedLat,
        longitude: updatedLon,
        allowedRadiusMeters: updatedAllowedRadius,
        warningRadiusMeters: updatedWarningRadius
      })
    });
    assert(patchWpRes.status === 200, "PATCH /api/admin/workplace returns 200");
    const patchWpData = await patchWpRes.json();
    assert(patchWpData.success === true, "Workplace settings updated successfully");
    assert(patchWpData.workplace.name === updatedName, "Updated name matches");
    assert(patchWpData.workplace.address === updatedAddress, "Updated address matches");
    assert(patchWpData.workplace.latitude === updatedLat, "Updated latitude matches");
    assert(patchWpData.workplace.allowedRadiusMeters === updatedAllowedRadius, "Updated allowedRadiusMeters matches");

    // 7. Verify Radius boundary validation (Zod schema .refine rule)
    console.log("\n⚠️ 7. Testing Radius Validation Rules...");
    
    // Negative allowedRadius
    const failRadiusRes1 = await fetch(apiWorkplaceUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie
      },
      body: JSON.stringify({
        name: updatedName,
        address: updatedAddress,
        latitude: updatedLat,
        longitude: updatedLon,
        allowedRadiusMeters: -10, // Invalid: must be positive
        warningRadiusMeters: 300
      })
    });
    assert(failRadiusRes1.status === 400, "PATCH with negative allowedRadius returns 400 Bad Request");

    // Warning radius <= allowed radius
    const failRadiusRes2 = await fetch(apiWorkplaceUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie
      },
      body: JSON.stringify({
        name: updatedName,
        address: updatedAddress,
        latitude: updatedLat,
        longitude: updatedLon,
        allowedRadiusMeters: 200,
        warningRadiusMeters: 150 // Invalid: warning must be > allowed (150 <= 200)
      })
    });
    assert(failRadiusRes2.status === 400, "PATCH with warningRadius <= allowedRadius returns 400 Bad Request due to Zod .refine constraint");

    // 8. Test token regeneration
    console.log("\n🔑 8. Testing Token Regeneration (POST /api/admin/workplace/regenerate-token)...");
    const originalToken = originalWorkplaceConfig.workplaceToken;
    
    const regenRes = await fetch(apiRegenerateUrl, {
      method: "POST",
      headers: { Cookie: tokenCookie }
    });
    assert(regenRes.status === 200, "POST /api/admin/workplace/regenerate-token returns 200");
    const regenData = await regenRes.json();
    assert(regenData.success === true, "Token regenerated successfully");
    assert(regenData.workplace.workplaceToken !== originalToken, "New token is different from the original token");

    // 9. Verify Audit Logs for Workplace updates & token regeneration
    console.log("\n📋 9. Verifying Database Audit Logs...");
    const { db } = await import("../src/lib/db");
    
    const logs = await db.auditLog.findMany({
      where: {
        action: {
          in: ["WORKPLACE_UPDATED", "WORKPLACE_TOKEN_REGENERATED"]
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const hasUpdatedLog = logs.some(log => log.action === "WORKPLACE_UPDATED" && log.details?.includes("八方雲集三峽店（測試中）"));
    const hasRegenLog = logs.some(log => log.action === "WORKPLACE_TOKEN_REGENERATED");

    assert(hasUpdatedLog, "WORKPLACE_UPDATED action logged in DB");
    assert(hasRegenLog, "WORKPLACE_TOKEN_REGENERATED action logged in DB");

    testSuccess = true;
    console.log("\n🎉 All Phase 2 Attendance Foundation Tests Passed successfully!");
  } catch (error: any) {
    console.error("\n❌ Phase 2 Attendance Foundation tests failed!");
    console.error(error.message || error);
    process.exit(1);
  } finally {
    // DB Clean up: restore original workplace configuration
    if (originalWorkplaceConfig) {
      console.log("\n🧹 Restoring original workplace configuration in database...");
      try {
        const { db } = await import("../src/lib/db");
        await db.$connect();
        
        await db.workplace.update({
          where: { id: originalWorkplaceConfig.id },
          data: {
            name: originalWorkplaceConfig.name,
            address: originalWorkplaceConfig.address,
            latitude: originalWorkplaceConfig.latitude,
            longitude: originalWorkplaceConfig.longitude,
            allowedRadiusMeters: originalWorkplaceConfig.allowedRadiusMeters,
            warningRadiusMeters: originalWorkplaceConfig.warningRadiusMeters,
            workplaceToken: originalWorkplaceConfig.workplaceToken,
          }
        });
        
        // Clean up test audit logs
        await db.auditLog.deleteMany({
          where: {
            action: {
              in: ["WORKPLACE_UPDATED", "WORKPLACE_TOKEN_REGENERATED"]
            }
          }
        });
        
        console.log("✅ Database records successfully restored.");
        await db.$disconnect();
      } catch (cleanUpErr: any) {
        console.error("⚠️ Failed to restore DB records:", cleanUpErr.message || cleanUpErr);
      }
    }

    console.log("🛑 Terminating background Next.js server...");
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
