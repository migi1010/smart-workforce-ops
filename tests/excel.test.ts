import "dotenv/config";

import { spawn } from "child_process";
import { join } from "path";
import { hashPassword } from "../src/lib/auth";
import * as XLSX from "xlsx";

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
  console.log("🧪 Running Phase 7 Excel Export Integration Tests...\n");

  const port = "3828";
  const baseUrl = `http://localhost:${port}`;
  const clockUrl = `${baseUrl}/clock`;
  const apiLoginUrl = `${baseUrl}/api/auth/login`;
  const apiExportUrl = `${baseUrl}/api/admin/payroll/export`;

  // 1. Check if database is online
  let isDbOnline = false;
  try {
    const { db } = await import("../src/lib/db");
    await db.$connect();
    isDbOnline = true;
    console.log("🔌 Database is ONLINE. Running integration tests...");
    await db.$disconnect();
  } catch (e) {
    console.log("🔌 Database is OFFLINE. Skipping database-dependent Excel Export API integration checks.");
    console.log("🎉 Public verification completed (DB skipped).");
    process.exit(0);
  }

  // 2. Setup Test Data in DB prior to starting server
  const { db } = await import("../src/lib/db");
  await db.$connect();

  console.log("🔧 Setting up test admin user, employees, and monthly attendance records...");
  const testAdminUsername = "exceltestadmin";
  const testAdminPassword = "exceltestpassword123";
  const adminHash = await hashPassword(testAdminPassword);

  // Clean stale admin
  await db.user.deleteMany({ where: { username: testAdminUsername } });
  
  const testAdmin = await db.user.create({
    data: {
      username: testAdminUsername,
      passwordHash: adminHash,
      name: "匯出測試管理員"
    }
  });
  console.log(`✅ Created test admin: ${testAdmin.username}`);

  // Create test employee A (時薪 190)
  const employeeCodeA = "EXEMP1";
  const employeeNameA = "匯出測試員甲";
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
  const employeeCodeB = "EXEMP2";
  const employeeNameB = "匯出測試員乙";
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
  const baseDate1Str = "2026-06-01T00:00:00.000Z";
  const baseDate2Str = "2026-06-02T00:00:00.000Z";
  const baseDate3Str = "2026-06-03T00:00:00.000Z";
  const baseDate4Str = "2026-06-04T00:00:00.000Z";
  const baseDate5Str = "2026-06-05T00:00:00.000Z";

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
  // Day 1: NORMAL (clock-in: 09:00 TW, clock-out: 17:00 TW) -> 8.0 paid hours
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

  // Day 3: ABSENT -> Unpaid
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

  // Day 4: LEAVE -> Unpaid
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

  // 3. Spawn Next.js server
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

    // A. Verify Unauthenticated access is rejected (401)
    console.log("🔒 A. Testing Unauthenticated Access to Excel Export...");
    const unauthRes = await fetch(`${apiExportUrl}?year=2026&month=6`);
    assert(unauthRes.status === 401, "GET /api/admin/payroll/export without auth returns 401 Unauthorized");

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

    // B. Verify All Employees Excel Export
    console.log("\n📊 B. Testing Authenticated Export (All Employees)...");
    const exportRes = await fetch(`${apiExportUrl}?year=2026&month=6`, {
      headers: { Cookie: tokenCookie }
    });
    assert(exportRes.status === 200, "GET /api/admin/payroll/export returns 200 OK");
    assert(
      exportRes.headers.get("Content-Type") === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Type is correct for Excel workbook"
    );

    // Verify filename format
    const contentDisp = exportRes.headers.get("Content-Disposition") || "";
    const expectedFilenameStr = "三峽八方雲集國際店_薪資報表_2026_06.xlsx";
    const encodedFilename = encodeURIComponent(expectedFilenameStr);
    assert(contentDisp.includes(encodedFilename), `Content-Disposition filename format correct, expected: ${expectedFilenameStr}`);

    // Parse arrayBuffer with xlsx
    const arrayBuffer = await exportRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Assert workbook has exactly 3 sheets
    assert(workbook.SheetNames.length === 3, `Workbook has exactly 3 sheets, got ${workbook.SheetNames.length}`);
    assert(workbook.SheetNames[0] === "薪資總表", `Sheet 1 name is '薪資總表', got ${workbook.SheetNames[0]}`);
    assert(workbook.SheetNames[1] === "出勤明細", `Sheet 2 name is '出勤明細', got ${workbook.SheetNames[1]}`);
    assert(workbook.SheetNames[2] === "摘要", `Sheet 3 name is '摘要', got ${workbook.SheetNames[2]}`);

    // Verify Sheet 1 (薪資總表) content
    const ws1 = workbook.Sheets["薪資總表"];
    const sheet1Data = XLSX.utils.sheet_to_json(ws1) as any[];
    assert(sheet1Data.length === 2, `薪資總表 has exactly 2 rows of employee summaries, got ${sheet1Data.length}`);

    // Verify sorting (highest salary first: A: 3800 > B: 2100)
    const row0 = sheet1Data[0];
    assert(row0["員工編號"] === employeeCodeA, `Row 0 is employee A, got ${row0["員工編號"]}`);
    assert(row0["員工姓名"] === employeeNameA, `Row 0 name is ${employeeNameA}`);
    assert(row0["時薪 (NTD)"] === 190, `Row 0 hourlyRate is 190`);
    assert(row0["出勤天數"] === 3, `Row 0 worked days is 3`);
    assert(row0["本月總工時"] === 20.0, `Row 0 totalHours is 20.0`);
    assert(row0["本月薪資 (NTD)"] === 3800, `Row 0 monthlySalary is 3800`);

    const row1 = sheet1Data[1];
    assert(row1["員工編號"] === employeeCodeB, `Row 1 is employee B, got ${row1["員工編號"]}`);
    assert(row1["員工姓名"] === employeeNameB, `Row 1 name is ${employeeNameB}`);
    assert(row1["時薪 (NTD)"] === 210, `Row 1 hourlyRate is 210`);
    assert(row1["出勤天數"] === 1, `Row 1 worked days is 1`);
    assert(row1["本月總工時"] === 10.0, `Row 1 totalHours is 10.0`);
    assert(row1["本月薪資 (NTD)"] === 2100, `Row 1 monthlySalary is 2100`);

    // Verify Sheet 2 (出勤明細) content
    const ws2 = workbook.Sheets["出勤明細"];
    const sheet2Data = XLSX.utils.sheet_to_json(ws2) as any[];
    // A has 5 records, B has 1 record -> total 6 rows
    assert(sheet2Data.length === 6, `出勤明細 has exactly 6 rows of daily records, got ${sheet2Data.length}`);

    // Verify specific row fields
    const recordA1 = sheet2Data.find(r => r["員工編號"] === employeeCodeA && r["日期"] === "2026-06-01");
    assert(!!recordA1, "Found daily breakdown row for employee A on June 1");
    assert(recordA1["上班時間"] === "09:00", "June 1 clock-in time matches 09:00");
    assert(recordA1["下班時間"] === "17:00", "June 1 clock-out time matches 17:00");
    assert(recordA1["工時 (小時)"] === 8.0, "June 1 work hours matches 8.0");
    assert(recordA1["出勤狀態"] === "正常", "June 1 attendance status matches 正常");
    assert(recordA1["備註"] === "第一天正常", "June 1 note matches");

    const recordA3 = sheet2Data.find(r => r["員工編號"] === employeeCodeA && r["日期"] === "2026-06-03");
    assert(!!recordA3, "Found daily breakdown row for employee A on June 3");
    assert(recordA3["上班時間"] === "未打卡", "June 3 absent shows '未打卡'");
    assert(recordA3["工時 (小時)"] === 0, "June 3 absent shows 0 hours");
    assert(recordA3["出勤狀態"] === "缺勤", "June 3 absent status matches 缺勤");

    // Verify Sheet 3 (摘要) content
    const ws3 = workbook.Sheets["摘要"];
    const sheet3Data = XLSX.utils.sheet_to_json(ws3) as any[];
    // Keys are '項目' and '數值'
    const getVal = (item: string) => sheet3Data.find(r => r["項目"] === item)?.["數值"];
    assert(getVal("年份") === "2026 年", `年份 is 2026 年, got ${getVal("年份")}`);
    assert(getVal("月份") === "6 月", `月份 is 6 月, got ${getVal("月份")}`);
    assert(Number(getVal("本月總薪資 (NTD)")) === 5900, `本月總薪資 is 5900, got ${getVal("本月總薪資 (NTD)")}`);
    assert(Number(getVal("總工時 (小時)")) === 30, `總工時 is 30, got ${getVal("總工時 (小時)")}`);
    assert(Number(getVal("員工人數")) === 2, `員工人數 is 2, got ${getVal("員工人數")}`);
    assert(Number(getVal("平均薪資 (NTD)")) === 2950, `平均薪資 is 2950, got ${getVal("平均薪資 (NTD)")}`);
    assert(!!getVal("匯出時間 (台北時間)"), "匯出時間 is present");

    // C. Verify Employee-specific Excel Export
    console.log("\n👤 C. Testing Employee-Specific Export...");
    const singleExportRes = await fetch(`${apiExportUrl}?year=2026&month=6&employeeId=${employeeA.id}`, {
      headers: { Cookie: tokenCookie }
    });
    assert(singleExportRes.status === 200, "GET /api/admin/payroll/export with employeeId returns 200 OK");
    
    // Verify filename contains employee name
    const singleContentDisp = singleExportRes.headers.get("Content-Disposition") || "";
    const expectedSingleFilenameStr = `三峽八方雲集國際店_薪資報表_${employeeNameA}_2026_06.xlsx`;
    const encodedSingleFilename = encodeURIComponent(expectedSingleFilenameStr);
    assert(singleContentDisp.includes(encodedSingleFilename), `Content-Disposition filename format correct for single employee, expected: ${expectedSingleFilenameStr}`);

    const singleArrayBuffer = await singleExportRes.arrayBuffer();
    const singleBuffer = Buffer.from(singleArrayBuffer);
    const singleWorkbook = XLSX.read(singleBuffer, { type: "buffer" });

    // Assert employee-specific workbook sheets count
    assert(singleWorkbook.SheetNames.length === 3, "Employee-specific workbook has exactly 3 sheets");

    // Verify Sheet 1 (薪資總表) has only Employee A
    const sw1 = singleWorkbook.Sheets["薪資總表"];
    const s1Data = XLSX.utils.sheet_to_json(sw1) as any[];
    assert(s1Data.length === 1, `Employee-specific 薪資總表 has exactly 1 row, got ${s1Data.length}`);
    assert(s1Data[0]["員工編號"] === employeeCodeA, "Row contains Employee A");

    // Verify Sheet 2 (出勤明細) has only Employee A's 5 records
    const sw2 = singleWorkbook.Sheets["出勤明細"];
    const s2Data = XLSX.utils.sheet_to_json(sw2) as any[];
    assert(s2Data.length === 5, `Employee-specific 出勤明細 has exactly 5 rows, got ${s2Data.length}`);
    assert(s2Data.every(r => r["員工編號"] === employeeCodeA), "All daily records belong to Employee A");

    // Verify Sheet 3 (摘要) stats are specific to Employee A
    const sw3 = singleWorkbook.Sheets["摘要"];
    const s3Data = XLSX.utils.sheet_to_json(sw3) as any[];
    const getSingleVal = (item: string) => s3Data.find(r => r["項目"] === item)?.["數值"];
    assert(Number(getSingleVal("本月總薪資 (NTD)")) === 3800, `Employee A's monthly salary cost is 3800, got ${getSingleVal("本月總薪資 (NTD)")}`);
    assert(Number(getSingleVal("總工時 (小時)")) === 20.0, `Employee A's hours is 20.0, got ${getSingleVal("總工時 (小時)")}`);
    assert(Number(getSingleVal("員工人數")) === 1, `Employee count is 1, got ${getSingleVal("員工人數")}`);
    assert(Number(getSingleVal("平均薪資 (NTD)")) === 3800, `Average salary is 3800, got ${getSingleVal("平均薪資 (NTD)")}`);

    testSuccess = true;
    console.log("\n🎉 All Phase 7 Excel Export Tests Passed successfully!");
  } catch (error: any) {
    console.error("\n❌ Phase 7 Excel Export integration tests failed!");
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
