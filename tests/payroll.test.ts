import "dotenv/config";

import { spawn } from "child_process";
import { join } from "path";
import { hashPassword } from "../src/lib/auth";
import { getTaiwanMonthRange } from "../src/lib/date";

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
  console.log("🧪 Running Phase 6 Payroll and Monthly Reporting Integration Tests...\n");

  const port = "3827";
  const baseUrl = `http://localhost:${port}`;
  const clockUrl = `${baseUrl}/clock`;
  const apiLoginUrl = `${baseUrl}/api/auth/login`;
  const apiPayrollUrl = `${baseUrl}/api/admin/payroll`;

  // 1. Check if database is online
  let isDbOnline = false;
  try {
    const { db } = await import("../src/lib/db");
    await db.$connect();
    isDbOnline = true;
    console.log("🔌 Database is ONLINE. Running integration tests...");
    await db.$disconnect();
  } catch (e) {
    console.log("🔌 Database is OFFLINE. Skipping database-dependent Payroll API integration checks.");
    console.log("🎉 Public verification completed (DB skipped).");
    process.exit(0);
  }

  // 2. Setup Test Data in DB prior to starting server
  const { db } = await import("../src/lib/db");
  await db.$connect();

  console.log("🔧 Setting up test admin user, employees, and monthly attendance records...");
  const testAdminUsername = "paytestadmin";
  const testAdminPassword = "paytestpassword123";
  const adminHash = await hashPassword(testAdminPassword);

  // Clean stale admin
  await db.user.deleteMany({ where: { username: testAdminUsername } });
  
  const testAdmin = await db.user.create({
    data: {
      username: testAdminUsername,
      passwordHash: adminHash,
      name: "薪資計核測試管理員"
    }
  });
  console.log(`✅ Created test admin: ${testAdmin.username}`);

  // Create test employee A (時薪 190)
  const employeeCodeA = "PAYEMP1";
  const employeeNameA = "計薪測試員甲";
  const pinHashA = await hashPassword("1234");
  await db.employee.deleteMany({ where: { employeeCode: employeeCodeA } });

  const employeeA = await db.employee.create({
    data: {
      employeeCode: employeeCodeA,
      name: employeeNameA,
      hourlyRate: 190,
      pinHash: pinHashA,
      isActive: true
    }
  });
  console.log(`✅ Created employee A: ${employeeA.name} (Code: ${employeeA.employeeCode}, Rate: ${employeeA.hourlyRate})`);

  // Create test employee B (時薪 210)
  const employeeCodeB = "PAYEMP2";
  const employeeNameB = "計薪測試員乙";
  const pinHashB = await hashPassword("5678");
  await db.employee.deleteMany({ where: { employeeCode: employeeCodeB } });

  const employeeB = await db.employee.create({
    data: {
      employeeCode: employeeCodeB,
      name: employeeNameB,
      hourlyRate: 210,
      pinHash: pinHashB,
      isActive: true
    }
  });
  console.log(`✅ Created employee B: ${employeeB.name} (Code: ${employeeB.employeeCode}, Rate: ${employeeB.hourlyRate})`);

  // Clean stale records for these test employees
  await db.attendanceRecord.deleteMany({
    where: {
      employeeId: { in: [employeeA.id, employeeB.id] }
    }
  });

  // Setup June 2026 dates (Taiwan timezone)
  const baseDate1Str = "2026-06-01T00:00:00.000Z"; // June 1 local (corresponds to local midnight, e.g. UTC -8h, but getTaiwanMonthRange will match it correctly)
  const baseDate2Str = "2026-06-02T00:00:00.000Z";
  const baseDate3Str = "2026-06-03T00:00:00.000Z";
  const baseDate4Str = "2026-06-04T00:00:00.000Z";
  const baseDate5Str = "2026-06-05T00:00:00.000Z";

  // Shift UTC components to reflect local midnight at Taiwan (+8h)
  const parseLocalTwMidnight = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Date(d.getTime() - 8 * 60 * 60 * 1000); // 16:00:00Z of previous day
  };

  const localJune1 = parseLocalTwMidnight(baseDate1Str);
  const localJune2 = parseLocalTwMidnight(baseDate2Str);
  const localJune3 = parseLocalTwMidnight(baseDate3Str);
  const localJune4 = parseLocalTwMidnight(baseDate4Str);
  const localJune5 = parseLocalTwMidnight(baseDate5Str);

  // Setup Attendance Records for A:
  // Day 1: NORMAL (clock-in: 09:00 TW time, clock-out: 17:00 TW time) -> 8.0 paid hours
  const in1 = new Date(localJune1.getTime() + 9 * 60 * 60 * 1000);
  const out1 = new Date(localJune1.getTime() + 17 * 60 * 60 * 1000);
  await db.attendanceRecord.create({
    data: {
      employeeId: employeeA.id,
      date: localJune1,
      clockInTime: in1,
      clockOutTime: out1,
      totalMinutes: 480,
      totalHours: 8.0,
      status: "NORMAL",
      note: "第一天正常"
    }
  });

  // Day 2: LATE (clock-in: 10:00 TW, clock-out: 17:00 TW) -> 7.0 paid hours
  const in2 = new Date(localJune2.getTime() + 10 * 60 * 60 * 1000);
  const out2 = new Date(localJune2.getTime() + 17 * 60 * 60 * 1000);
  await db.attendanceRecord.create({
    data: {
      employeeId: employeeA.id,
      date: localJune2,
      clockInTime: in2,
      clockOutTime: out2,
      totalMinutes: 420,
      totalHours: 7.0,
      status: "LATE",
      note: "遲到打卡"
    }
  });

  // Day 3: ABSENT (no clock-in/out) -> Unpaid
  await db.attendanceRecord.create({
    data: {
      employeeId: employeeA.id,
      date: localJune3,
      clockInTime: null,
      clockOutTime: null,
      totalMinutes: null,
      totalHours: null,
      status: "ABSENT",
      note: "曠職"
    }
  });

  // Day 4: LEAVE (no clock-in/out) -> Unpaid
  await db.attendanceRecord.create({
    data: {
      employeeId: employeeA.id,
      date: localJune4,
      clockInTime: null,
      clockOutTime: null,
      totalMinutes: null,
      totalHours: null,
      status: "LEAVE",
      note: "事假"
    }
  });

  // Day 5: EARLY_LEAVE (clock-in: 09:00 TW, clock-out: 14:00 TW) -> 5.0 paid hours
  const in5 = new Date(localJune5.getTime() + 9 * 60 * 60 * 1000);
  const out5 = new Date(localJune5.getTime() + 14 * 60 * 60 * 1000);
  await db.attendanceRecord.create({
    data: {
      employeeId: employeeA.id,
      date: localJune5,
      clockInTime: in5,
      clockOutTime: out5,
      totalMinutes: 300,
      totalHours: 5.0,
      status: "EARLY_LEAVE",
      note: "早退打卡"
    }
  });

  // Setup Attendance Records for B:
  // Day 1: NORMAL (clock-in: 09:00 TW, clock-out: 19:00 TW) -> 10.0 paid hours
  const bin1 = new Date(localJune1.getTime() + 9 * 60 * 60 * 1000);
  const bout1 = new Date(localJune1.getTime() + 19 * 60 * 60 * 1000);
  await db.attendanceRecord.create({
    data: {
      employeeId: employeeB.id,
      date: localJune1,
      clockInTime: bin1,
      clockOutTime: bout1,
      totalMinutes: 600,
      totalHours: 10.0,
      status: "NORMAL",
      note: "正常加班"
    }
  });

  console.log("✅ Attendance records created successfully.");

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

  try {
    const isReady = await waitServerReady(clockUrl);
    if (!isReady) {
      throw new Error("Server failed to start or did not become ready within timeout.");
    }
    console.log("✅ Next.js server is ready. Beginning HTTP verification...\n");

    // A. Verify Unauthenticated access is rejected
    console.log("🔒 A. Testing Unauthenticated Access...");
    const unauthRes = await fetch(`${apiPayrollUrl}?year=2026&month=6`);
    assert(unauthRes.status === 401, "GET /api/admin/payroll without auth returns 401 Unauthorized");

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

    // B. Verify Payroll Calculations for All Employees
    console.log("\n💰 B. Testing Payroll Calculation calculations (All Employees)...");
    const payrollRes = await fetch(`${apiPayrollUrl}?year=2026&month=6`, {
      headers: { Cookie: tokenCookie }
    });
    assert(payrollRes.status === 200, "GET /api/admin/payroll returns 200 OK");
    const payrollData = await payrollRes.json();

    // Verify Summary Cards
    // Employee A: 20 hours * $190 = $3800, Days = 3
    // Employee B: 10 hours * $210 = $2100, Days = 1
    // Total Payroll Cost = 3800 + 2100 = 5900 NTD
    // Total Hours = 20.0 + 10.0 = 30.0 hours
    // Employee Count = 2
    // Average Salary = 5900 / 2 = 2950 NTD
    const summary = payrollData.summary;
    assert(summary.totalPayrollCost === 5900, `totalPayrollCost matches 5900, got ${summary.totalPayrollCost}`);
    assert(summary.totalHours === 30.0, `totalHours matches 30.0, got ${summary.totalHours}`);
    assert(summary.employeeCount === 2, `employeeCount matches 2, got ${summary.employeeCount}`);
    assert(summary.averageSalary === 2950, `averageSalary matches 2950, got ${summary.averageSalary}`);

    // Verify Individual Employee calculations
    const employeesList = payrollData.employees;
    assert(employeesList.length === 2, "Response includes exactly 2 employees");

    // Verify Employee A (should be first because of highest salary: 3800 > 2100)
    const empA = employeesList[0];
    assert(empA.employeeCode === employeeCodeA, `First row employee code matches A (${employeeCodeA}), got ${empA.employeeCode}`);
    assert(empA.hourlyRate === 190, `Employee A hourlyRate is 190, got ${empA.hourlyRate}`);
    assert(empA.totalDays === 3, `Employee A worked days is 3 (NORMAL, LATE, EARLY_LEAVE), got ${empA.totalDays}`);
    assert(empA.totalHours === 20.0, `Employee A totalHours is 20.0 (8.0 + 7.0 + 5.0), got ${empA.totalHours}`);
    assert(empA.monthlySalary === 3800, `Employee A monthlySalary is 3800, got ${empA.monthlySalary}`);

    // Verify Employee B (should be second: 2100)
    const empB = employeesList[1];
    assert(empB.employeeCode === employeeCodeB, `Second row employee code matches B (${employeeCodeB}), got ${empB.employeeCode}`);
    assert(empB.hourlyRate === 210, `Employee B hourlyRate is 210, got ${empB.hourlyRate}`);
    assert(empB.totalDays === 1, `Employee B worked days is 1 (NORMAL), got ${empB.totalDays}`);
    assert(empB.totalHours === 10.0, `Employee B totalHours is 10.0, got ${empB.totalHours}`);
    assert(empB.monthlySalary === 2100, `Employee B monthlySalary is 2100, got ${empB.monthlySalary}`);

    // C. Verify Daily Breakdown returned when employeeId is specified
    console.log("\n📋 C. Testing Daily Breakdown log fetching...");
    const breakdownRes = await fetch(`${apiPayrollUrl}?year=2026&month=6&employeeId=${employeeA.id}`, {
      headers: { Cookie: tokenCookie }
    });
    assert(breakdownRes.status === 200, "GET /api/admin/payroll with employeeId returns 200 OK");
    const breakdownData = await breakdownRes.json();

    const dailyRecords = breakdownData.dailyRecords;
    assert(dailyRecords.length === 5, `Employee A breakdown returns exactly 5 records, got ${dailyRecords.length}`);
    
    // Check fields mapped
    const day1 = dailyRecords.find((r: any) => r.status === "NORMAL");
    assert(!!day1, "Found NORMAL day 1 record");
    assert(day1.totalHours === 8.0, "NORMAL record shows 8.0 hours");
    assert(day1.note === "第一天正常", "NORMAL record displays note");

    const day3 = dailyRecords.find((r: any) => r.status === "ABSENT");
    assert(!!day3, "Found ABSENT day 3 record");
    assert(day3.totalHours === null, "ABSENT record totalHours is null");

    const day4 = dailyRecords.find((r: any) => r.status === "LEAVE");
    assert(!!day4, "Found LEAVE day 4 record");
    assert(day4.totalHours === null, "LEAVE record totalHours is null");

    // D. Verify Read-Only constraint (No audit log writes for calculating payroll)
    console.log("\n🛡️ D. Testing Read-Only Constraint...");
    const auditLogs = await db.auditLog.findMany({
      where: {
        action: {
          contains: "PAYROLL"
        }
      }
    });
    assert(auditLogs.length === 0, "No audit logs were created for payroll calculations (Read-only)");

    testSuccess = true;
    console.log("\n🎉 All Phase 6 Payroll Calculations Tests Passed successfully!");
  } catch (error: any) {
    console.error("\n❌ Phase 6 Payroll and Monthly Reporting tests failed!");
    console.error(error.message || error);
    process.exit(1);
  } finally {
    // 4. DB Clean up
    console.log("\n🧹 Cleaning up test records from DB...");
    try {
      // Delete attendance records
      const delRecords = await db.attendanceRecord.deleteMany({
        where: {
          employeeId: { in: [employeeA.id, employeeB.id] }
        }
      });
      console.log(`   Deleted ${delRecords.count} test attendance records`);

      // Delete test employees
      await db.employee.delete({ where: { id: employeeA.id } });
      await db.employee.delete({ where: { id: employeeB.id } });
      console.log("   Deleted test employees");

      // Delete test admin
      await db.user.delete({ where: { id: testAdmin.id } });
      console.log(`   Deleted test admin User: ${testAdmin.username}`);

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
