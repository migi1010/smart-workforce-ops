import { z } from "zod";

const attendanceStatusSchema = z.enum(["NORMAL", "LATE", "EARLY_LEAVE", "ABSENT", "LEAVE"], {
  message: "無效的出勤狀態",
});

export const createAttendanceSchema = z.object({
  employeeId: z.string().uuid("無效的員工 ID"),
  date: z.string().min(1, "請提供日期"),
  clockInTime: z.string().datetime({ message: "上班時間格式無效" }).optional().nullable(),
  clockOutTime: z.string().datetime({ message: "下班時間格式無效" }).optional().nullable(),
  status: attendanceStatusSchema,
  note: z.string().optional().nullable(),
});

export const updateAttendanceSchema = z.object({
  clockInTime: z.string().datetime({ message: "上班時間格式無效" }).optional().nullable(),
  clockOutTime: z.string().datetime({ message: "下班時間格式無效" }).optional().nullable(),
  status: attendanceStatusSchema,
  note: z.string().optional().nullable(),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
