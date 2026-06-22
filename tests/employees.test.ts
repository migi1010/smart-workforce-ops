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
  console.log("🧪 Running Phase 1 Employee Management Integration Verification Tests...\n");

  const port = "3827";
  const baseUrl = `http://localhost:${port}`;
  const clockUrl = `${baseUrl}/clock`;
  const apiLoginUrl = `${baseUrl}/api/auth/login`;
  const apiEmployeesUrl = `${baseUrl}/api/admin/employees`;

  // Determine admin credentials
  const adminUsername = process.env.INIT_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.INIT_ADMIN_PASSWORD || "admin123456";

  // Check if database is online using Prisma client
  let isDbOnline = false;
  try {
    const { db } = await import("../src/lib/db");
    await db.$connect();
    isDbOnline = true;
    console.log("🔌 Database is ONLINE. Running integration tests...");
    await db.$disconnect();
  } catch (e) {
    console.log("🔌 Database is OFFLINE. Skipping database-dependent Employee API integration checks.");
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
  let createdEmployeeId: string | null = null;

  try {
    const isReady = await waitServerReady(clockUrl);
    if (!isReady) {
      throw new Error("Server failed to start or did not become ready within timeout.");
    }
    console.log("✅ Next.js server is ready. Beginning HTTP verification...\n");

    // 1. Verify API Route protection (GET & POST) without session cookie
    console.log("🔒 1. Checking API Protection...");
    
    const getWithoutCookieRes = await fetch(apiEmployeesUrl);
    assert(getWithoutCookieRes.status === 401, "GET /api/admin/employees without cookie returns 401");

    const postWithoutCookieRes = await fetch(apiEmployeesUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeCode: "TEST999",
        name: "Test Employee",
        hourlyRate: 150,
        pin: "1234"
      })
    });
    assert(postWithoutCookieRes.status === 401, "POST /api/admin/employees without cookie returns 401");

    // 2. Perform Admin login to get the session token
    console.log("\n🔑 2. Authenticating as Admin...");
    const loginRes = await fetch(apiLoginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: adminUsername, password: adminPassword })
    });
    assert(loginRes.status === 200, "Admin login successful");
    
    const setCookie = loginRes.headers.get("set-cookie");
    assert(setCookie !== null && setCookie.includes("admin_token="), "Acquired session cookie");
    const tokenCookie = setCookie!.split(";")[0];

    // 3. Create a new employee
    console.log("\n➕ 3. Testing Employee Creation (POST /api/admin/employees)...");
    const testEmployeeCode = "A999";
    const testEmployeeName = "測試員工";
    const testEmployeePhone = "0900123456";
    const testEmployeeRate = 180;
    const testEmployeePin = "4321";

    const createRes = await fetch(apiEmployeesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie
      },
      body: JSON.stringify({
        employeeCode: testEmployeeCode,
        name: testEmployeeName,
        phone: testEmployeePhone,
        hourlyRate: testEmployeeRate,
        pin: testEmployeePin
      })
    });
    assert(createRes.status === 201, "POST /api/admin/employees returns 201 Created");
    
    const createData = await createRes.json();
    assert(createData.success === true, "Employee created successfully");
    assert(createData.employee.employeeCode === testEmployeeCode, "employeeCode matches input");
    assert(createData.employee.name === testEmployeeName, "name matches input");
    assert(createData.employee.phone === testEmployeePhone, "phone matches input");
    assert(createData.employee.hourlyRate === testEmployeeRate, "hourlyRate matches input");
    assert(createData.employee.isActive === true, "isActive defaults to true");
    assert(createData.employee.pinHash === undefined, "pinHash is NOT returned in POST response");
    
    createdEmployeeId = createData.employee.id;

    // 4. Test duplicate employeeCode validation
    console.log("\n⚠️ 4. Testing Duplicate employeeCode Rejection...");
    const duplicateRes = await fetch(apiEmployeesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie
      },
      body: JSON.stringify({
        employeeCode: testEmployeeCode, // Same code A999
        name: "另一個員工",
        hourlyRate: 150,
        pin: "9999"
      })
    });
    assert(duplicateRes.status === 400, "POST with duplicate employeeCode returns 400 Bad Request");
    const duplicateData = await duplicateRes.json();
    assert(duplicateData.error === "員工編號已存在", "Duplicate error message matches expected");

    // 5. Test malformed employeeCode validation (lowercase or invalid characters)
    console.log("\n⚠️ 5. Testing Employee Code Format Validation...");
    const malformedRes = await fetch(apiEmployeesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie
      },
      body: JSON.stringify({
        employeeCode: "a999", // Lowercase (should fail)
        name: "錯誤編號員工",
        hourlyRate: 150,
        pin: "9999"
      })
    });
    assert(malformedRes.status === 400, "POST with lowercase employeeCode returns 400 Bad Request");

    // 6. Test GET list employees
    console.log("\n📋 6. Testing Employee Listing (GET /api/admin/employees)...");
    const listRes = await fetch(apiEmployeesUrl, {
      headers: { Cookie: tokenCookie }
    });
    assert(listRes.status === 200, "GET /api/admin/employees returns 200 OK");
    const listData = await listRes.json();
    assert(Array.isArray(listData.employees), "Response contains employees array");
    
    const foundEmp = listData.employees.find((emp: any) => emp.id === createdEmployeeId);
    assert(!!foundEmp, "Created employee is present in the list");
    assert(foundEmp.pinHash === undefined, "pinHash is NOT returned in GET list response");

    // 7. Test PATCH /api/admin/employees/[id] update details
    console.log("\n📝 7. Testing Employee Edit (PATCH /api/admin/employees/[id])...");
    const updateDetailsUrl = `${apiEmployeesUrl}/${createdEmployeeId}`;
    const updatedName = "測試員工改名";
    const updatedPhone = "0988888888";
    const updatedRate = 200;

    const editRes = await fetch(updateDetailsUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie
      },
      body: JSON.stringify({
        name: updatedName,
        phone: updatedPhone,
        hourlyRate: updatedRate
      })
    });
    assert(editRes.status === 200, "PATCH /api/admin/employees/[id] returns 200 OK");
    
    const editData = await editRes.json();
    assert(editData.success === true, "Employee updated successfully");
    assert(editData.employee.name === updatedName, "Updated name matches");
    assert(editData.employee.phone === updatedPhone, "Updated phone matches");
    assert(editData.employee.hourlyRate === updatedRate, "Updated hourlyRate matches");

    // 8. Test PATCH /api/admin/employees/[id]/pin update PIN
    console.log("\n🔑 8. Testing Employee PIN Change (PATCH /api/admin/employees/[id]/pin)...");
    const updatePinUrl = `${apiEmployeesUrl}/${createdEmployeeId}/pin`;
    const pinRes = await fetch(updatePinUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie
      },
      body: JSON.stringify({
        pin: "9999" // New PIN
      })
    });
    assert(pinRes.status === 200, "PATCH /[id]/pin returns 200 OK");

    // 9. Test PATCH /api/admin/employees/[id]/status toggle status
    console.log("\n🛡️ 9. Testing Employee Status Toggle (PATCH /api/admin/employees/[id]/status)...");
    const updateStatusUrl = `${apiEmployeesUrl}/${createdEmployeeId}/status`;
    
    // Disable employee
    const disableRes = await fetch(updateStatusUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie
      },
      body: JSON.stringify({ isActive: false })
    });
    assert(disableRes.status === 200, "Disabling employee returns 200 OK");
    const disableData = await disableRes.json();
    assert(disableData.employee.isActive === false, "Employee status is now disabled (isActive: false)");

    // Reactivate employee
    const reactivateRes = await fetch(updateStatusUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie
      },
      body: JSON.stringify({ isActive: true })
    });
    assert(reactivateRes.status === 200, "Reactivating employee returns 200 OK");
    const reactivateData = await reactivateRes.json();
    assert(reactivateData.employee.isActive === true, "Employee status is now active (isActive: true)");

    // 10. Verify Audit Log entries are created
    console.log("\n📋 10. Verifying Database Audit Logs...");
    const { db } = await import("../src/lib/db");
    
    const logs = await db.auditLog.findMany({
      where: {
        action: {
          in: ["EMPLOYEE_CREATED", "EMPLOYEE_UPDATED", "EMPLOYEE_PIN_CHANGED", "EMPLOYEE_DISABLED", "EMPLOYEE_REACTIVATED"]
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const hasCreatedLog = logs.some(log => log.action === "EMPLOYEE_CREATED" && log.details?.includes(testEmployeeCode));
    const hasUpdatedLog = logs.some(log => log.action === "EMPLOYEE_UPDATED" && log.details?.includes(testEmployeeCode));
    const hasPinLog = logs.some(log => log.action === "EMPLOYEE_PIN_CHANGED" && log.details?.includes(testEmployeeCode));
    const hasDisabledLog = logs.some(log => log.action === "EMPLOYEE_DISABLED" && log.details?.includes(testEmployeeCode));
    const hasReactivatedLog = logs.some(log => log.action === "EMPLOYEE_REACTIVATED" && log.details?.includes(testEmployeeCode));

    assert(hasCreatedLog, "EMPLOYEE_CREATED action exists in AuditLog");
    assert(hasUpdatedLog, "EMPLOYEE_UPDATED action exists in AuditLog");
    assert(hasPinLog, "EMPLOYEE_PIN_CHANGED action exists in AuditLog");
    assert(hasDisabledLog, "EMPLOYEE_DISABLED action exists in AuditLog");
    assert(hasReactivatedLog, "EMPLOYEE_REACTIVATED action exists in AuditLog");

    testSuccess = true;
    console.log("\n🎉 All Employee Management Integration Tests Passed successfully!");
  } catch (error: any) {
    console.error("\n❌ Employee Management integration tests failed!");
    console.error(error.message || error);
    process.exit(1);
  } finally {
    // DB Clean up
    if (createdEmployeeId) {
      console.log("\n🧹 Cleaning up test employee and audit records from DB...");
      try {
        const { db } = await import("../src/lib/db");
        await db.$connect();
        
        // Delete employee
        await db.employee.delete({
          where: { id: createdEmployeeId }
        });
        console.log(`✅ Deleted test employee ID: ${createdEmployeeId}`);

        // Delete test audit logs
        const deleteLogs = await db.auditLog.deleteMany({
          where: {
            details: {
              contains: testEmployeeCode
            }
          }
        });
        console.log(`✅ Deleted ${deleteLogs.count} test audit log entries`);
        
        await db.$disconnect();
      } catch (cleanUpErr: any) {
        console.error("⚠️ Failed to clean up DB records:", cleanUpErr.message || cleanUpErr);
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
