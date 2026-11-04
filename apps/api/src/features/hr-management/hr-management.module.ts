import { Module } from "@nestjs/common";
import { ShiftsSchedulesModule } from "./attendance/shifts-schedules/index.js";

@Module({
  imports: [ShiftsSchedulesModule],
  exports: [ShiftsSchedulesModule],
})
export class HrManagementModule {}
