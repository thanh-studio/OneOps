
import type {
  CalendarEvent,
  CalendarEventPriority,
  CalendarEventStatus,
} from "../types/calendar.types";

/* -------------------------------------------------------------------------- */
/*                                  OPTIONS                                   */
/* -------------------------------------------------------------------------- */

export const STATUS_OPTIONS: {
  value: CalendarEventStatus;
  label: string;
  color: string;
  background: string;
}[] = [
  {
    value: "todo",
    label: "Cần làm",
    color: "#64748B",
    background: "#F1F5F9",
  },
  {
    value: "in_progress",
    label: "Đang làm",
    color: "#2563EB",
    background: "#EFF6FF",
  },
  {
    value: "completed",
    label: "Hoàn thành",
    color: "#059669",
    background: "#ECFDF5",
  },
  {
    value: "cancelled",
    label: "Đã hủy",
    color: "#DC2626",
    background: "#FEF2F2",
  },
];

export const PRIORITY_OPTIONS: {
  value: CalendarEventPriority;
  label: string;
  color: string;
}[] = [
  {
    value: "low",
    label: "Thấp",
    color: "#64748B",
  },
  {
    value: "medium",
    label: "Trung bình",
    color: "#D97706",
  },
  {
    value: "high",
    label: "Cao",
    color: "#DC2626",
  },
];

/* -------------------------------------------------------------------------- */
/*                                   MAPS                                     */
/* -------------------------------------------------------------------------- */

const STATUS_MAP = new Map(
  STATUS_OPTIONS.map((item) => [item.value, item]),
);

const PRIORITY_MAP = new Map(
  PRIORITY_OPTIONS.map((item) => [item.value, item]),
);

/* -------------------------------------------------------------------------- */
/*                                  PATTERNS                                  */
/* -------------------------------------------------------------------------- */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/* -------------------------------------------------------------------------- */
/*                                DATE HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Định dạng Date thành YYYY-MM-DD theo múi giờ máy người dùng.
 */
export function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Kiểm tra chuỗi ngày YYYY-MM-DD có hợp lệ hay không.
 */
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Chuyển YYYY-MM-DD thành Date theo giờ địa phương.
 */
export function parseDate(dateString: string): Date {
  if (!isValidDateString(dateString)) {
    return new Date(NaN);
  }

  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day);
}

/**
 * Kiểm tra hai ngày có cùng ngày hay không.
 */
export function isSameDate(
  first: Date,
  second: Date,
): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

/**
 * Kiểm tra một ngày có nằm trong khoảng ngày của sự kiện hay không.
 */
export function isDateInEvent(
  date: Date,
  event: CalendarEvent,
): boolean {
  const current = formatDate(date);

  if (
    !current ||
    !isValidDateString(event.startDate) ||
    !isValidDateString(event.endDate)
  ) {
    return false;
  }

  if (event.endDate < event.startDate) {
    return false;
  }

  return (
    current >= event.startDate &&
    current <= event.endDate
  );
}

/* -------------------------------------------------------------------------- */
/*                                TIME HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Kiểm tra giờ HH:mm có hợp lệ hay không.
 */
export function isValidTimeString(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/**
 * Chuyển ngày và giờ thành timestamp.
 */
function getDateTimeTimestamp(
  date: string,
  time: string,
): number {
  if (
    !isValidDateString(date) ||
    !isValidTimeString(time)
  ) {
    return Number.NaN;
  }

  const timestamp = new Date(`${date}T${time}:00`).getTime();

  return Number.isNaN(timestamp)
    ? Number.NaN
    : timestamp;
}

/* -------------------------------------------------------------------------- */
/*                              EVENT FILTERING                               */
/* -------------------------------------------------------------------------- */

/**
 * Lấy danh sách sự kiện trong một ngày.
 */
export function getEventsByDate(
  events: CalendarEvent[],
  date: Date,
): CalendarEvent[] {
  return events.filter((event) =>
    isDateInEvent(date, event),
  );
}

/**
 * Lấy sự kiện theo trạng thái.
 */
export function getEventsByStatus(
  events: CalendarEvent[],
  status: CalendarEventStatus,
): CalendarEvent[] {
  return events.filter(
    (event) => event.status === status,
  );
}

/* -------------------------------------------------------------------------- */
/*                                STATUS LABELS                               */
/* -------------------------------------------------------------------------- */

/**
 * Lấy nhãn trạng thái.
 */
export function getStatusLabel(
  status: CalendarEventStatus,
): string {
  return STATUS_MAP.get(status)?.label ?? "Không xác định";
}

/**
 * Lấy màu trạng thái.
 */
export function getStatusColor(
  status: CalendarEventStatus,
): string {
  return STATUS_MAP.get(status)?.color ?? "#64748B";
}

/**
 * Lấy màu nền trạng thái.
 */
export function getStatusBackground(
  status: CalendarEventStatus,
): string {
  return (
    STATUS_MAP.get(status)?.background ?? "#F1F5F9"
  );
}

/* -------------------------------------------------------------------------- */
/*                               PRIORITY LABELS                              */
/* -------------------------------------------------------------------------- */

/**
 * Lấy nhãn mức ưu tiên.
 */
export function getPriorityLabel(
  priority: CalendarEventPriority,
): string {
  return PRIORITY_MAP.get(priority)?.label ?? "Trung bình";
}

/**
 * Lấy màu mức ưu tiên.
 */
export function getPriorityColor(
  priority: CalendarEventPriority,
): string {
  return PRIORITY_MAP.get(priority)?.color ?? "#64748B";
}

/* -------------------------------------------------------------------------- */
/*                                SORT EVENTS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Sắp xếp sự kiện theo ngày và giờ bắt đầu.
 */
export function sortEvents(
  events: CalendarEvent[],
): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const first = `${a.startDate}T${a.startTime || "00:00"}`;
    const second = `${b.startDate}T${b.startTime || "00:00"}`;

    return first.localeCompare(second);
  });
}

