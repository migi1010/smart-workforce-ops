import { z } from "zod";

export const clockSubmitSchema = z.object({
  workplaceToken: z.string().min(1, "請提供工作場所 Token"),
  employeeId: z.string().uuid("無效的員工 ID"),
  pin: z.string().length(4, "密碼必須為 4 位數").regex(/^\d+$/, "密碼只能包含數字"),
  eventType: z.enum(["CLOCK_IN", "CLOCK_OUT"], {
    message: "無效的打卡類型",
  }),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export type ClockSubmitInput = z.infer<typeof clockSubmitSchema>;
