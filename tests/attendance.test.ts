import "dotenv/config";

import { spawn } from "child_process";
import { join } from "path";
import { hashPassword } from "../src/lib/auth";
import { getTaiwanBusinessDate } from "../src/lib/date";

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
  console.log("🧪 Running Phase 5 Attendance Management Integration Tests...\n");

  const port = "3827";
  const baseUrl = `http://localhost:${port}`;
  const clockUrl = `${baseUrl}/clock`;
  const apiLoginUrl = `${baseUrl}/api/auth/login`;
  const apiAttendanceUrl = `${baseUrl}/api/admin/attendance`;

  // 1. Check if database is online
  let isDbOnline = false;
  try {
    const { db } = await import("../src/lib/db");
    await db.$connect();
    isDbOnline = true;
    console.log("🔌 Database is ONLINE. Running integration tests...");
    await db.$disconnect();
  } catch (e) {
    console.log("🔌 Database is OFFLINE. Skipping database-dependent Attendance Management API integration checks.");
    console.log("🎉 Public verification completed (DB skipped).");
    process.exit(0);
  }

  // 2. Setup Test Data in DB prior to starting server
  const { db } = await import("../src/lib/db");
  await db.$connect();

  console.log("🔧 Setting up test admin user and employee...");
  const testAdminUsername = "attestadmin";
  const testAdminPassword = "attestpassword123";
  const adminHash = await hashPassword(testAdminPassword);

  // Clean stale admin
  await db.user.deleteMany({ where: { username: testAdminUsername } });
  
  const testAdmin = await db.user.create({
    data: {
      username: testAdminUsername,
      passwordHash: adminHash,
      name: "出勤測試管理員"
    }
  });
  console.log(`✅ Created test admin: ${testAdmin.username}`);

  // Create test employee
  const testEmployeeCode = "ATTTEST1";
  const testEmployeeName = "打卡測試員丙";
  const empPin = "1111";
  const empPinHash = await hashPassword(empPin);

  // Clean stale employee
  await db.employee.deleteMany({ where: { employeeCode: testEmployeeCode } });

  const employee = await db.employee.create({
    data: {
      employeeCode: testEmployeeCode,
      name: testEmployeeName,
      hourlyRate: 175,
      pinHash: empPinHash,
      isActive: true
    }
  });
  console.log(`✅ Created test employee: ${employee.name} (Code: ${employee.employeeCode})`);

  // 3. Spawn Next.js server directly
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
  let createdRecordId: string | null = null;

  try {
    const isReady = await waitServerReady(clockUrl);
    if (!isReady) {
      throw new Error("Server failed to start or did not become ready within timeout.");
    }
    console.log("✅ Next.js server is ready. Beginning HTTP verification...\n");

    // A. Verify Unauthenticated Admin access is rejected
    console.log("🔒 A. Testing Unauthenticated Access...");
    const unauthGetRes = await fetch(apiAttendanceUrl);
    assert(unauthGetRes.status === 401, "GET /api/admin/attendance without auth returns 401");
    
    const unauthPostRes = await fetch(apiAttendanceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: employee.id, date: new Date().toISOString(), status: "NORMAL" })
    });
    assert(unauthPostRes.status === 401, "POST /api/admin/attendance without auth returns 401");

    // Login as Admin
    console.log("\n🔑 Authenticating as Test Admin...");
    const loginRes = await fetch(apiLoginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: testAdminUsername, password: testAdminPassword })
    });
    assert(loginRes.status === 200, "Admin login successful");
    const setCookie = loginRes.headers.get("set-cookie");
    const tokenCookie = setCookie!.split(";")[0];

    // B. Test POST (Create Missing Attendance Record)
    console.log("\n補 B. Testing Hand-Creation (POST /api/admin/attendance)...");
    
    // Choose Taiwan business date for testing: e.g. 2026-06-22
    // Let's set clock-in to 09:00:00 Taiwan time (01:00:00 UTC)
    // and clock-out to 17:00:00 Taiwan time (09:00:00 UTC)
    const testDate = "2026-06-22";
    const testClockIn = "2026-06-22T01:00:00.000Z";
    const testClockOut = "2026-06-22T09:00:00.000Z"; // 8 hours diff

    const createRes = await fetch(apiAttendanceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie
      },
      body: JSON.stringify({
        employeeId: employee.id,
        date: new Date(testDate).toISOString(),
        clockInTime: testClockIn,
        clockOutTime: testClockOut,
        status: "LATE",
        note: "手動補登測試紀錄"
      })
    });

    assert(createRes.status === 201, "POST /api/admin/attendance returns 201 Created");
    const createData = await createRes.json();
    assert(createData.success === true, "Record created successfully");
    createdRecordId = createData.attendanceRecord.id;
    
    // Verify database values for new record
    const dbRecord = await db.attendanceRecord.findUnique({
      where: { id: createdRecordId! }
    });
    assert(!!dbRecord, "Record is saved in database");
    assert(dbRecord!.status === "LATE", "AttendanceRecord status is LATE");
    assert(dbRecord!.totalMinutes === 480, `totalMinutes is 480 (8 hours), got ${dbRecord!.totalMinutes}`);
    assert(dbRecord!.totalHours === 8.0, `totalHours is 8.0, got ${dbRecord!.totalHours}`);
    assert(dbRecord!.editedByBoss === true, "editedByBoss flag is true");

    // C. Test GET (Filtering Records)
    console.log("\n🔍 C. Testing Filtering Queries (GET /api/admin/attendance)...");
    
    // Filter by employeeId
    const filterEmpRes = await fetch(`${apiAttendanceUrl}?employeeId=${employee.id}`, {
      headers: { Cookie: tokenCookie }
    });
    const filterEmpData = await filterEmpRes.json();
    assert(filterEmpData.attendanceRecords.length === 1, "Filter by employeeId returns 1 record");
    assert(filterEmpData.attendanceRecords[0].id === createdRecordId, "Returned record matches created record");

    // Filter by status = LATE
    const filterStatusRes = await fetch(`${apiAttendanceUrl}?status=LATE`, {
      headers: { Cookie: tokenCookie }
    });
    const filterStatusData = await filterStatusRes.json();
    assert(filterStatusData.attendanceRecords.some((r: any) => r.id === createdRecordId), "Filter by status includes the LATE record");

    // Filter by date = 2026-06-22
    const filterDateRes = await fetch(`${apiAttendanceUrl}?date=${testDate}`, {
      headers: { Cookie: tokenCookie }
    });
    const filterDateData = await filterDateRes.json();
    assert(filterDateData.attendanceRecords.some((r: any) => r.id === createdRecordId), "Filter by date includes the record");

    // D. Test PATCH (Edit Record & Recalculate Hours)
    console.log("\n📝 D. Testing Manual Edit & Recalculate (PATCH /api/admin/attendance/[id])...");
    
    // Modify status to NORMAL and change clockOutTime to 18:00:00 Taiwan time (10:00:00 UTC) -> 9 hours diff
    const updatedClockOut = "2026-06-22T10:00:00.000Z";
    const editRes = await fetch(`${apiAttendanceUrl}/${createdRecordId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie
      },
      body: JSON.stringify({
        clockInTime: testClockIn,
        clockOutTime: updatedClockOut,
        status: "NORMAL",
        note: "修改工時與狀態為正常"
      })
    });

    assert(editRes.status === 200, "PATCH /api/admin/attendance/[id] returns 200 OK");
    const editData = await editRes.json();
    assert(editData.success === true, "Record updated successfully");

    // Verify recalculated database values
    const dbRecordUpdated = await db.attendanceRecord.findUnique({
      where: { id: createdRecordId! }
    });
    assert(dbRecordUpdated!.status === "NORMAL", "Updated record status is NORMAL");
    assert(dbRecordUpdated!.totalMinutes === 540, `Recalculate: totalMinutes updated to 540 (9 hours), got ${dbRecordUpdated!.totalMinutes}`);
    assert(dbRecordUpdated!.totalHours === 9.0, `Recalculate: totalHours updated to 9.0, got ${dbRecordUpdated!.totalHours}`);

    // E. Verify Audit Logs for actions
    console.log("\n📋 E. Verifying Database Audit Logs...");
    const logs = await db.auditLog.findMany({
      where: {
        action: {
          in: ["ATTENDANCE_RECORD_CREATED", "ATTENDANCE_RECORD_UPDATED"]
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const hasCreatedLog = logs.some(log => log.action === "ATTENDANCE_RECORD_CREATED" && log.details?.includes(testEmployeeCode));
    const hasUpdatedLog = logs.some(log => log.action === "ATTENDANCE_RECORD_UPDATED" && log.details?.includes(testEmployeeCode));
    
    assert(hasCreatedLog, "ATTENDANCE_RECORD_CREATED log found in DB");
    assert(hasUpdatedLog, "ATTENDANCE_RECORD_UPDATED log found in DB");

    testSuccess = true;
    console.log("\n🎉 All Phase 5 Attendance Management Tests Passed successfully!");
  } catch (error: any) {
    console.error("\n❌ Phase 5 Attendance Management tests failed!");
    console.error(error.message || error);
    process.exit(1);
  } finally {
    // 4. Clean up test records
    console.log("\n🧹 Cleaning up test records from DB...");
    try {
      if (createdRecordId) {
        await db.attendanceRecord.delete({ where: { id: createdRecordId } });
        console.log(`   Deleted test attendance record ID: ${createdRecordId}`);
      }
      
      await db.employee.delete({ where: { id: employee.id } });
      console.log(`   Deleted test employee Code: ${employee.employeeCode}`);

      await db.user.delete({ where: { id: testAdmin.id } });
      console.log(`   Deleted test admin User: ${testAdmin.username}`);

      // Delete test audit logs
      const delLogs = await db.auditLog.deleteMany({
        where: {
          details: {
            contains: testEmployeeCode
          }
        }
      });
      console.log(`   Deleted ${delLogs.count} test audit log entries`);

      await db.$disconnect();
    } catch (cleanUpErr: any) {
      console.error("⚠️ Failed to clean up DB test data:", cleanUpErr.message || cleanUpErr);
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
