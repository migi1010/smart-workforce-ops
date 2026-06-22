import "dotenv/config";

import { hashPassword, comparePassword, signJWT, verifyJWT } from "../src/lib/auth";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log("🧪 Running Foundation & Environment Verification Tests...\n");

  // 1. Verify Environment Variables
  console.log("📋 1. Checking Environment Variables...");
  assert(!!process.env.DATABASE_URL, "DATABASE_URL exists in process.env");
  assert(!!process.env.JWT_SECRET, "JWT_SECRET exists in process.env");
  assert(!!process.env.INIT_ADMIN_USERNAME, "INIT_ADMIN_USERNAME exists in process.env");
  assert(!!process.env.INIT_ADMIN_PASSWORD, "INIT_ADMIN_PASSWORD exists in process.env");

  // Verify env.ts Zod validation compiles and runs
  try {
    const { env } = await import("../src/lib/env");
    assert(env.DATABASE_URL === process.env.DATABASE_URL, "env.ts parses DATABASE_URL correctly");
    assert(env.JWT_SECRET === process.env.JWT_SECRET, "env.ts parses JWT_SECRET correctly");
  } catch (error: any) {
    assert(false, `env.ts Zod validation threw an error: ${error.message}`);
  }

  // 2. Verify Authentication Utilities
  console.log("\n🔑 2. Checking Auth Utilities...");
  
  const testPassword = "MyTestPassword123!";
  const wrongPassword = "WrongPassword123!";
  
  // Password hashing
  const hash = await hashPassword(testPassword);
  assert(!!hash, "Password hashing generated a valid hash string");
  assert(hash !== testPassword, "Hash is not plaintext password");
  
  // Password comparison
  const isMatch = await comparePassword(testPassword, hash);
  assert(isMatch === true, "Password comparison matches correct password");
  
  const isMismatch = await comparePassword(wrongPassword, hash);
  assert(isMismatch === false, "Password comparison fails wrong password");

  // JWT operations
  const payload = { userId: "test-user-id-123", username: "testadmin" };
  const token = await signJWT(payload);
  assert(!!token, "JWT signing generated a token string");
  
  const verifiedPayload = await verifyJWT(token);
  assert(!!verifiedPayload, "JWT token verification succeeds");
  assert(verifiedPayload?.userId === payload.userId, "Verified JWT contains correct userId");
  assert(verifiedPayload?.username === payload.username, "Verified JWT contains correct username");
  
  // Invalid JWT
  const tamperedToken = token + "modified";
  const invalidPayload = await verifyJWT(tamperedToken);
  assert(invalidPayload === null, "Tampered JWT fails verification and returns null");

  const malformedPayload = await verifyJWT("invalid-token-string");
  assert(malformedPayload === null, "Malformed JWT string fails verification and returns null");

  console.log("\n🎉 All Foundation Verification Tests Passed successfully!");
}

runTests().catch((err) => {
  console.error("💥 Test execution failed:", err);
  process.exit(1);
});
