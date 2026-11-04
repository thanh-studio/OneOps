-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_attendance_reports";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_checkin_explanations";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_daily_checkin";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_leave_requests";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_shifts_schedules";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_work_policies";

-- CreateEnum
CREATE TYPE "hr_attendance_reports"."AttendanceReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "hr_checkin_explanations"."AttendanceExplanationType" AS ENUM ('MISSING_CHECK_IN', 'MISSING_CHECK_OUT', 'LATE_CHECK_IN', 'EARLY_CHECK_OUT', 'OTHER');

-- CreateEnum
CREATE TYPE "hr_checkin_explanations"."AttendanceExplanationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "hr_daily_checkin"."AttendanceLogAction" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'STATUS_CHANGED', 'AUTO_CLOSED', 'CORRECTED');

-- CreateEnum
CREATE TYPE "hr_daily_checkin"."AttendanceVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "hr_daily_checkin"."AttendanceVerificationMethod" AS ENUM ('OFFICE_IP', 'OFFICE_WIFI', 'CORPORATE_VPN', 'MANUAL');

-- CreateEnum
CREATE TYPE "hr_daily_checkin"."WorkStatus" AS ENUM ('AT_OFFICE', 'REMOTE', 'ON_DUTY', 'ON_LEAVE', 'SICK_LEAVE', 'ABSENT', 'NOT_CHECKED_IN');

-- CreateEnum
CREATE TYPE "hr_daily_checkin"."CheckInLabel" AS ENUM ('ON_TIME', 'LATE');

-- CreateEnum
CREATE TYPE "hr_daily_checkin"."CheckOutLabel" AS ENUM ('NORMAL', 'EARLY', 'MISSING');

-- CreateEnum
CREATE TYPE "hr_shifts_schedules"."HrShiftScheduleStatus" AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "hr_shifts_schedules"."HrShiftSchedulePriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "hr_shifts_schedules"."HrShiftWorkMode" AS ENUM ('AT_OFFICE', 'REMOTE', 'ON_DUTY');

-- CreateEnum
CREATE TYPE "hr_leave_requests"."WorkModeRequestType" AS ENUM ('REMOTE', 'ON_DUTY');