/* -------------------------------------------------------------------------- */
/*                                WEEK HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Lấy ngày đầu tuần, mặc định tuần bắt đầu từ thứ Hai.
 */
export function getStartOfWeek(date: Date): Date {
  const result = new Date(date);

  const day = result.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + difference);
  result.setHours(0, 0, 0, 0);

  return result;
}

/**
 * Lấy ngày cuối tuần.
 */
export function getEndOfWeek(date: Date): Date {
  const result = getStartOfWeek(date);

  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);

  return result;
}

/**
 * Lấy danh sách 7 ngày trong tuần.
 */
export function getWeekDays(date: Date): Date[] {
  const start = getStartOfWeek(date);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);

    day.setDate(start.getDate() + index);

    return day;
  });
}

/* -------------------------------------------------------------------------- */
/*                                MONTH HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Lấy số ngày trong tháng.
 */
export function getDaysInMonth(
  year: number,
  month: number,
): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Lấy tên tháng.
 */
export function getMonthName(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Lấy danh sách ngày hiển thị trong lịch tháng.
 * Tuần bắt đầu từ thứ Hai.
 */
export function getMonthCalendarDays(
  date: Date,
): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;

  const startDate = new Date(
    year,
    month,
    1 - startOffset,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(startDate);

    day.setDate(startDate.getDate() + index);

    return day;
  });
}

/* -------------------------------------------------------------------------- */
/*                               WEEKDAY LABELS                               */
/* -------------------------------------------------------------------------- */

/**
 * Lấy tên thứ trong tuần.
 */
export function getWeekdayNames(): string[] {
  return [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "Chủ nhật",
  ];
}

/* -------------------------------------------------------------------------- */
/*                                EVENT STATUS                                */
/* -------------------------------------------------------------------------- */

/**
 * Kiểm tra sự kiện đã quá hạn hay chưa.
 */
export function isEventOverdue(
  event: CalendarEvent,
): boolean {
  if (
    event.status === "completed" ||
    event.status === "cancelled"
  ) {
    return false;
  }

  if (!isValidDateString(event.endDate)) {
    return false;
  }

  const today = formatDate(new Date());

  return event.endDate < today;
}

/**
 * Kiểm tra sự kiện có diễn ra hôm nay hay không.
 */
export function isEventToday(
  event: CalendarEvent,
): boolean {
  return isDateInEvent(new Date(), event);
}

/* -------------------------------------------------------------------------- */
/*                               EVENT STATISTICS                             */
/* -------------------------------------------------------------------------- */

/**
 * Tính tổng số sự kiện theo trạng thái.
 */
export function getEventStatistics(
  events: CalendarEvent[],
) {
  return {
    total: events.length,

    todo: events.filter(
      (event) => event.status === "todo",
    ).length,

    inProgress: events.filter(
      (event) => event.status === "in_progress",
    ).length,

    completed: events.filter(
      (event) => event.status === "completed",
    ).length,

    cancelled: events.filter(
      (event) => event.status === "cancelled",
    ).length,

    overdue: events.filter(isEventOverdue).length,
  };
}

/* -------------------------------------------------------------------------- */
/*                              EVENT VALIDATION                              */
/* -------------------------------------------------------------------------- */

/**
 * Kiểm tra dữ liệu ngày và thời gian hợp lệ.
 *
 * Trả về thông báo lỗi nếu dữ liệu không hợp lệ.
 * Trả về null nếu dữ liệu hợp lệ.
 */
export function validateEventTime(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  allDay: boolean,
): string | null {
  if (!startDate || !endDate) {
    return "Vui lòng chọn ngày bắt đầu và kết thúc.";
  }

  if (
    !isValidDateString(startDate) ||
    !isValidDateString(endDate)
  ) {
    return "Ngày bắt đầu hoặc kết thúc không hợp lệ.";
  }

  if (endDate < startDate) {
    return "Ngày kết thúc không được trước ngày bắt đầu.";
  }

  if (allDay) {
    return null;
  }

  if (!startTime || !endTime) {
    return "Vui lòng chọn giờ bắt đầu và kết thúc.";
  }

  if (
    !isValidTimeString(startTime) ||
    !isValidTimeString(endTime)
  ) {
    return "Giờ bắt đầu hoặc kết thúc không hợp lệ.";
  }

  const startTimestamp = getDateTimeTimestamp(
    startDate,
    startTime,
  );

  const endTimestamp = getDateTimeTimestamp(
    endDate,
    endTime,
  );

  if (
    Number.isNaN(startTimestamp) ||
    Number.isNaN(endTimestamp)
  ) {
    return "Ngày hoặc giờ không hợp lệ.";
  }

  if (endTimestamp <= startTimestamp) {
    return "Thời gian kết thúc phải sau thời gian bắt đầu.";
  }

  return null;
}
