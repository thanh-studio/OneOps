import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { ShiftsController } from "./shifts.controller.js";
import { ShiftsService } from "./shifts.service.js";
import { ShiftsRepository } from "./shifts.repository.js";
import { TenantContext } from "./shifts.tenant.js";

@Module({
  imports: [DatabaseModule],
  controllers: [ShiftsController],
  providers: [ShiftsService, ShiftsRepository, TenantContext],
  exports: [ShiftsService],
})
export class ShiftsSchedulesModule {}
