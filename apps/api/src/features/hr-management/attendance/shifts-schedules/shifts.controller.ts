import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  shiftListQuerySchema,
  shiftInputSchema,
  shiftUpdateSchema,
  type ShiftListQuery,
  type ShiftInput,
  type ShiftUpdateInput,
} from "./dto/shifts.dto.js";
import { ShiftsService } from "./shifts.service.js";

@Controller("shifts")
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Get()
  list(@Query(new SchemaPipe(shiftListQuerySchema)) query: ShiftListQuery) {
    return this.service.list(query);
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
}
