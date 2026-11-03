
"use client";

import type { CalendarEvent } from "../types/calendar.types";
import CalendarEventCard from "./CalendarEvent";

interface Props {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

const WEEK_DAYS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "CN",
];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function CalendarMonthView({
  date,
  events,
  onEventClick,
  onDateClick,
}: Props) {
  // Ngày đầu tiên của tháng.
  const first = new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

  // Chuyển tuần bắt đầu từ thứ 2.
  const offset = (first.getDay() + 6) % 7;

  // Tổng số ngày trong tháng.
  const totalDays = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();

  // Tổng số ô lịch.
  const totalCells = Math.ceil((offset + totalDays) / 7) * 7;

  // Ngày hôm nay.
  const todayKey = dateKey(new Date());

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {WEEK_DAYS.map((day, index) => {
          const isSunday = index === 6;

          return (
            <div
              key={day}
              className={`
                border-r border-gray-100 px-1 py-3
                text-center text-[10px] font-semibold
                tracking-wide last:border-r-0 sm:text-xs
                transition-colors
                ${
                  isSunday
                    ? "bg-red-50/50 text-red-600"
                    : index === 5
                      ? "text-gray-400"
                      : "text-gray-500"
                }
              `}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }, (_, index) => {
          const day = index - offset + 1;
          const valid = day > 0 && day <= totalDays;

          // Ô trống trước và sau tháng.
          if (!valid) {
            return (
              <div
                key={`empty-${index}`}
                aria-hidden="true"
                className="
                  min-h-[100px] border-b border-r
                  border-gray-100 bg-gray-50/50
                  sm:min-h-[145px]
                "
              />
            );
          }

          const current = new Date(
            date.getFullYear(),
            date.getMonth(),
            day
          );

          const key = dateKey(current);
          const isToday = key === todayKey;
          const isSunday = current.getDay() === 0;

          // Lấy công việc diễn ra trong ngày.
          const dayEvents = events.filter(
            (event) =>
              event.startDate <= key &&
              event.endDate >= key
          );

          return (
            <div
              key={key}
              className={`
                group relative min-w-0
                border-b border-r border-gray-100
                p-1.5 transition-colors duration-150
                sm:min-h-[145px] sm:p-2
                ${
                  isSunday
                    ? "hover:bg-red-50/70"
                    : "hover:bg-blue-50/40"
                }
              `}
            >
              {/* Date number */}
              <div className="mb-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onDateClick(current)}
                  aria-label={`Xem công việc ngày ${day}`}
                  aria-current={isToday ? "date" : undefined}
                  className={`
                    flex h-7 w-7 items-center justify-center
                    rounded-full text-xs font-semibold
                    transition-all duration-200
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-blue-300
                    focus-visible:ring-offset-1
                    ${
                      isToday
                        ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                        : isSunday
                          ? "text-red-600 hover:bg-red-100 hover:text-red-700"
                          : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                    }
                  `}
                >
                  {day}
                </button>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-medium text-gray-400">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    compact
                    onClick={onEventClick}
                  />
                ))}

                {/* More events */}
                {dayEvents.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onDateClick(current)}
                    className="
                      w-full rounded px-1 py-0.5
                      text-left text-[10px] font-semibold
                      text-blue-600 transition-colors
                      hover:bg-blue-50 hover:text-blue-700
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-blue-300
                    "
                  >
                    +{dayEvents.length - 3} công việc khác
                  </button>
                )}
              </div>

              {/* Add event */}
              <button
                type="button"
                onClick={() => onDateClick(current)}
                aria-label={`Thêm công việc ngày ${day}`}
                className="
                  mt-1 hidden w-full rounded-md
                  px-2 py-1 text-left
                  text-[10px] font-medium text-blue-600
                  opacity-0 transition-all duration-200
                  hover:bg-blue-50
                  focus-visible:opacity-100
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-blue-300
                  group-hover:opacity-100
                  sm:block
                "
              >
                + Thêm công việc
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
