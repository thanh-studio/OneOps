
import { z } from "zod";

/* =========================================================
 * Record Input Schema
 * ======================================================= */

const recordInput = z
  .object({
    code: z.string().trim().min(1).max(100),

    name: z.string().trim().min(1).max(500),

    scope: z.string().trim().max(250).default(""),

    status: z.enum([
      "Đã lên lịch",
      "Đang diễn ra",
      "Hoàn thành",
      "Đã hủy",
    ]),

    date: z.iso.date(),

    assignee: z.string().trim().max(150).default(""),

    note: z.string().trim().max(2000).default(""),
  })
  .strict();

/* =========================================================
 * Record Patch Schema
 * ======================================================= */

const recordPatch = recordInput
  .omit({
    scope: true,
    assignee: true,
    note: true,
  })
  .partial()
  .extend({
    scope: z.string().trim().max(250).optional(),

    assignee: z.string().trim().max(150).optional(),

    note: z.string().trim().max(2000).optional(),
  });

/* =========================================================
 * List Query Schema
 * ======================================================= */

export const listQuery = z
  .object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .default(1),

    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(100),

    q: z.string().trim().max(500).optional(),

    scope: z.string().max(250).optional(),

    status: z.string().max(150).optional(),

    assignee: z.string().trim().max(150).optional(),
  })
  .strict();

/* =========================================================
 * Version Schema
 * ======================================================= */

export const versionSchema = z
  .object({
    version: z.number().int().positive(),
  })
  .strict();

/* =========================================================
 * Calendar Fields Schema
 * ======================================================= */

export const fieldsSchema = z
  .object({
    kind: z
      .enum([
        "Cuộc họp",
        "Thời gian tập trung",
        "Sự kiện",
      ])
      .optional(),

    startTime: z
      .union([
        z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        z.literal(""),
      ])
      .optional(),

    endTime: z
      .union([
        z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        z.literal(""),
      ])
      .optional(),

    location: z.string().trim().max(1000).optional(),

    attendees: z.string().trim().max(1000).optional(),
  })
  .strict();

/* =========================================================
 * Create Schema
 * ======================================================= */

export const createSchema = recordInput.extend({
  fields: fieldsSchema.default({}),
});

/* =========================================================
 * Update Schema
 * ======================================================= */

export const updateSchema = recordPatch
  .extend({
    fields: fieldsSchema.optional(),

    version: z.number().int().positive(),
  })
  .strict();

/* =========================================================
 * Record Schema
 * ======================================================= */

export const recordSchema = createSchema.extend({
  id: z.uuid(),

  module: z.literal("calendar"),

  version: z.number().int().positive(),

  createdAt: z.iso.datetime(),

  updatedAt: z.iso.datetime(),
});

/* =========================================================
 * Validated Create Schema
 * ======================================================= */

export const validatedCreateSchema = createSchema.refine(
  (value) =>
    !value.fields.startTime ||
    !value.fields.endTime ||
    value.fields.endTime > value.fields.startTime,
  {
    message: "Giờ kết thúc phải sau giờ bắt đầu",
    path: ["fields", "endTime"],
  },
);

/* =========================================================
 * Types
 * ======================================================= */

export type RecordInput = z.input<typeof createSchema>;

export type RecordOutput = z.infer<typeof recordSchema>;

export type RecordDto = RecordOutput;

export type ListQuery = z.infer<typeof listQuery>;
