import "dotenv/config";

import { db } from "../src/lib/db";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log("🧪 Running Database Integration Verification Tests...\n");

  try {
    // 1. Verify Prisma Client can connect
    console.log("🔌 1. Testing Connection to PostgreSQL database...");
    await db.$connect();
    console.log("✅ Database connection established successfully.");

    // 2. Verify User model is queryable
    console.log("\n👤 2. Checking 'User' table...");
    const adminCount = await db.user.count();
    console.log(`✅ User model exists and contains ${adminCount} administrator(s).`);

    // Verify seeded admin user exists (if any)
    const adminUser = await db.user.findFirst();
    if (adminUser) {
      console.log(`✅ Successfully queried admin user: ${adminUser.username} (${adminUser.name})`);
    } else {
      console.log(`⚠️ Warning: No admin users found in the database. Ensure database has been seeded.`);
    }

    // 3. Verify AuditLog model CRUD
    console.log("\n📝 3. Checking 'AuditLog' table and CRUD operations...");
    const testAction = "TEST_INTEGRATION_VERIFICATION";
    const testDetails = `Test log created at ${new Date().toISOString()}`;
    const testIp = "127.0.0.1";

    // Create AuditLog record
    const createdLog = await db.auditLog.create({
      data: {
        action: testAction,
        details: testDetails,
        ipAddress: testIp,
        adminId: adminUser?.id || null,
      },
    });
    assert(!!createdLog.id, "Successfully created a new AuditLog record");

    // Read back AuditLog record
    const retrievedLog = await db.auditLog.findUnique({
      where: { id: createdLog.id },
    });
    
    assert(!!retrievedLog, "Successfully retrieved the created AuditLog record");
    assert(retrievedLog?.action === testAction, "AuditLog action matches");
    assert(retrievedLog?.details === testDetails, "AuditLog details match");
    assert(retrievedLog?.ipAddress === testIp, "AuditLog ipAddress matches");
    assert(retrievedLog?.adminId === (adminUser?.id || null), "AuditLog adminId matches");

    // Delete AuditLog record (Clean up)
    await db.auditLog.delete({
      where: { id: createdLog.id },
    });
    
    const checkDeleted = await db.auditLog.findUnique({
      where: { id: createdLog.id },
    });
    assert(checkDeleted === null, "Successfully cleaned up (deleted) the test AuditLog record");

    console.log("\n🎉 All Database Verification Tests Passed successfully!");
  } catch (error: any) {
    console.error("\n❌ Database connection/query failed!");
    console.error("Please verify that your DATABASE_URL in the .env file is correct and the PostgreSQL server is running.");
    console.error("Error details:", error.message || error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

runTests().catch((err) => {
  console.error("💥 Test execution failed:", err);
  process.exit(1);
});
