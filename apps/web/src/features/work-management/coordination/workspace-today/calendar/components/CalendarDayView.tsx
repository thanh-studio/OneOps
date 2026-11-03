
"use client";

import type { CalendarEvent } from "../types/calendar.types";
import CalendarEventCard from "./CalendarEvent";

interface Props {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (date: Date, time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, index) => index);

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarDayView({
  date,
  events,
  onEventClick,
  onSlotClick,
}: Props) {
  const key = toDateKey(date);
  const today = sameDay(date, new Date());

  const dayEvents = events.filter(
    (event) => event.startDate <= key && event.endDate >= key
  );

  const allDayEvents = dayEvents.filter((event) => event.allDay);

  const now = new Date();
  const showCurrentTime = today;
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  return (
    <div className="
      min-w-0 overflow-hidden
      rounded-xl border border-gray-200
      bg-white shadow-sm
    ">
      {/* Day header */}
      <div className="
        grid grid-cols-[68px_minmax(0,1fr)]
        border-b border-gray-100
        bg-gray-50/70
      ">
        <div className="border-r border-gray-100" />

        <div className="flex items-center gap-3 px-4 py-3">
          <div className={`
            flex h-11 w-11 shrink-0 flex-col
            items-center justify-center rounded-xl

            ${
              today
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-800 ring-1 ring-gray-200"
            }
          `}>
            <span className="text-lg font-bold leading-none">
              {date.getDate()}
            </span>
          </div>

          <div className="min-w-0">
            <p className="
              text-xs font-semibold uppercase
              tracking-wide text-gray-500
            ">
              {date.toLocaleDateString("vi-VN", {
                weekday: "long",
              })}
            </p>

            <p className="mt-0.5 text-xs text-gray-400">
              {date.toLocaleDateString("vi-VN", {
                month: "long",
                year: "numeric",
              })}
              {today && (
                <span className="ml-2 font-medium text-blue-600">
                  Hôm nay
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* All-day events */}
      <div className="
        grid grid-cols-[68px_minmax(0,1fr)]
        border-b border-gray-200
        bg-white
      ">
        <div className="
          flex items-start justify-end
          border-r border-gray-100
          px-2 pt-3
        ">
          <span className="text-[10px] font-medium text-gray-400">
            Cả ngày
          </span>
        </div>

        <div className="min-w-0 space-y-1 p-2">
          {allDayEvents.length > 0 ? (
            allDayEvents.map((event) => (
              <CalendarEventCard
                key={event.id}
                event={event}
                onClick={onEventClick}
              />
            ))
          ) : (
            <button
              type="button"
              onClick={() => onSlotClick(date, "08:00")}
              className="
                w-full rounded-lg px-3 py-2
                text-left text-xs text-gray-400
                transition-colors
                hover:bg-blue-50 hover:text-blue-600
              "
            >
              + Thêm công việc cả ngày
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="max-h-[650px] overflow-y-auto">
        {HOURS.map((hour) => {
          const time = `${String(hour).padStart(2, "0")}:00`;

          const hourEvents = dayEvents.filter((event) => {
            if (event.allDay || !event.startTime) return false;

            return (
              event.startTime.slice(0, 2) ===
              String(hour).padStart(2, "0")
            );
          });

          const isCurrentHour =
            showCurrentTime && currentHour === hour;

          return (
            <div
              key={hour}
              className="
                grid min-h-[66px]
                grid-cols-[68px_minmax(0,1fr)]
              "
            >
              {/* Time label */}
              <div className="
                relative border-r border-b
                border-gray-100 px-2 pt-2
                text-right
              ">
                <span className={`
                  text-[11px] font-medium
                  tabular-nums
                  ${isCurrentHour ? "text-blue-600" : "text-gray-400"}
                `}>
                  {time}
                </span>
              </div>

              {/* Time slot */}
              <div className={`
                group relative min-w-0
                border-b border-gray-100
                p-1.5 transition-colors
                hover:bg-gray-50/70
                ${isCurrentHour ? "bg-blue-50/20" : ""}
              `}>
                {hourEvents.map((event) => (
                  <div key={event.id} className="relative z-10 mb-1">
                    <CalendarEventCard
                      event={event}
                      onClick={onEventClick}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => onSlotClick(date, time)}
                  aria-label={`Thêm công việc lúc ${time}`}
                  className="
                    flex min-h-8 w-full
                    items-center rounded-md
                    px-2 text-left text-xs
                    text-transparent
                    transition-colors

                    hover:bg-blue-50
                    hover:text-blue-600

                    focus-visible:bg-blue-50
                    focus-visible:text-blue-600
                    focus-visible:outline-none
                  "
                >
                  + Thêm công việc
                </button>

                {/* Current time indicator */}
                {isCurrentHour && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20"
                    style={{
                      top: `${(currentMinutes / 60) * 100}%`,
                    }}
                  >
                    <div className="relative flex items-center">
                      <span className="
                        absolute -left-[4px]
                        h-2 w-2 rounded-full
                        bg-red-500
                      " />
                      <div className="h-px w-full bg-red-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
