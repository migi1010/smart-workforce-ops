import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

/**
 * Hashes a plaintext password using bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compares a plaintext password with a hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JWTPayload {
  userId: string;
  username: string;
}

/**
 * Signs a JWT token containing admin user payload.
 */
export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h") // Session valid for 24 hours
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT token and returns the payload or null if invalid.
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      username: payload.username as string,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Retrieves the current session admin from cookies, or null if unauthenticated.
 */
export async function getSessionAdmin(): Promise<JWTPayload | null> {
  // Await cookies() according to Next.js 15+ specifications
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  return verifyJWT(token);
}
