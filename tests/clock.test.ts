import "dotenv/config";

import { spawn } from "child_process";
import { join } from "path";
import { hashPassword } from "../src/lib/auth";
import { getTaiwanBusinessDate, getTaiwanDayRange } from "../src/lib/date";

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
      if (res.status === 200 || res.status === 400 || res.status === 404) {
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
  console.log("🧪 Running Phase 3 Employee Clock-In/Out Integration Tests...\n");

  const port = "3827";
  const baseUrl = `http://localhost:${port}`;
  const clockUrl = `${baseUrl}/clock`;
  const apiWorkplaceUrl = `${baseUrl}/api/clock/workplace`;
  const apiSubmitUrl = `${baseUrl}/api/clock/submit`;

  // 1. Check if database is online using Prisma client
  let isDbOnline = false;
  try {
    const { db } = await import("../src/lib/db");
    await db.$connect();
    isDbOnline = true;
    console.log("🔌 Database is ONLINE. Running integration tests...");
    await db.$disconnect();
  } catch (e) {
    console.log("🔌 Database is OFFLINE. Skipping database-dependent Clock API integration checks.");
    console.log("🎉 Public verification completed (DB skipped).");
    process.exit(0);
  }

  // 2. Setup Test Data in DB prior to starting server
  const { db } = await import("../src/lib/db");
  await db.$connect();

  console.log("🔧 Setting up test workplace and test employees...");

  // Ensure an active workplace exists
  let workplace = await db.workplace.findFirst({ where: { isActive: true } });
  let testWorkplaceCreated = false;
  
  if (!workplace) {
    workplace = await db.workplace.create({
      data: {
        name: "打卡測試專用店",
        address: "新北市三峽區國際一街",
        latitude: 24.9376,
        longitude: 121.3688,
        allowedRadiusMeters: 100,
        warningRadiusMeters: 300,
        workplaceToken: "TEST_WORKPLACE_TOKEN_SECRET_999",
      }
    });
    testWorkplaceCreated = true;
    console.log(`✅ Created test workplace: ${workplace.name}`);
  } else {
    console.log(`✅ Using existing workplace: ${workplace.name} (Token: ${workplace.workplaceToken})`);
  }

  // Create test employee 1 (for normal clock-in/out flow)
  const employeeCode1 = "TESTCL1";
  const employeeName1 = "打卡測試員甲";
  const employeePin1 = "1234";
  const pinHash1 = await hashPassword(employeePin1);
  
  // Clean up any existing stale test employee with same code
  await db.employee.deleteMany({ where: { employeeCode: employeeCode1 } });

  const employee1 = await db.employee.create({
    data: {
      employeeCode: employeeCode1,
      name: employeeName1,
      hourlyRate: 160,
      pinHash: pinHash1,
      isActive: true
    }
  });
  console.log(`✅ Created test employee: ${employee1.name} (Code: ${employee1.employeeCode})`);

  // Create test employee 2 (for clock-out without clock-in test)
  const employeeCode2 = "TESTCL2";
  const employeeName2 = "打卡測試員乙";
  const employeePin2 = "5678";
  const pinHash2 = await hashPassword(employeePin2);
  
  await db.employee.deleteMany({ where: { employeeCode: employeeCode2 } });

  const employee2 = await db.employee.create({
    data: {
      employeeCode: employeeCode2,
      name: employeeName2,
      hourlyRate: 170,
      pinHash: pinHash2,
      isActive: true
    }
  });
  console.log(`✅ Created test employee: ${employee2.name} (Code: ${employee2.employeeCode})`);

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

    // 1. Verify access to public /clock page
    console.log("📄 1. Verifying public /clock page access...");
    const clockPageRes = await fetch(`${clockUrl}?token=${workplace.workplaceToken}`);
    assert(clockPageRes.status === 200, "GET /clock?token=xxx returns 200 OK");

    // 2. Verify Workplace Fetch GET API
    console.log("\n🔍 2. Testing Workplace Fetch (GET /api/clock/workplace)...");
    
    // Invalid token
    const getWpFailRes = await fetch(`${apiWorkplaceUrl}?token=WRONG_TOKEN`);
    assert(getWpFailRes.status === 404, "GET /api/clock/workplace with invalid token returns 404 Not Found");

    // Valid token
    const getWpSuccessRes = await fetch(`${apiWorkplaceUrl}?token=${workplace.workplaceToken}`);
    assert(getWpSuccessRes.status === 200, "GET /api/clock/workplace with valid token returns 200 OK");
    const getWpData = await getWpSuccessRes.json();
    assert(getWpData.workplace.name === workplace.name, "Workplace name matches");
    assert(Array.isArray(getWpData.employees), "Returns employee array");
    
    // Security check: ensure no pinHash leaks
    const foundEmp1 = getWpData.employees.find((emp: any) => emp.id === employee1.id);
    assert(!!foundEmp1, "Created test employee is listed in the response");
    assert(foundEmp1.pinHash === undefined, "Security: pinHash is NOT exposed in employee list");

    // 3. Verify Submit Rejection Cases
    console.log("\n⚠️ 3. Testing Clock Submit Rejection Cases...");
    
    // A. Invalid Workplace Token
    const failTokenRes = await fetch(apiSubmitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workplaceToken: "WRONG_TOKEN",
        employeeId: employee1.id,
        pin: employeePin1,
        eventType: "CLOCK_IN",
        latitude: workplace.latitude,
        longitude: workplace.longitude
      })
    });
    assert(failTokenRes.status === 400, "Rejects submit with wrong workplace token (400)");
    const failTokenData = await failTokenRes.json();
    assert(failTokenData.error.includes("工作場所不存在"), "Error message points to invalid workplace");

    // B. Wrong PIN
    const failPinRes = await fetch(apiSubmitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workplaceToken: workplace.workplaceToken,
        employeeId: employee1.id,
        pin: "9999", // Wrong PIN
        eventType: "CLOCK_IN",
        latitude: workplace.latitude,
        longitude: workplace.longitude
      })
    });
    assert(failPinRes.status === 400, "Rejects submit with wrong PIN (400)");
    const failPinData = await failPinRes.json();
    assert(failPinData.error.includes("密碼錯誤"), "Error message points to wrong security password");

    // C. Inactive Employee
    await db.employee.update({ where: { id: employee1.id }, data: { isActive: false } });
    const failInactiveRes = await fetch(apiSubmitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workplaceToken: workplace.workplaceToken,
        employeeId: employee1.id,
        pin: employeePin1,
        eventType: "CLOCK_IN",
        latitude: workplace.latitude,
        longitude: workplace.longitude
      })
    });
    assert(failInactiveRes.status === 400, "Rejects submit with inactive employee (400)");
    
    // Reactivate employee for subsequent tests
    await db.employee.update({ where: { id: employee1.id }, data: { isActive: true } });

    // D. Location Denied (missing coordinates)
    const failNoGpsRes = await fetch(apiSubmitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workplaceToken: workplace.workplaceToken,
        employeeId: employee1.id,
        pin: employeePin1,
        eventType: "CLOCK_IN",
        latitude: null,
        longitude: null
      })
    });
    assert(failNoGpsRes.status === 400, "Rejects submit with LOCATION_DENIED when coords are null");
    const failNoGpsData = await failNoGpsRes.json();
    assert(failNoGpsData.error.includes("無法取得 GPS 定位"), "Correct location denied error message");

    // E. Location Blocked (coords too far away)
    const failBlockedRes = await fetch(apiSubmitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workplaceToken: workplace.workplaceToken,
        employeeId: employee1.id,
        pin: employeePin1,
        eventType: "CLOCK_IN",
        latitude: 25.0330, // Taipei 101, ~15km away
        longitude: 121.5654
      })
    });
    assert(failBlockedRes.status === 400, "Rejects submit with BLOCKED when coords are far away");
    const failBlockedData = await failBlockedRes.json();
    assert(failBlockedData.error.includes("超出允許的範圍"), "Correct location blocked error message");

    // 4. Verify Successful CLOCK_IN (Normal Range)
    console.log("\n⏱️ 4. Testing Successful Clock-In (NORMAL)...");
    const clockInRes = await fetch(apiSubmitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workplaceToken: workplace.workplaceToken,
        employeeId: employee1.id,
        pin: employeePin1,
        eventType: "CLOCK_IN",
        latitude: workplace.latitude,
        longitude: workplace.longitude
      })
    });
    assert(clockInRes.status === 200, "POST /api/clock/submit CLOCK_IN returns 200 OK");
    const clockInData = await clockInRes.json();
    assert(clockInData.success === true, "Clock-in marked successful");
    assert(clockInData.feedback.employeeName === employee1.name, "Feedback returns correct employee name");
    assert(clockInData.feedback.eventType === "CLOCK_IN", "Feedback eventType matches CLOCK_IN");
    assert(clockInData.feedback.locationStatus === "NORMAL", "Feedback locationStatus is NORMAL");
    assert(!!clockInData.feedback.timestamp, "Feedback includes timestamp");

    // Verify DB states for Clock-In
    const todayBusinessDate = getTaiwanBusinessDate();
    const attendanceRecord = await db.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee1.id,
          date: todayBusinessDate
        }
      }
    });
    assert(!!attendanceRecord, "AttendanceRecord is created in the database for today");
    assert(attendanceRecord!.clockInTime !== null, "clockInTime is populated");
    assert(attendanceRecord!.clockOutTime === null, "clockOutTime is null");

    const clockEventsIn = await db.clockEvent.findMany({
      where: { employeeId: employee1.id, eventType: "CLOCK_IN" }
    });
    assert(clockEventsIn.length === 1, "Exactly one CLOCK_IN ClockEvent is saved in DB");
    assert(clockEventsIn[0].locationStatus === "NORMAL", "ClockEvent has locationStatus = NORMAL");

    // 5. Verify Duplicate Clock-In Rejection
    console.log("\n⚠️ 5. Testing Duplicate Clock-In Rejection...");
    const dupClockInRes = await fetch(apiSubmitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workplaceToken: workplace.workplaceToken,
        employeeId: employee1.id,
        pin: employeePin1,
        eventType: "CLOCK_IN",
        latitude: workplace.latitude,
        longitude: workplace.longitude
      })
    });
    assert(dupClockInRes.status === 400, "Duplicate CLOCK_IN is rejected (400)");
    const dupClockInData = await dupClockInRes.json();
    assert(dupClockInData.error.includes("已完成上班打卡"), "Correct duplicate clock-in error message");

    // 6. Verify Clock-Out Without Clock-In Rejection
    console.log("\n⚠️ 6. Testing Clock-Out Without Clock-In Rejection...");
    const noClockInRes = await fetch(apiSubmitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workplaceToken: workplace.workplaceToken,
        employeeId: employee2.id, // employee 2 has not clocked in today
        pin: employeePin2,
        eventType: "CLOCK_OUT",
        latitude: workplace.latitude,
        longitude: workplace.longitude
      })
    });
    assert(noClockInRes.status === 400, "CLOCK_OUT without CLOCK_IN is rejected (400)");
    const noClockInData = await noClockInRes.json();
    assert(noClockInData.error.includes("尚未進行上班打卡"), "Correct clock-out without clock-in error message");

    // 7. Verify Successful CLOCK_OUT (Suspicious Range)
    console.log("\n⏱️ 7. Testing Successful Clock-Out (SUSPICIOUS)...");
    
    // Simulate coordinates approx 150 meters away (warning range: 100m to 300m)
    // 24.9381, 121.3696
    const suspiciousLat = 24.9381;
    const suspiciousLon = 121.3696;

    const clockOutRes = await fetch(apiSubmitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workplaceToken: workplace.workplaceToken,
        employeeId: employee1.id,
        pin: employeePin1,
        eventType: "CLOCK_OUT",
        latitude: suspiciousLat,
        longitude: suspiciousLon
      })
    });
    assert(clockOutRes.status === 200, "POST /api/clock/submit CLOCK_OUT returns 200 OK");
    const clockOutData = await clockOutRes.json();
    assert(clockOutData.success === true, "Clock-out marked successful");
    assert(clockOutData.feedback.employeeName === employee1.name, "Feedback returns correct employee name");
    assert(clockOutData.feedback.eventType === "CLOCK_OUT", "Feedback eventType matches CLOCK_OUT");
    assert(clockOutData.feedback.locationStatus === "SUSPICIOUS", "Feedback locationStatus is SUSPICIOUS");
    assert(clockOutData.feedback.totalHours !== undefined, "Feedback includes totalHours worked");
    console.log(`   Calculated worked hours: ${clockOutData.feedback.totalHours} hrs`);

    // Verify DB states for Clock-Out
    const attendanceRecordOut = await db.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee1.id,
          date: todayBusinessDate
        }
      }
    });
    assert(attendanceRecordOut!.clockOutTime !== null, "clockOutTime is populated in DB");
    assert(attendanceRecordOut!.totalHours !== null, "totalHours is populated in DB");
    assert(attendanceRecordOut!.totalMinutes !== null, "totalMinutes is populated in DB");

    const clockEventsOut = await db.clockEvent.findMany({
      where: { employeeId: employee1.id, eventType: "CLOCK_OUT" }
    });
    assert(clockEventsOut.length === 1, "Exactly one CLOCK_OUT ClockEvent is saved in DB");
    assert(clockEventsOut[0].locationStatus === "SUSPICIOUS", "ClockEvent has locationStatus = SUSPICIOUS in DB");

    // 8. Verify Duplicate Clock-Out Rejection
    console.log("\n⚠️ 8. Testing Duplicate Clock-Out Rejection...");
    const dupClockOutRes = await fetch(apiSubmitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workplaceToken: workplace.workplaceToken,
        employeeId: employee1.id,
        pin: employeePin1,
        eventType: "CLOCK_OUT",
        latitude: workplace.latitude,
        longitude: workplace.longitude
      })
    });
    assert(dupClockOutRes.status === 400, "Duplicate CLOCK_OUT is rejected (400)");
    const dupClockOutData = await dupClockOutRes.json();
    assert(dupClockOutData.error.includes("已完成下班打卡"), "Correct duplicate clock-out error message");

    testSuccess = true;
    console.log("\n🎉 All Phase 3 Clock-In/Out Integration Tests Passed successfully!");
  } catch (error: any) {
    console.error("\n❌ Phase 3 Clock-In/Out integration tests failed!");
    console.error(error.message || error);
    process.exit(1);
  } finally {
    // 4. DB Clean up: clean test employee, attendance record, and clock events
    console.log("\n🧹 Cleaning up test data from DB...");
    try {
      // Delete ClockEvents
      const delEvents = await db.clockEvent.deleteMany({
        where: {
          employeeId: {
            in: [employee1.id, employee2.id]
          }
        }
      });
      console.log(`   Deleted ${delEvents.count} test clock events`);

      // Delete AttendanceRecords
      const delRecords = await db.attendanceRecord.deleteMany({
        where: {
          employeeId: {
            in: [employee1.id, employee2.id]
          }
        }
      });
      console.log(`   Deleted ${delRecords.count} test attendance records`);

      // Delete Employees
      await db.employee.delete({ where: { id: employee1.id } });
      await db.employee.delete({ where: { id: employee2.id } });
      console.log("   Deleted test employees");

      // Delete Workplace if we created it
      if (testWorkplaceCreated) {
        await db.workplace.delete({ where: { id: workplace.id } });
        console.log("   Deleted test workplace");
      }

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
