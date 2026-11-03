
"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import type {
  CalendarEvent,
  CalendarEventFormData,
  CalendarUser,
} from "../types/calendar.types";

import CalendarHeader from "./CalendarHeader";
import CalendarSidebar from "./CalendarSidebar";
import CalendarToolbar, {
  type CalendarViewMode,
} from "./CalendarToolbar";

import CalendarDayView from "./CalendarDayView";
import CalendarWeekView from "./CalendarWeekView";
import CalendarMonthView from "./CalendarMonthView";
import CalendarYearView from "./CalendarYearView";
import CalendarEventForm from "./CalendarEventForm";

type SummaryFilter = "all" | "in_progress" | "completed" | "todo";

interface Props {
  events: CalendarEvent[];
  users: CalendarUser[];
  isLoading?: boolean;
  isSaving?: boolean;
  onCreate: (
    data: CalendarEventFormData
  ) => void | Promise<void>;
  onUpdate: (
    id: string,
    data: CalendarEventFormData
  ) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  color,
  iconBackground,
  active,
  onClick,
}: {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
  color: string;
  iconBackground: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
        active
          ? "border-blue-500 ring-2 ring-blue-100"
          : "border-gray-200 hover:border-blue-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-500 sm:text-sm">
          {label}
        </span>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBackground} ${color}`}
        >
          {icon}
        </span>
      </div>

      <p className={`mt-3 text-2xl font-bold tabular-nums ${color}`}>
        {value}
      </p>

      <p className="mt-1 text-[11px] text-gray-400 sm:text-xs">
        {description}
      </p>

      {active && (
        <p className="mt-2 text-[10px] font-semibold text-blue-600">
          Đang lọc · Nhấn để bỏ lọc
        </p>
      )}
    </button>
  );
}

export default function CalendarScreen({
  events,
  users,
  isLoading = false,
  isSaving = false,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarViewMode>("month");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Bộ lọc khi nhấn các thẻ thống kê.
  const [activeSummaryFilter, setActiveSummaryFilter] =
    useState<SummaryFilter>("all");

  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEvent | null>(null);

  const [formDate, setFormDate] = useState(() => new Date());
  const [formStartTime, setFormStartTime] = useState("08:00");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Lọc theo từ khóa, trạng thái trên Toolbar và thẻ thống kê.
  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");

    return events.filter((event) => {
      const matchesSearch =
        !keyword ||
        event.title.toLocaleLowerCase("vi").includes(keyword) ||
        (event.description || "")
          .toLocaleLowerCase("vi")
          .includes(keyword) ||
        (event.assignee?.name || "")
          .toLocaleLowerCase("vi")
          .includes(keyword);

      const matchesToolbarStatus =
        statusFilter === "all" ||
        (statusFilter === "archived"
          ? (event.status as string) === "archived"
          : event.status === statusFilter);

      const matchesSummary =
        activeSummaryFilter === "all" ||
        event.status === activeSummaryFilter;

      return (
        matchesSearch &&
        matchesToolbarStatus &&
        matchesSummary
      );
    });
  }, [events, search, statusFilter, activeSummaryFilter]);

  // Thống kê công việc.
  const summary = useMemo(
    () => ({
      total: events.length,
      inProgress: events.filter(
        (event) => event.status === "in_progress"
      ).length,
      completed: events.filter(
        (event) => event.status === "completed"
      ).length,
      todo: events.filter(
        (event) => event.status === "todo"
      ).length,
    }),
    [events]
  );

  // Nhấn thẻ đang chọn lần nữa sẽ bỏ lọc.
  const handleSummaryClick = (filter: SummaryFilter) => {
    setActiveSummaryFilter((current) =>
      current === filter ? "all" : filter
    );
  };

  // Mở form tạo công việc.
  const handleCreate = (date?: Date, time = "08:00") => {
    setSelectedEvent(null);
    setFormDate(date || currentDate);
    setFormStartTime(time);
    setShowForm(true);
  };

  // Mở form chỉnh sửa.
  const handleEdit = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setFormDate(new Date(`${event.startDate}T00:00:00`));
    setFormStartTime(event.startTime || "08:00");
    setShowForm(true);
  };

  // Lưu công việc mới hoặc cập nhật.
  const handleSubmit = async (data: CalendarEventFormData) => {
    if (selectedEvent) {
      await onUpdate(selectedEvent.id, data);
    } else {
      await onCreate(data);
    }

    setShowForm(false);
    setSelectedEvent(null);
  };

  // Xóa công việc.
  const handleDelete = async (id: string) => {
    await onDelete(id);
    setShowForm(false);
    setSelectedEvent(null);
  };

  // Điều hướng thời gian theo chế độ xem.
  const moveDate = (direction: number) => {
    setCurrentDate((previous) => {
      const next = new Date(previous);

      if (view === "day") {
        next.setDate(next.getDate() + direction);
      } else if (view === "week") {
        next.setDate(next.getDate() + direction * 7);
      } else if (view === "year") {
        next.setFullYear(next.getFullYear() + direction);
      } else {
        next.setMonth(next.getMonth() + direction);
      }

      return next;
    });
  };

  // Chọn ngày trên lịch tháng.
  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  // Chọn khung giờ để tạo công việc.
  const handleSlotClick = (date: Date, time: string) => {
    handleCreate(date, time);
  };

  // Đóng form.
  const handleCloseForm = () => {
    if (isSaving) return;

    setShowForm(false);
    setSelectedEvent(null);
  };

  // Tiêu đề lịch theo chế độ xem.
  const calendarTitle =
    view === "day"
      ? currentDate.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : view === "week"
        ? "Lịch theo tuần"
        : view === "year"
          ? `Lịch năm ${currentDate.getFullYear()}`
          : currentDate.toLocaleDateString("vi-VN", {
              month: "long",
              year: "numeric",
            });

  return (
    <div className="min-h-screen min-w-0 bg-[#F5F7FB] p-3 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">

        {/* Header */}
        <CalendarHeader onCreate={() => handleCreate()} />

        {/* Summary cards */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryCard
            label="Tổng công việc"
            value={summary.total}
            description="Tất cả công việc"
            color="text-blue-600"
            iconBackground="bg-blue-50"
            active={activeSummaryFilter === "all"}
            onClick={() => handleSummaryClick("all")}
            icon={
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
          />

          <SummaryCard
            label="Đang thực hiện"
            value={summary.inProgress}
            description="Công việc đang xử lý"
            color="text-blue-600"
            iconBackground="bg-blue-50"
            active={activeSummaryFilter === "in_progress"}
            onClick={() => handleSummaryClick("in_progress")}
            icon={
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  d="M12 7v5l3 2"
                  strokeLinecap="round"
                />
              </svg>
            }
          />

          <SummaryCard
            label="Hoàn thành"
            value={summary.completed}
            description="Công việc đã hoàn thành"
            color="text-emerald-600"
            iconBackground="bg-emerald-50"
            active={activeSummaryFilter === "completed"}
            onClick={() => handleSummaryClick("completed")}
            icon={
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="m5 12 4 4L19 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />

          <SummaryCard
            label="Cần làm"
            value={summary.todo}
            description="Công việc chưa bắt đầu"
            color="text-orange-600"
            iconBackground="bg-orange-50"
            active={activeSummaryFilter === "todo"}
            onClick={() => handleSummaryClick("todo")}
            icon={
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  d="M12 8v5m0 3h.01"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
        </section>

        {/* Main calendar */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="space-y-5 p-3 sm:p-5">

            {/* Calendar heading */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <h2 className="text-base font-bold capitalize text-gray-900 sm:text-lg">
                  {calendarTitle}
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  Hiển thị {filteredEvents.length} công việc phù hợp với bộ lọc.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSidebarCollapsed((previous) => !previous)
                }
                aria-expanded={!sidebarCollapsed}
                className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 lg:inline-flex"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M9 4v16" />
                </svg>

                {sidebarCollapsed
                  ? "Mở thanh bên"
                  : "Thu gọn thanh bên"}
              </button>
            </div>

            {/* Toolbar */}
            <CalendarToolbar
              date={currentDate}
              view={view}
              onDateChange={setCurrentDate}
              onViewChange={setView}
              onPrevious={() => moveDate(-1)}
              onNext={() => moveDate(1)}
              onToday={() => setCurrentDate(new Date())}
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />

            {/* Sidebar + Calendar */}
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row">

              {!sidebarCollapsed && (
                <CalendarSidebar
                  date={currentDate}
                  events={filteredEvents}
                  users={users}
                  onDateChange={setCurrentDate}
                  collapsed={false}
                  onToggle={() => setSidebarCollapsed(true)}
                />
              )}

              {/* Calendar content */}
              <div className="min-w-0 flex-1">
                {isLoading ? (
                  <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600" />

                    <p className="text-sm text-gray-400">
                      Đang tải lịch công việc...
                    </p>
                  </div>
                ) : (
                  <>
                    {filteredEvents.length === 0 && (
                      <div className="mb-3 flex items-start gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5">
                        <svg
                          viewBox="0 0 24 24"
                          className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 8v4m0 4h.01" />
                        </svg>

                        <p className="text-xs leading-5 text-gray-500">
                          {search ||
                          statusFilter !== "all" ||
                          activeSummaryFilter !== "all"
                            ? "Không tìm thấy công việc phù hợp. Bạn có thể thay đổi bộ lọc hoặc tạo công việc mới."
                            : "Chưa có công việc nào. Chọn một ngày hoặc khung giờ trên lịch để bắt đầu tạo công việc."}
                        </p>
                      </div>
                    )}

                    {view === "day" && (
                      <CalendarDayView
                        date={currentDate}
                        events={filteredEvents}
                        onEventClick={handleEdit}
                        onSlotClick={handleSlotClick}
                      />
                    )}

                    {view === "week" && (
                      <CalendarWeekView
                        date={currentDate}
                        events={filteredEvents}
                        onEventClick={handleEdit}
                        onSlotClick={handleSlotClick}
                      />
                    )}

                    {view === "month" && (
                      <CalendarMonthView
                        date={currentDate}
                        events={filteredEvents}
                        onEventClick={handleEdit}
                        onDateClick={handleDateClick}
                      />
                    )}

                    {view === "year" && (
                      <CalendarYearView
                        date={currentDate}
                        events={filteredEvents}
                        onMonthClick={(selectedMonth) => {
                          setCurrentDate(selectedMonth);
                          setView("month");
                        }}
                        onDateClick={handleDateClick}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pb-2 text-center text-[11px] text-gray-400">
          OneOps Calendar · Quản lý công việc tập trung
        </footer>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <CalendarEventForm
          users={users}
          event={selectedEvent}
          selectedDate={formDate}
          initialStartTime={formStartTime}
          isSaving={isSaving}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
