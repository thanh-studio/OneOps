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
    return val.toISOString().slice(11, 16);
  }
  const str = String(val);
  if (str.includes("T")) {
    return str.split("T")[1].slice(0, 5);
  }
  return str.slice(0, 5);
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

          const startTimeStr = formatTimeFromDate(shift.startTime);
          const endTimeStr = formatTimeFromDate(shift.endTime);

          const newStartMs = Date.parse(
            `${startDateStr}T${startTimeStr}:00.000Z`,
          );
          const newEndMs = Date.parse(`${endDateStr}T${endTimeStr}:00.000Z`);

          // Query candidate schedules for the same assignee within overlapping date window
          const minCandidateDate = addDaysToDateStr(startDateStr, -1);
          const maxCandidateDate = endDateStr;

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

            let exStartMs: number;
            let exEndMs: number;

            if (cand.allDay) {
              exStartMs = Date.parse(`${exStartStr}T00:00:00.000Z`);
              exEndMs = Date.parse(
                `${addDaysToDateStr(exEndStr, 1)}T00:00:00.000Z`,
              );
            } else {
              const candStart =
                formatTimeFromDate(cand.startTime ?? "") || "00:00";
              const candEnd = formatTimeFromDate(cand.endTime ?? "") || "23:59";
              exStartMs = Date.parse(`${exStartStr}T${candStart}:00.000Z`);
              exEndMs = Date.parse(`${exEndStr}T${candEnd}:00.000Z`);
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
