import { z } from "zod";

export const updateWorkplaceSchema = z
  .object({
    name: z
      .string()
      .min(1, "請輸入店家名稱")
      .max(100, "名稱長度不可超過 100 個字元")
      .transform((val) => val.trim()),
    address: z
      .string()
      .min(1, "請輸入工作地地址")
      .max(200, "地址長度不可超過 200 個字元")
      .transform((val) => val.trim()),
    latitude: z
      .number({ message: "緯度必須為數字" })
      .min(-90, "緯度必須介於 -90 至 90 度之間")
      .max(90, "緯度必須介於 -90 至 90 度之間"),
    longitude: z
      .number({ message: "經度必須為數字" })
      .min(-180, "經度必須介於 -180 至 180 度之間")
      .max(180, "經度必須介於 -180 至 180 度之間"),
    allowedRadiusMeters: z
      .number({ message: "允許半徑必須為數字" })
      .positive("允許半徑必須大於 0 米"),
    warningRadiusMeters: z
      .number({ message: "警告半徑必須為數字" })
      .positive("警告半徑必須大於 0 米"),
  })
  .refine((data) => data.warningRadiusMeters > data.allowedRadiusMeters, {
    message: "警告打卡半徑必須大於允許打卡半徑",
    path: ["warningRadiusMeters"],
  });

export type UpdateWorkplaceInput = z.infer<typeof updateWorkplaceSchema>;
