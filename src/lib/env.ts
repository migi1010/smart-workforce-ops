import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters long"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  INIT_ADMIN_USERNAME: z.string().min(3, "INIT_ADMIN_USERNAME must be at least 3 characters long"),
  INIT_ADMIN_PASSWORD: z.string().min(6, "INIT_ADMIN_PASSWORD must be at least 6 characters long"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL").default("http://localhost:3000"),
});

// We validate the environment variables. If validation fails, we print a descriptive error and throw.
const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables configuration:");
    result.error.issues.forEach((err) => {
      console.error(`  - ${err.path.join(".")}: ${err.message}`);
    });
    throw new Error("Invalid environment variables");
  }

  const data = result.data;

  // Warning check for production deployment
  if (data.NODE_ENV === "production") {
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!rawAppUrl) {
      console.warn("⚠️ [WARN] NEXT_PUBLIC_APP_URL is missing in production. Defaulting to http://localhost:3000");
    } else if (rawAppUrl.includes("localhost") || rawAppUrl.includes("127.0.0.1")) {
      console.warn(`⚠️ [WARN] NEXT_PUBLIC_APP_URL is set to localhost ('${rawAppUrl}') in production. Please set this to the actual production deployment URL.`);
    }
  }

  return data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
