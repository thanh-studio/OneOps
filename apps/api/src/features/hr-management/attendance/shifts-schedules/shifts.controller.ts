import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  shiftListQuerySchema,
  shiftInputSchema,
  shiftUpdateSchema,
  createShiftAssignmentSchema,
  shiftScheduleQuerySchema,
  type ShiftListQuery,
  type ShiftInput,
  type ShiftUpdateInput,
  type CreateShiftAssignmentInput,
  type ShiftScheduleQuery,
} from "./dto/shifts.dto.js";
import { ShiftsService } from "./shifts.service.js";

@Controller("shifts")
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Get()
  list(@Query(new SchemaPipe(shiftListQuerySchema)) query: ShiftListQuery) {
    return this.service.list(query);
  }

  @Get("schedules")
  getSchedules(
    @Query(new SchemaPipe(shiftScheduleQuerySchema)) query: ShiftScheduleQuery,
  ) {
    return this.service.getSchedules(query);
  }

  @Get(":id")
  get(
    @Param("id", new ParseUUIDPipe({ errorHttpStatusCode: 400 })) id: string,
  ) {
    return this.service.get(id);
  }

  @Post()
  create(@Body(new SchemaPipe(shiftInputSchema)) input: ShiftInput) {
    return this.service.create(input);
  }

  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe({ errorHttpStatusCode: 400 })) id: string,
    @Body(new SchemaPipe(shiftUpdateSchema)) input: ShiftUpdateInput,
  ) {
    return this.service.update(id, input);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id", new ParseUUIDPipe({ errorHttpStatusCode: 400 })) id: string,
  ): Promise<void> {
    await this.service.remove(id);
  }

  @Post(":id/assignments")
  @HttpCode(HttpStatus.CREATED)
  createAssignment(
    @Param("id", new ParseUUIDPipe({ errorHttpStatusCode: 400 })) id: string,
    @Body(new SchemaPipe(createShiftAssignmentSchema))
    input: CreateShiftAssignmentInput,
  ) {
    return this.service.createAssignment(id, input);
  }
}
