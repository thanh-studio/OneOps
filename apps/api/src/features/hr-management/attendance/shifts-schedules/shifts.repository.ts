import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
import { Prisma, type HrShift } from "@oneops/database";
import type {
  ShiftDto,
  ShiftInput,
  ShiftUpdateInput,
  ShiftListQuery,
  ShiftListResponse,
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

@Injectable()
export class ShiftsRepository {
  constructor(private readonly db: Database) {}

  private table(tx: Transaction = this.db) {
    return tx.hrShift;
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
}
