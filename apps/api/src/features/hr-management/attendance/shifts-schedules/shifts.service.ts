import { Injectable, BadRequestException } from "@nestjs/common";
import { ShiftsRepository } from "./shifts.repository.js";
import { TenantContext } from "./shifts.tenant.js";
import type {
  ShiftInput,
  ShiftUpdateInput,
  ShiftListQuery,
  ShiftListResponse,
  ShiftDto,
} from "./dto/shifts.dto.js";

function parseTimeToMinutes(timeStr: string): number {
  const [hh, mm] = timeStr.split(":").map(Number);
  return hh * 60 + mm;
}

@Injectable()
export class ShiftsService {
  constructor(
    private readonly repository: ShiftsRepository,
    private readonly tenantContext: TenantContext,
  ) {}

  private validateShiftTimes(
    startTime: string,
    endTime: string,
    endDayOffset: number,
    breakMinutes: number,
  ): void {
    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);

    let duration: number;
    if (endDayOffset === 0) {
      duration = endMins - startMins;
      if (duration <= 0) {
        throw new BadRequestException(
          "Thời gian kết thúc phải sau thời gian bắt đầu đối với ca làm việc trong cùng ngày (hoặc đặt endDayOffset = 1 cho ca qua đêm).",
        );
      }
    } else {
      duration = 24 * 60 - startMins + endMins;
      if (duration <= 0) {
        throw new BadRequestException(
          "Tổng thời lượng ca làm việc phải lớn hơn 0.",
        );
      }
    }

    if (breakMinutes >= duration) {
      throw new BadRequestException(
        "Thời gian nghỉ giữa ca phải nhỏ hơn tổng thời lượng ca làm việc.",
      );
    }
  }

  async list(query: ShiftListQuery): Promise<ShiftListResponse> {
    const tenantId = this.tenantContext.getTenantId();
    return this.repository.list(tenantId, query);
  }

  async get(id: string): Promise<ShiftDto> {
    const tenantId = this.tenantContext.getTenantId();
    return this.repository.get(tenantId, id);
  }

  async create(input: ShiftInput): Promise<ShiftDto> {
    const tenantId = this.tenantContext.getTenantId();
    this.validateShiftTimes(
      input.startTime,
      input.endTime,
      input.endDayOffset,
      input.breakMinutes,
    );
    return this.repository.create(tenantId, input);
  }

  async update(id: string, input: ShiftUpdateInput): Promise<ShiftDto> {
    const tenantId = this.tenantContext.getTenantId();
    const current = await this.repository.get(tenantId, id);

    const effectiveStartTime = input.startTime ?? current.startTime;
    const effectiveEndTime = input.endTime ?? current.endTime;
    const effectiveEndDayOffset =
      input.endDayOffset !== undefined
        ? input.endDayOffset
        : current.endDayOffset;
    const effectiveBreakMinutes =
      input.breakMinutes !== undefined
        ? input.breakMinutes
        : current.breakMinutes;

    this.validateShiftTimes(
      effectiveStartTime,
      effectiveEndTime,
      effectiveEndDayOffset,
      effectiveBreakMinutes,
    );

    return this.repository.update(tenantId, id, input);
  }
}