-- CreateEnum
CREATE TYPE "hr_leave_requests"."WorkModeApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "hr_attendance_reports"."attendance_reviews" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(100) NOT NULL,
    "attendance_id" TEXT,
    "shift_schedule_id" UUID,
    "user_id" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "time_zone" TEXT NOT NULL,
    "evidence_snapshot" JSONB,
    "approver_id" TEXT NOT NULL,
    "status" "hr_attendance_reports"."AttendanceReviewStatus" NOT NULL DEFAULT 'PENDING',
    "estimated_units" DECIMAL(6,2),
    "credited_units" DECIMAL(6,2),
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMPTZ(3),
    "review_note" TEXT,
    "policy_snapshot" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_attendance_reports"."attendance_review_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(100) NOT NULL,
    "review_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "from_status" "hr_attendance_reports"."AttendanceReviewStatus",
    "to_status" "hr_attendance_reports"."AttendanceReviewStatus" NOT NULL,
    "before_snapshot" JSONB,
    "after_snapshot" JSONB,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_review_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_checkin_explanations"."attendance_explanations" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(100) NOT NULL,
    "user_id" TEXT NOT NULL,
    "attendance_id" TEXT,
    "work_date" DATE NOT NULL,
    "time_zone" TEXT NOT NULL,
    "type" "hr_checkin_explanations"."AttendanceExplanationType" NOT NULL,
    "reason" TEXT NOT NULL,
    "proposed_checked_in_at" TIMESTAMPTZ(3),
    "proposed_checked_out_at" TIMESTAMPTZ(3),
    "evidence_snapshot" JSONB,
    "approver_id" TEXT NOT NULL,
    "status" "hr_checkin_explanations"."AttendanceExplanationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMPTZ(3),
    "review_note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_explanations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_checkin_explanations"."attendance_explanation_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(100) NOT NULL,
    "explanation_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "from_status" "hr_checkin_explanations"."AttendanceExplanationStatus",
    "to_status" "hr_checkin_explanations"."AttendanceExplanationStatus" NOT NULL,
    "before_snapshot" JSONB,
    "after_snapshot" JSONB,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_explanation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_daily_checkin"."attendances" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(100) NOT NULL,
    "user_id" TEXT NOT NULL,
    "shift_schedule_id" UUID,
    "schedule_snapshot" JSONB,
    "work_date" DATE NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "hr_daily_checkin"."WorkStatus" NOT NULL,
    "checked_in_at" TIMESTAMPTZ(3) NOT NULL,
    "checked_out_at" TIMESTAMPTZ(3),
    "check_in_label" "hr_daily_checkin"."CheckInLabel",
    "check_out_label" "hr_daily_checkin"."CheckOutLabel",
    "client_ip" TEXT,
    "note" TEXT,
    "work_location" TEXT,
    "task_id" TEXT,
    "task_title_snapshot" TEXT,
    "time_zone" TEXT NOT NULL,
    "network_name" TEXT,
    "network_bssid" TEXT,
    "device_description" TEXT,
    "verification_status" "hr_daily_checkin"."AttendanceVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verification_method" "hr_daily_checkin"."AttendanceVerificationMethod",
    "verified_at" TIMESTAMPTZ(3),
    "work_mode_request_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_daily_checkin"."attendance_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(100) NOT NULL,
    "attendance_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "hr_daily_checkin"."AttendanceLogAction" NOT NULL,
    "from_status" "hr_daily_checkin"."WorkStatus",
    "to_status" "hr_daily_checkin"."WorkStatus" NOT NULL,
    "note" TEXT,
    "actor_id" TEXT,
    "before_snapshot" JSONB,
    "after_snapshot" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_daily_checkin"."checkin_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(100) NOT NULL,
    "auto_close_time" TEXT NOT NULL DEFAULT '23:59',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "checkin_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_shifts_schedules"."shifts" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(100) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "codeKey" VARCHAR(100) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" VARCHAR(2000) NOT NULL DEFAULT '',
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "endDayOffset" INTEGER NOT NULL DEFAULT 0,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveGraceMinutes" INTEGER NOT NULL DEFAULT 0,
    "standardUnits" DECIMAL(6,2) NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_shifts_schedules"."shift_schedules" (
    "id" UUID NOT NULL,
    "tenantId" VARCHAR(100) NOT NULL,
    "shiftId" UUID,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "startTime" TIME(0),
    "endTime" TIME(0),
    "timeZone" VARCHAR(100) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "status" "hr_shifts_schedules"."HrShiftScheduleStatus" NOT NULL DEFAULT 'todo',
    "priority" "hr_shifts_schedules"."HrShiftSchedulePriority" NOT NULL DEFAULT 'medium',
    "assigneeId" VARCHAR(100),
    "workMode" "hr_shifts_schedules"."HrShiftWorkMode",
    "workLocation" VARCHAR(500),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveGraceMinutes" INTEGER NOT NULL DEFAULT 0,
    "standardUnits" DECIMAL(6,2),
    "archivedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shift_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_requests"."work_mode_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(100) NOT NULL,
    "user_id" TEXT NOT NULL,
    "requested_date" DATE NOT NULL,
    "time_zone" TEXT NOT NULL,
    "type" "hr_leave_requests"."WorkModeRequestType" NOT NULL,
    "task_id" TEXT NOT NULL,
    "task_title_snapshot" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "work_location" TEXT,
    "expected_output" TEXT,
    "approver_id" TEXT NOT NULL,
    "status" "hr_leave_requests"."WorkModeApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMPTZ(3),
    "review_note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_mode_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_requests"."work_mode_request_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(100) NOT NULL,
    "request_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "from_status" "hr_leave_requests"."WorkModeApprovalStatus",
    "to_status" "hr_leave_requests"."WorkModeApprovalStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_mode_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_work_policies"."schedule_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(100) NOT NULL,
    "time_zone" TEXT NOT NULL,
    "late_threshold_time" TEXT NOT NULL DEFAULT '07:55',
    "early_checkout_time" TEXT NOT NULL DEFAULT '17:30',
    "holiday_dates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weekly_days_off" INTEGER[] DEFAULT ARRAY[6, 7]::INTEGER[],
    "office_allowed_ips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "office_allowed_bssids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vpn_allowed_ips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "schedule_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_reviews_tenant_id_work_date_status_idx" ON "hr_attendance_reports"."attendance_reviews"("tenant_id", "work_date", "status");

