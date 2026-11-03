
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

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getWeek(date: Date) {
  const monday = new Date(date);
  const dayOfWeek = (monday.getDay() + 6) % 7;

  monday.setDate(monday.getDate() - dayOfWeek);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);

    return current;
  });
}

function isSameDay(first: Date, second: Date) {
  return dateKey(first) === dateKey(second);
}

export default function CalendarWeekView({
  date,
  events,
  onEventClick,
  onSlotClick,
}: Props) {
  const days = getWeek(date);
  const today = new Date();

  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
      <div className="min-w-[760px]">
        {/* Week header */}
        <div className="sticky top-0 z-10 grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="border-r border-[#E2E8F0]" />

          {days.map((day) => {
            const isToday = isSameDay(day, today);

            return (
              <div
                key={dateKey(day)}
                className="border-r border-[#E2E8F0] px-2 py-3 text-center last:border-r-0"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {day.toLocaleDateString("vi-VN", {
                    weekday: "short",
                  })}
                </p>

                <div
                  className={`mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isToday
                      ? "bg-[#2563EB] text-white shadow-sm"
                      : "text-gray-700"
                  }`}
                >
                  {day.getDate()}
                </div>

                {isToday && (
                  <p className="mt-1 text-[10px] font-medium text-[#2563EB]">
                    Hôm nay
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
          {/* Hour labels */}
          <div className="border-r border-[#E2E8F0] bg-white">
            {HOURS.map((hour) => {
              const hourText = String(hour).padStart(2, "0");

              return (
                <div
                  key={hour}
                  className="h-[68px] border-b border-[#F1F5F9] pr-2 pt-2 text-right text-[11px] font-medium tabular-nums text-gray-400"
                >
                  {hourText}:00
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const key = dateKey(day);

            const dayEvents = events.filter(
              (event) => event.startDate <= key && event.endDate >= key
            );

            const isToday = isSameDay(day, today);

            return (
              <div
                key={key}
                className={`min-w-0 border-r border-[#E2E8F0] last:border-r-0 ${
                  isToday ? "bg-blue-50/[0.18]" : "bg-white"
                }`}
              >
                {HOURS.map((hour) => {
                  const hourText = String(hour).padStart(2, "0");

                  const hourEvents = dayEvents.filter(
                    (event) =>
                      !event.allDay &&
                      event.startTime?.slice(0, 2) === hourText
                  );

                  return (
                    <div
                      key={hour}
                      className="group relative flex h-[68px] min-w-0 flex-col overflow-hidden border-b border-[#F1F5F9] p-1 transition-colors hover:bg-blue-50/50"
                    >
                      {/* Events */}
                      <div className="min-h-0 flex-1 overflow-y-auto">
                        {hourEvents.map((event) => (
                          <div key={event.id} className="mb-1">
                            <CalendarEventCard
                              event={event}
                              compact
                              onClick={onEventClick}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Create event action */}
                      <button
                        type="button"
                        onClick={() => onSlotClick(day, `${hourText}:00`)}
                        className="absolute inset-x-1 bottom-1 flex h-5 items-center justify-center rounded-md text-xs font-semibold text-transparent opacity-0 transition-all hover:bg-blue-100 hover:text-[#2563EB] focus-visible:opacity-100 focus-visible:bg-blue-100 focus-visible:text-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] group-hover:opacity-100 group-hover:text-[#2563EB]"
                        aria-label={`Tạo công việc ngày ${day.toLocaleDateString(
                          "vi-VN"
                        )} lúc ${hourText}:00`}
                        title={`Tạo công việc lúc ${hourText}:00`}
                      >
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
