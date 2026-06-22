import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "帳號長度必須至少為 3 個字元")
    .max(50, "帳號長度不可超過 50 個字元"),
  password: z
    .string()
    .min(6, "密碼長度必須至少為 6 個字元")
    .max(100, "密碼長度不可超過 100 個字元"),
});

export type LoginInput = z.infer<typeof loginSchema>;
