import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const timeStringSchema = z
  .string()
  .trim()
  .regex(timeRegex, "Thời gian phải có định dạng HH:mm hoặc HH:mm:ss");

export const shiftInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Mã ca không được để trống")
      .max(100, "Mã ca tối đa 100 ký tự"),
    title: z
      .string()
      .trim()
      .min(1, "Tên ca không được để trống")
      .max(500, "Tên ca tối đa 500 ký tự"),
    description: z
      .string()
      .trim()
      .max(2000, "Mô tả tối đa 2000 ký tự")
      .default(""),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
    endDayOffset: z.coerce
      .number()
      .int()
      .min(0, "endDayOffset phải là 0 hoặc 1")
      .max(1, "endDayOffset phải là 0 hoặc 1")
      .default(0),
    breakMinutes: z.coerce
      .number()
      .int()
      .min(0, "Thời gian nghỉ không được âm")
      .default(0),
    lateGraceMinutes: z.coerce
      .number()
      .int()
      .min(0, "Dung sai đi muộn không được âm")
      .default(0),
    earlyLeaveGraceMinutes: z.coerce
      .number()
      .int()
      .min(0, "Dung sai về sớm không được âm")
      .default(0),
    standardUnits: z.coerce
      .number()
      .positive("Định mức công phải lớn hơn 0")
      .max(9999.99)
      .default(1),
    isActive: z.boolean().default(true),
  })
  .strict();

export const shiftUpdateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Mã ca không được để trống")
      .max(100, "Mã ca tối đa 100 ký tự")
      .optional(),
    title: z
      .string()
      .trim()
      .min(1, "Tên ca không được để trống")
      .max(500, "Tên ca tối đa 500 ký tự")
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, "Mô tả tối đa 2000 ký tự")
      .optional(),
    startTime: timeStringSchema.optional(),
    endTime: timeStringSchema.optional(),
    endDayOffset: z.coerce.number().int().min(0).max(1).optional(),
    breakMinutes: z.coerce
      .number()
      .int()
      .min(0, "Thời gian nghỉ không được âm")
      .optional(),
    lateGraceMinutes: z.coerce
      .number()
      .int()
      .min(0, "Dung sai đi muộn không được âm")
      .optional(),
    earlyLeaveGraceMinutes: z.coerce
      .number()
      .int()
      .min(0, "Dung sai về sớm không được âm")
      .optional(),
    standardUnits: z.coerce
      .number()
      .positive("Định mức công phải lớn hơn 0")
      .max(9999.99)
      .optional(),
    isActive: z.boolean().optional(),
    version: z.number().int().positive("Version phải là số nguyên dương"),
  })
  .strict();

export const shiftListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1, "Trang phải từ 1").default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1, "Kích thước trang phải từ 1")
      .max(100, "Kích thước trang tối đa 100")
      .default(20),
    q: z.string().trim().max(500).optional(),
    isActive: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .transform((val) => (typeof val === "boolean" ? val : val === "true"))
      .optional(),
    sortBy: z
      .enum(["createdAt", "code", "title", "startTime", "endTime"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type ShiftInput = z.infer<typeof shiftInputSchema>;
export type ShiftUpdateInput = z.infer<typeof shiftUpdateSchema>;
export type ShiftListQuery = z.infer<typeof shiftListQuerySchema>;

export interface ShiftDto {
  id: string;
  tenantId: string;
  code: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  endDayOffset: number;
  breakMinutes: number;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  standardUnits: number;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftListResponse {
  items: ShiftDto[];
  total: number;
  page: number;
  pageSize: number;
}
