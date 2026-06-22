import { z } from "zod";

export const createEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .min(1, "請輸入員工編號")
    .regex(/^[A-Z0-9]+$/, "員工編號格式錯誤，必須為大寫英文字母與數字 (例如: A001, PT01)")
    .max(20, "員工編號不可超過 20 個字元"),
  name: z
    .string()
    .min(1, "請輸入員工姓名")
    .max(50, "員工姓名不可超過 50 個字元")
    .transform((val) => val.trim()),
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  hourlyRate: z
    .number({ message: "時薪必須為數字" })
    .nonnegative("時薪不可為負數"),
  pin: z
    .string()
    .length(4, "密碼長度必須為 4 位數")
    .regex(/^\d{4}$/, "密碼必須為 4 位純數字"),
});

export const updateEmployeeSchema = z.object({
  name: z
    .string()
    .min(1, "請輸入員工姓名")
    .max(50, "員工姓名不可超過 50 個字元")
    .transform((val) => val.trim()),
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  hourlyRate: z
    .number({ message: "時薪必須為數字" })
    .nonnegative("時薪不可為負數"),
});

export const updatePinSchema = z.object({
  pin: z
    .string()
    .length(4, "密碼長度必須為 4 位數")
    .regex(/^\d{4}$/, "密碼必須為 4 位純數字"),
});

export const updateStatusSchema = z.object({
  isActive: z.boolean({ message: "必須提供啟用狀態" }),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type UpdatePinInput = z.infer<typeof updatePinSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
