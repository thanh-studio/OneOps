
"use client";

import type { CalendarEvent } from "../types/calendar.types";

interface Props {
  date: Date;
  events: CalendarEvent[];
  onMonthClick: (date: Date) => void;
  onDateClick: (date: Date) => void;
}

const MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isToday(date: Date) {
  return dateKey(date) === dateKey(new Date());
}

export default function CalendarYearView({
  date,
  events,
  onMonthClick,
  onDateClick,
}: Props) {
  const year = date.getFullYear();
  const todayKey = dateKey(new Date());

  // Tạo tập hợp ngày có sự kiện để tra cứu nhanh hơn.
  const eventDays = new Set<string>();

  events.forEach((event) => {
    const start = new Date(`${event.startDate}T00:00:00`);
    const end = new Date(`${event.endDate}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return;
    }

    const current = new Date(start);

    while (current <= end) {
      eventDays.add(dateKey(current));
      current.setDate(current.getDate() + 1);
    }
  });

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Tổng quan năm {year}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Chọn tháng hoặc ngày để xem chi tiết
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
          Có công việc
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MONTHS.map((monthName, monthIndex) => {
          const firstDay = new Date(year, monthIndex, 1);
          const offset = (firstDay.getDay() + 6) % 7;
          const totalDays = new Date(
            year,
            monthIndex + 1,
            0
          ).getDate();

          const monthHasEvents = Array.from(
            { length: totalDays },
            (_, index) =>
              dateKey(new Date(year, monthIndex, index + 1))
          ).some((key) => eventDays.has(key));

          const isCurrentMonth =
            new Date().getFullYear() === year &&
            new Date().getMonth() === monthIndex;

          return (
            <section
              key={monthName}
              className={`rounded-xl border p-3 transition-all duration-200 ${
                isCurrentMonth
                  ? "border-blue-200 bg-blue-50/30"
                  : "border-[#E2E8F0] bg-white hover:border-blue-200 hover:shadow-sm"
              }`}
            >
              {/* Month title */}
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    onMonthClick(new Date(year, monthIndex, 1))
                  }
                  className="rounded-md text-sm font-bold text-gray-800 transition-colors hover:text-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                  aria-label={`Xem ${monthName} năm ${year}`}
                >
                  {monthName}
                </button>

                <div className="flex items-center gap-2">
                  {monthHasEvents && (
                    <span
                      className="h-2 w-2 rounded-full bg-[#2563EB]"
                      title="Tháng có công việc"
                    />
                  )}

                  {isCurrentMonth && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">
                      Hiện tại
                    </span>
                  )}
                </div>
              </div>

              {/* Weekdays */}
              <div className="mb-1 grid grid-cols-7">
                {WEEK.map((day, index) => (
                  <span
                    key={day}
                    className={`py-1 text-center text-[10px] font-semibold ${
                      index >= 5 ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {day}
                  </span>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from(
                  { length: offset + totalDays },
                  (_, index) => {
                    const day = index - offset + 1;

                    if (day < 1) {
                      return (
                        <span
                          key={`empty-${index}`}
                          className="h-8"
                          aria-hidden="true"
                        />
                      );
                    }

                    const current = new Date(year, monthIndex, day);
                    const key = dateKey(current);
                    const hasEvents = eventDays.has(key);
                    const today = key === todayKey;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => onDateClick(current)}
                        aria-label={`${day} ${monthName}${
                          hasEvents ? ", có công việc" : ""
                        }${today ? ", hôm nay" : ""}`}
                        aria-current={today ? "date" : undefined}
                        className={`group relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${
                          today
                            ? "bg-[#2563EB] font-bold text-white shadow-sm"
                            : hasEvents
                              ? "bg-blue-50 text-[#2563EB] hover:bg-blue-100"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        {day}

                        {hasEvents && !today && (
                          <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#2563EB]" />
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
