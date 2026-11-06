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

const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function isValidCalendarDate(str: string): boolean {
  if (!dateRegex.test(str)) return false;
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const createShiftAssignmentSchema = z
  .object({
    assigneeId: z
      .string()
      .trim()
      .min(1, "assigneeId không được để trống")
      .max(100, "assigneeId tối đa 100 ký tự")
      .optional(),
    employeeId: z
      .string()
      .trim()
      .min(1, "employeeId không được để trống")
      .max(100, "employeeId tối đa 100 ký tự")
      .optional(),
    date: z
      .string()
      .trim()
      .regex(dateRegex, "Ngày phân công phải có định dạng YYYY-MM-DD")
      .optional(),
    startDate: z
      .string()
      .trim()
      .regex(dateRegex, "Ngày bắt đầu phải có định dạng YYYY-MM-DD")
      .optional(),
    endDate: z
      .string()
      .trim()
      .regex(dateRegex, "Ngày kết thúc phải có định dạng YYYY-MM-DD")
      .optional(),
    workMode: z.enum(["AT_OFFICE", "REMOTE", "ON_DUTY"]).optional(),
    workLocation: z.string().trim().max(500).optional(),
    description: z.string().trim().max(2000).optional(),
    title: z.string().trim().max(500).optional(),
    timeZone: z
      .string()
      .trim()
      .max(100)
      .refine(isValidTimeZone, "Múi giờ (timeZone) không hợp lệ")
      .default("Asia/Ho_Chi_Minh"),
  })
  .strict()
  .refine((data) => Boolean(data.assigneeId || data.employeeId), {
    message: "Phải cung cấp thông tin nhân viên (assigneeId hoặc employeeId)",
    path: ["assigneeId"],
  })
  .refine(
    (data) => {
      if (
        data.assigneeId &&
        data.employeeId &&
        data.assigneeId !== data.employeeId
      ) {
        return false;
      }
      return true;
    },
    {
      message: "assigneeId và employeeId không được mang giá trị khác nhau",
      path: ["employeeId"],
    },
  )
  .refine((data) => Boolean(data.date || data.startDate), {
    message: "Phải cung cấp ngày phân công (date hoặc startDate)",
    path: ["date"],
  })
  .refine(
    (data) => {
      if (data.date && data.startDate && data.date !== data.startDate) {
        return false;
      }
      return true;
    },
    {
      message: "date và startDate không được mang giá trị khác nhau",
      path: ["startDate"],
    },
  )
  .refine(
    (data) => {
      const d = data.date || data.startDate;
      return d ? isValidCalendarDate(d) : true;
    },
    {
      message: "Ngày phân công không hợp lệ trên lịch",
      path: ["date"],
    },
  )
  .refine(
    (data) => {
      return data.endDate ? isValidCalendarDate(data.endDate) : true;
    },
    {
      message: "Ngày kết thúc không hợp lệ trên lịch",
      path: ["endDate"],
    },
  );

export type CreateShiftAssignmentInput = z.infer<
  typeof createShiftAssignmentSchema
>;

export interface ShiftAssignmentDto {
  id: string;
  tenantId: string;
  shiftId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  allDay: boolean;
  status: string;
  priority: string;
  assigneeId: string;
  workMode: string | null;
  workLocation: string | null;
  breakMinutes: number;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  standardUnits: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

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

export const shiftScheduleQuerySchema = z
  .object({
    from: z
      .string()
      .trim()
      .regex(dateRegex, "Ngày bắt đầu (from) phải có định dạng YYYY-MM-DD")
      .optional(),
    startDate: z
      .string()
      .trim()
      .regex(dateRegex, "Ngày bắt đầu (startDate) phải có định dạng YYYY-MM-DD")
      .optional(),
    to: z
      .string()
      .trim()
      .regex(dateRegex, "Ngày kết thúc (to) phải có định dạng YYYY-MM-DD")
      .optional(),
    endDate: z
      .string()
      .trim()
      .regex(dateRegex, "Ngày kết thúc (endDate) phải có định dạng YYYY-MM-DD")
      .optional(),
    assigneeId: z.string().trim().min(1).max(100).optional(),
    employeeId: z.string().trim().min(1).max(100).optional(),
    shiftId: z.string().trim().max(100).optional(),
    status: z
      .enum(["todo", "in_progress", "completed", "cancelled"])
      .optional(),
    workMode: z.enum(["AT_OFFICE", "REMOTE", "ON_DUTY"]).optional(),
    includeArchived: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .transform((val) => (typeof val === "boolean" ? val : val === "true"))
      .default(false),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(500).default(100),
  })
  .strict()
  .refine((data) => Boolean(data.from || data.startDate), {
    message: "Phải cung cấp ngày bắt đầu (from hoặc startDate)",
    path: ["from"],
  })
  .refine((data) => Boolean(data.to || data.endDate), {
    message: "Phải cung cấp ngày kết thúc (to hoặc endDate)",
    path: ["to"],
  })
  .refine(
    (data) => {
      if (data.from && data.startDate && data.from !== data.startDate) {
        return false;
      }
      return true;
    },
    {
      message: "from và startDate không được mang giá trị khác nhau",
      path: ["startDate"],
    },
  )
  .refine(
    (data) => {
      if (data.to && data.endDate && data.to !== data.endDate) {
        return false;
      }
      return true;
    },
    {
      message: "to và endDate không được mang giá trị khác nhau",
      path: ["endDate"],
    },
  )
  .refine(
    (data) => {
      if (
        data.assigneeId &&
        data.employeeId &&
        data.assigneeId !== data.employeeId
      ) {
        return false;
      }
      return true;
    },
    {
      message: "assigneeId và employeeId không được mang giá trị khác nhau",
      path: ["employeeId"],
    },
  )
  .refine(
    (data) => {
      const f = data.from || data.startDate;
      return f ? isValidCalendarDate(f) : true;
    },
    {
      message: "Ngày bắt đầu không hợp lệ trên lịch",
      path: ["from"],
    },
  )
  .refine(
    (data) => {
      const t = data.to || data.endDate;
      return t ? isValidCalendarDate(t) : true;
    },
    {
      message: "Ngày kết thúc không hợp lệ trên lịch",
      path: ["to"],
    },
  )
  .refine(
    (data) => {
      const f = data.from || data.startDate;
      const t = data.to || data.endDate;
      if (f && t && f > t) {
        return false;
      }
      return true;
    },
    {
      message: "Ngày bắt đầu không được sau ngày kết thúc",
      path: ["from"],
    },
  );

export type ShiftScheduleQuery = z.infer<typeof shiftScheduleQuerySchema>;

export interface ShiftScheduleItemDto extends ShiftAssignmentDto {
  shift?: ShiftDto | null;
}

export interface ShiftScheduleResponse {
  from: string;
  to: string;
  items: ShiftScheduleItemDto[];
  total: number;
  page: number;
  pageSize: number;
}