-- CreateIndex
CREATE INDEX "attendance_reviews_tenant_id_approver_id_status_work_date_idx" ON "hr_attendance_reports"."attendance_reviews"("tenant_id", "approver_id", "status", "work_date");

-- CreateIndex
CREATE INDEX "attendance_reviews_tenant_id_shift_schedule_id_idx" ON "hr_attendance_reports"."attendance_reviews"("tenant_id", "shift_schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_reviews_tenant_id_id_key" ON "hr_attendance_reports"."attendance_reviews"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_reviews_tenant_id_attendance_id_key" ON "hr_attendance_reports"."attendance_reviews"("tenant_id", "attendance_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_reviews_tenant_id_user_id_work_date_key" ON "hr_attendance_reports"."attendance_reviews"("tenant_id", "user_id", "work_date");

-- CreateIndex
CREATE INDEX "attendance_review_logs_tenant_id_review_id_created_at_idx" ON "hr_attendance_reports"."attendance_review_logs"("tenant_id", "review_id", "created_at");

-- CreateIndex
CREATE INDEX "attendance_explanations_tenant_id_user_id_work_date_idx" ON "hr_checkin_explanations"."attendance_explanations"("tenant_id", "user_id", "work_date");

-- CreateIndex
CREATE INDEX "attendance_explanations_tenant_id_attendance_id_idx" ON "hr_checkin_explanations"."attendance_explanations"("tenant_id", "attendance_id");

-- CreateIndex
CREATE INDEX "attendance_explanations_tenant_id_approver_id_status_work_d_idx" ON "hr_checkin_explanations"."attendance_explanations"("tenant_id", "approver_id", "status", "work_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_explanations_tenant_id_id_key" ON "hr_checkin_explanations"."attendance_explanations"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "attendance_explanation_logs_tenant_id_explanation_id_create_idx" ON "hr_checkin_explanations"."attendance_explanation_logs"("tenant_id", "explanation_id", "created_at");

-- CreateIndex
CREATE INDEX "attendances_tenant_id_work_date_status_idx" ON "hr_daily_checkin"."attendances"("tenant_id", "work_date", "status");

-- CreateIndex
CREATE INDEX "attendances_tenant_id_shift_schedule_id_idx" ON "hr_daily_checkin"."attendances"("tenant_id", "shift_schedule_id");

-- CreateIndex
CREATE INDEX "attendances_tenant_id_work_mode_request_id_idx" ON "hr_daily_checkin"."attendances"("tenant_id", "work_mode_request_id");

-- CreateIndex
CREATE INDEX "attendances_tenant_id_task_id_idx" ON "hr_daily_checkin"."attendances"("tenant_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_tenant_id_id_key" ON "hr_daily_checkin"."attendances"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_tenant_id_user_id_work_date_key" ON "hr_daily_checkin"."attendances"("tenant_id", "user_id", "work_date");

-- CreateIndex
CREATE INDEX "attendance_logs_tenant_id_user_id_created_at_idx" ON "hr_daily_checkin"."attendance_logs"("tenant_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "attendance_logs_tenant_id_attendance_id_created_at_idx" ON "hr_daily_checkin"."attendance_logs"("tenant_id", "attendance_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "checkin_configs_tenant_id_key" ON "hr_daily_checkin"."checkin_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "shifts_tenantId_isActive_idx" ON "hr_shifts_schedules"."shifts"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_tenantId_codeKey_key" ON "hr_shifts_schedules"."shifts"("tenantId", "codeKey");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_tenantId_id_key" ON "hr_shifts_schedules"."shifts"("tenantId", "id");

-- CreateIndex
CREATE INDEX "shift_schedules_tenantId_assigneeId_startDate_idx" ON "hr_shifts_schedules"."shift_schedules"("tenantId", "assigneeId", "startDate");

-- CreateIndex
CREATE INDEX "shift_schedules_tenantId_status_startDate_idx" ON "hr_shifts_schedules"."shift_schedules"("tenantId", "status", "startDate");

-- CreateIndex
CREATE INDEX "shift_schedules_tenantId_startDate_endDate_idx" ON "hr_shifts_schedules"."shift_schedules"("tenantId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "shift_schedules_tenantId_shiftId_idx" ON "hr_shifts_schedules"."shift_schedules"("tenantId", "shiftId");

-- CreateIndex
CREATE INDEX "shift_schedules_tenantId_archivedAt_startDate_idx" ON "hr_shifts_schedules"."shift_schedules"("tenantId", "archivedAt", "startDate");

-- CreateIndex
CREATE INDEX "work_mode_requests_tenant_id_user_id_requested_date_idx" ON "hr_leave_requests"."work_mode_requests"("tenant_id", "user_id", "requested_date");

-- CreateIndex
CREATE INDEX "work_mode_requests_tenant_id_approver_id_status_requested_d_idx" ON "hr_leave_requests"."work_mode_requests"("tenant_id", "approver_id", "status", "requested_date");

-- CreateIndex
CREATE INDEX "work_mode_requests_tenant_id_task_id_idx" ON "hr_leave_requests"."work_mode_requests"("tenant_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_mode_requests_tenant_id_id_key" ON "hr_leave_requests"."work_mode_requests"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "work_mode_request_logs_tenant_id_request_id_created_at_idx" ON "hr_leave_requests"."work_mode_request_logs"("tenant_id", "request_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_configs_tenant_id_key" ON "tenant_work_policies"."schedule_configs"("tenant_id");

-- AddForeignKey
ALTER TABLE "hr_attendance_reports"."attendance_review_logs" ADD CONSTRAINT "attendance_review_logs_tenant_id_review_id_fkey" FOREIGN KEY ("tenant_id", "review_id") REFERENCES "hr_attendance_reports"."attendance_reviews"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "hr_checkin_explanations"."attendance_explanation_logs" ADD CONSTRAINT "attendance_explanation_logs_tenant_id_explanation_id_fkey" FOREIGN KEY ("tenant_id", "explanation_id") REFERENCES "hr_checkin_explanations"."attendance_explanations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "hr_daily_checkin"."attendance_logs" ADD CONSTRAINT "attendance_logs_tenant_id_attendance_id_fkey" FOREIGN KEY ("tenant_id", "attendance_id") REFERENCES "hr_daily_checkin"."attendances"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "hr_shifts_schedules"."shift_schedules" ADD CONSTRAINT "shift_schedules_tenantId_shiftId_fkey" FOREIGN KEY ("tenantId", "shiftId") REFERENCES "hr_shifts_schedules"."shifts"("tenantId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "hr_leave_requests"."work_mode_request_logs" ADD CONSTRAINT "work_mode_request_logs_tenant_id_request_id_fkey" FOREIGN KEY ("tenant_id", "request_id") REFERENCES "hr_leave_requests"."work_mode_requests"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
