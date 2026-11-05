import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
import { Prisma, type HrShift, type HrShiftSchedule } from "@oneops/database";
import type {
  ShiftDto,
  ShiftInput,
  ShiftUpdateInput,
  ShiftListQuery,
  ShiftListResponse,
  CreateShiftAssignmentInput,
  ShiftAssignmentDto,
} from "./dto/shifts.dto.js";

function parseTimeToDate(val: string): Date {
  const parts = val.trim().split(":");
  const hh = parts[0].padStart(2, "0");
  const mm = parts[1].padStart(2, "0");
  const ss = (parts[2] || "00").padStart(2, "0");
  return new Date(`1970-01-01T${hh}:${mm}:${ss}.000Z`);
}

function formatTimeFromDate(val: Date | string): string {
  if (val instanceof Date) {
    const full = val.toISOString().slice(11, 19);
    return full.endsWith(":00") ? full.slice(0, 5) : full;
  }
  const str = String(val).trim();
  const timePart = str.includes("T") ? str.split("T")[1].slice(0, 8) : str;
  return timePart.length >= 8 && timePart.endsWith(":00")
    ? timePart.slice(0, 5)
    : timePart.slice(0, 8);
}

function formatTimeWithSeconds(val: Date | string | null): string {
  if (!val) return "00:00:00";
  if (val instanceof Date) {
    return val.toISOString().slice(11, 19);
  }
  const str = String(val).trim();
  if (str.includes("T")) {
    return str.split("T")[1].slice(0, 8);
  }
  const parts = str.split(":");
  const hh = (parts[0] || "00").padStart(2, "0");
  const mm = (parts[1] || "00").padStart(2, "0");
  const ss = (parts[2] || "00").slice(0, 2).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatDateToString(val: Date | string): string {
  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, "0");
    const d = String(val.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(dt.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function getUtcTimestamp(
  dateStr: string,
  timeStr: string,
  timeZone = "Asia/Ho_Chi_Minh",
): number {
  const parts = timeStr.trim().split(":");
  const hh = (parts[0] || "00").padStart(2, "0");
  const mm = (parts[1] || "00").padStart(2, "0");
  const ss = (parts[2] || "00").slice(0, 2).padStart(2, "0");
  const fullTime = `${hh}:${mm}:${ss}`;

  let guessMs = Date.parse(`${dateStr}T${fullTime}.000Z`);
  let dtf: Intl.DateTimeFormat;
  try {
    dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  function parseFormatted(formattedParts: Intl.DateTimeFormatPart[]): number {
    let y = 0,
      m = 0,
      d = 0,
      h = 0,
      min = 0,
      s = 0;
    for (const part of formattedParts) {
      if (part.type === "year") y = Number(part.value);
      if (part.type === "month") m = Number(part.value);
      if (part.type === "day") d = Number(part.value);
      if (part.type === "hour") {
        h = Number(part.value);
        if (h === 24) h = 0;
      }
      if (part.type === "minute") min = Number(part.value);
      if (part.type === "second") s = Number(part.value);
    }
    return Date.UTC(y, m - 1, d, h, min, s);
  }

  for (let i = 0; i < 3; i++) {
    const formattedDate = parseFormatted(dtf.formatToParts(guessMs));
    const targetLocalUtc = Date.UTC(
      Number(dateStr.slice(0, 4)),
      Number(dateStr.slice(5, 7)) - 1,
      Number(dateStr.slice(8, 10)),
      Number(hh),
      Number(mm),
      Number(ss),
    );
    const diff = targetLocalUtc - formattedDate;
    if (diff === 0) break;
    guessMs += diff;
  }
  return guessMs;
}

@Injectable()
export class ShiftsRepository {
  constructor(private readonly db: Database) {}

  private table(tx: Transaction = this.db) {
    return tx.hrShift;
  }

  private scheduleTable(tx: Transaction = this.db) {
    return tx.hrShiftSchedule;
  }

  private assignmentDto(row: HrShiftSchedule): ShiftAssignmentDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      shiftId: row.shiftId ?? "",
      title: row.title,
      description: row.description,
      startDate: formatDateToString(row.startDate),
      endDate: formatDateToString(row.endDate),
      startTime: formatTimeFromDate(row.startTime ?? ""),
      endTime: formatTimeFromDate(row.endTime ?? ""),
      timeZone: row.timeZone,
      allDay: row.allDay,
      status: row.status,
      priority: row.priority,
      assigneeId: row.assigneeId ?? "",
      workMode: row.workMode,
      workLocation: row.workLocation,
      breakMinutes: row.breakMinutes,
      lateGraceMinutes: row.lateGraceMinutes,
      earlyLeaveGraceMinutes: row.earlyLeaveGraceMinutes,
      standardUnits:
        row.standardUnits !== null ? Number(row.standardUnits) : null,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private dto(row: HrShift): ShiftDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      code: row.code,
      title: row.title,
      description: row.description,
      startTime: formatTimeFromDate(row.startTime),
      endTime: formatTimeFromDate(row.endTime),
      endDayOffset: row.endDayOffset,
      breakMinutes: row.breakMinutes,
      lateGraceMinutes: row.lateGraceMinutes,
      earlyLeaveGraceMinutes: row.earlyLeaveGraceMinutes,
      standardUnits: Number(row.standardUnits),
      isActive: row.isActive,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(
    tenantId: string,
    query: ShiftListQuery,
  ): Promise<ShiftListResponse> {
    const where: Prisma.HrShiftWhereInput = {
      tenantId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q, mode: "insensitive" } },
              { title: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return this.db.$transaction(
      async (tx) => {
        const [items, total] = await Promise.all([
          this.table(tx).findMany({
            where,
            orderBy: [{ [query.sortBy]: query.sortOrder }, { id: "asc" }],
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
          }),
          this.table(tx).count({ where }),
        ]);

        return {
          items: items.map((row) => this.dto(row)),
          total,
          page: query.page,
          pageSize: query.pageSize,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async get(
    tenantId: string,
    id: string,
    tx: Transaction = this.db,
  ): Promise<ShiftDto> {
    const row = await this.table(tx).findFirst({
      where: { id, tenantId },
    });
    if (!row) {
      throw new NotFoundException("Không tìm thấy ca làm việc.");
    }
    return this.dto(row);
  }

  async create(
    tenantId: string,
    input: ShiftInput,
    tx: Transaction = this.db,
  ): Promise<ShiftDto> {
    const code = input.code.trim();
    const codeKey = code.toUpperCase();

    try {
      const row = await this.table(tx).create({
        data: {
          tenantId,
          code,
          codeKey,
          title: input.title.trim(),
          description: input.description?.trim() || "",
          startTime: parseTimeToDate(input.startTime),
          endTime: parseTimeToDate(input.endTime),
          endDayOffset: input.endDayOffset,
          breakMinutes: input.breakMinutes,
          lateGraceMinutes: input.lateGraceMinutes,
          earlyLeaveGraceMinutes: input.earlyLeaveGraceMinutes,
          standardUnits: new Prisma.Decimal(input.standardUnits),
          isActive: input.isActive,
        },
      });
      return this.dto(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Mã ca làm việc đã tồn tại trong doanh nghiệp.",
        );
      }
      throw error;
    }
  }

  async update(
    tenantId: string,
    id: string,
    input: ShiftUpdateInput,
    tx: Transaction = this.db,
  ): Promise<ShiftDto> {
    const { version, startTime, endTime, standardUnits, code, ...rest } = input;

    const data: Prisma.HrShiftUpdateManyMutationInput = {
      ...rest,
      ...(code
        ? { code: code.trim(), codeKey: code.trim().toUpperCase() }
        : {}),
      ...(startTime ? { startTime: parseTimeToDate(startTime) } : {}),
      ...(endTime ? { endTime: parseTimeToDate(endTime) } : {}),
      ...(standardUnits !== undefined
        ? { standardUnits: new Prisma.Decimal(standardUnits) }
        : {}),
      version: { increment: 1 },
    };

    try {
      const result = await this.table(tx).updateMany({
        where: { id, tenantId, version },
        data,
      });

      if (result.count !== 1) {
        // Kiểm tra xem ca có tồn tại không
        await this.get(tenantId, id, tx);
        throw new ConflictException(
          "Bản ghi đã thay đổi hoặc xung đột phiên bản. Vui lòng tải lại trước khi lưu.",
        );
      }

      return this.get(tenantId, id, tx);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Mã ca làm việc đã tồn tại trong doanh nghiệp.",
        );
      }
      throw error;
    }
  }

  async remove(tenantId: string, id: string): Promise<void> {
    try {
      await this.db.$transaction(
        async (tx) => {
          const shift = await this.table(tx).findFirst({
            where: { id, tenantId },
            include: {
              _count: {
                select: { schedules: true },
              },
            },
          });

          if (!shift) {
            throw new NotFoundException("Không tìm thấy ca làm việc.");
          }

          if (shift._count.schedules === 0) {
            await this.table(tx).delete({
              where: { id },
            });
          } else if (shift.isActive) {
            await this.table(tx).update({
              where: { id },
              data: {
                isActive: false,
                version: { increment: 1 },
              },
            });
          }
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new ConflictException(
          "Không thể xóa ca làm việc do đã phát sinh lịch phân công.",
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        throw new ConflictException(
          "Dữ liệu đang được thay đổi. Vui lòng tải lại và thử lại.",
        );
      }
      throw error;
    }
  }

  async createAssignment(
    tenantId: string,
    shiftId: string,
    input: CreateShiftAssignmentInput,
  ): Promise<ShiftAssignmentDto> {
    try {
      return await this.db.$transaction(
        async (tx) => {
          const shift = await this.table(tx).findFirst({
            where: { id: shiftId, tenantId },
          });

          if (!shift) {
            throw new NotFoundException("Không tìm thấy ca làm việc.");
          }

          if (!shift.isActive) {
            throw new BadRequestException(
              "Không thể phân công vào ca làm việc đã bị vô hiệu hóa.",
            );
          }

          const assigneeId = (input.assigneeId || input.employeeId)!;
          const startDateStr = (input.date || input.startDate)!;
          const calculatedEndDateStr =
            shift.endDayOffset === 0
              ? startDateStr
              : addDaysToDateStr(startDateStr, 1);

          if (input.endDate && input.endDate !== calculatedEndDateStr) {
            throw new BadRequestException(
              "Ngày kết thúc không khớp với thời lượng ca làm việc.",
            );
          }
          const endDateStr = calculatedEndDateStr;

          const targetTimeZone = input.timeZone || "Asia/Ho_Chi_Minh";
          const startTimeStr = formatTimeWithSeconds(shift.startTime);
          const endTimeStr = formatTimeWithSeconds(shift.endTime);

          const newStartMs = getUtcTimestamp(
            startDateStr,
            startTimeStr,
            targetTimeZone,
          );
          const newEndMs = getUtcTimestamp(
            endDateStr,
            endTimeStr,
            targetTimeZone,
          );

          // Query candidate schedules for the same assignee within overlapping date window
          // Buffer of 2 days handles date line differences across timezones (-12h to +14h)
          const minCandidateDate = addDaysToDateStr(startDateStr, -2);
          const maxCandidateDate = addDaysToDateStr(endDateStr, 2);

          const candidates = await this.scheduleTable(tx).findMany({
            where: {
              tenantId,
              assigneeId,
              status: { not: "cancelled" },
              archivedAt: null,
              startDate: { lte: new Date(`${maxCandidateDate}T00:00:00.000Z`) },
              endDate: { gte: new Date(`${minCandidateDate}T00:00:00.000Z`) },
            },
          });

          for (const cand of candidates) {
            const exStartStr = formatDateToString(cand.startDate);
            const exEndStr = formatDateToString(cand.endDate);
            const candTimeZone = cand.timeZone || "Asia/Ho_Chi_Minh";

            let exStartMs: number;
            let exEndMs: number;

            if (cand.allDay) {
              exStartMs = getUtcTimestamp(exStartStr, "00:00:00", candTimeZone);
              exEndMs = getUtcTimestamp(
                addDaysToDateStr(exEndStr, 1),
                "00:00:00",
                candTimeZone,
              );
            } else {
              const candStart = formatTimeWithSeconds(cand.startTime);
              const candEnd = formatTimeWithSeconds(cand.endTime);
              exStartMs = getUtcTimestamp(exStartStr, candStart, candTimeZone);
              exEndMs = getUtcTimestamp(exEndStr, candEnd, candTimeZone);
            }

            if (exStartMs < newEndMs && exEndMs > newStartMs) {
              throw new ConflictException(
                "Nhân viên đã có lịch làm việc khác trong khoảng thời gian này.",
              );
            }
          }

          const created = await this.scheduleTable(tx).create({
            data: {
              tenantId,
              shiftId: shift.id,
              title: input.title?.trim() || shift.title,
              description: input.description?.trim() || shift.description,
              startDate: new Date(`${startDateStr}T00:00:00.000Z`),
              endDate: new Date(`${endDateStr}T00:00:00.000Z`),
              startTime: shift.startTime,
              endTime: shift.endTime,
              timeZone: input.timeZone || "Asia/Ho_Chi_Minh",
              allDay: false,
              status: "todo",
              priority: "medium",
              assigneeId,
              workMode: input.workMode ?? "AT_OFFICE",
              workLocation: input.workLocation?.trim() || "",
              breakMinutes: shift.breakMinutes,
              lateGraceMinutes: shift.lateGraceMinutes,
              earlyLeaveGraceMinutes: shift.earlyLeaveGraceMinutes,
              standardUnits: shift.standardUnits,
              version: 1,
            },
          });

          return this.assignmentDto(created);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        throw new ConflictException(
          "Dữ liệu đang được thay đổi hoặc có xung đột lịch. Vui lòng thử lại.",
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new ConflictException(
          "Ca làm việc hoặc dữ liệu liên quan không hợp lệ.",
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Bản ghi phân công đã tồn tại.");
      }
      throw error;
    }
  }
}
