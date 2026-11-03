
"use client";

import { useMemo } from "react";
import type {
  CalendarEvent,
  CalendarUser,
} from "../types/calendar.types";

interface Props {
  date: Date;
  events: CalendarEvent[];
  users?: CalendarUser[];
  onDateChange: (date: Date) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

const STATUS_ITEMS = [
  { label: "Cần làm", value: "todo", color: "bg-gray-400" },
  { label: "Đang làm", value: "in_progress", color: "bg-blue-500" },
  { label: "Hoàn thành", value: "completed", color: "bg-emerald-500" },
  { label: "Đã hủy", value: "cancelled", color: "bg-red-400" },
];

const WEEK_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getInitial(name: string) {
  return name?.trim().charAt(0).toUpperCase() || "?";
}

export default function CalendarSidebar({
  date,
  events,
  users = [],
  onDateChange,
  collapsed = false,
  onToggle,
}: Props) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;

  const totalDays = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();

  const cells = Array.from(
    { length: Math.ceil((offset + totalDays) / 7) * 7 },
    (_, index) => {
      const day = index - offset + 1;
      return day > 0 && day <= totalDays ? day : null;
    }
  );

  const counts = useMemo(() => {
    const statusCounts = new Map<string, number>();

    for (const event of events) {
      statusCounts.set(
        event.status,
        (statusCounts.get(event.status) || 0) + 1
      );
    }

    return STATUS_ITEMS.map((item) => ({
      ...item,
      count: statusCounts.get(item.value) || 0,
    }));
  }, [events]);

  const eventDateKeys = useMemo(() => {
    return events.map((event) => ({
      startDate: event.startDate,
      endDate: event.endDate,
    }));
  }, [events]);

  const monthLabel = date.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  const todayKey = dateKey(new Date());
  const selectedKey = dateKey(date);

  // Collapsed sidebar
  if (collapsed) {
    return (
      <aside
        className="
          flex w-12 shrink-0 flex-col items-center
          gap-3 rounded-xl border border-gray-200
          bg-white py-4
        "
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label="Mở thanh bên"
          className="
            flex h-8 w-8 items-center justify-center
            rounded-lg text-gray-500 transition
            hover:bg-blue-50 hover:text-blue-600
            focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-blue-300
          "
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <span className="
          flex h-8 w-8 items-center justify-center
          rounded-lg bg-blue-50 text-blue-600
        ">
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
        </span>
      </aside>
    );
  }

  return (
    <aside
      className="
        w-full shrink-0 space-y-5
        rounded-xl border border-gray-200
        bg-white p-4
        lg:w-[250px]
      "
    >
      {/* Sidebar heading */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">
          Lịch của tôi
        </h2>

        <button
          type="button"
          onClick={onToggle}
          aria-label="Thu gọn thanh bên"
          className="
            hidden h-7 w-7 items-center justify-center
            rounded-md text-gray-400 transition
            hover:bg-gray-100 hover:text-gray-700
            focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-blue-300
            lg:flex
          "
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Mini calendar */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold capitalize text-gray-800">
            {monthLabel}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Tháng trước"
              onClick={() =>
                onDateChange(
                  new Date(date.getFullYear(), date.getMonth() - 1, 1)
                )
              }
              className="
                flex h-7 w-7 items-center justify-center
                rounded-md text-gray-500 transition
                hover:bg-gray-100 hover:text-gray-800
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-blue-300
              "
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              aria-label="Tháng tiếp theo"
              onClick={() =>
                onDateChange(
                  new Date(date.getFullYear(), date.getMonth() + 1, 1)
                )
              }
              className="
                flex h-7 w-7 items-center justify-center
                rounded-md text-gray-500 transition
                hover:bg-gray-100 hover:text-gray-800
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-blue-300
              "
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-2">
          {WEEK_DAYS.map((day) => (
            <span
              key={day}
              className="
                py-1 text-center text-[10px]
                font-semibold text-gray-400
              "
            >
              {day}
            </span>
          ))}

          {cells.map((day, index) => {
            if (!day) {
              return <span key={`empty-${index}`} />;
            }

            const current = new Date(
              date.getFullYear(),
              date.getMonth(),
              day
            );

            const currentKey = dateKey(current);
            const selected = currentKey === selectedKey;
            const today = currentKey === todayKey;

            const hasEvents = eventDateKeys.some(
              (event) =>
                event.startDate <= currentKey &&
                event.endDate >= currentKey
            );

            return (
              <button
                key={day}
                type="button"
                onClick={() => onDateChange(current)}
                aria-label={`Chọn ngày ${day}`}
                aria-pressed={selected}
                className={`
                  relative mx-auto flex h-8 w-8
                  items-center justify-center
                  rounded-full text-xs transition-all
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-blue-300
                  ${
                    selected
                      ? "bg-blue-600 font-semibold text-white shadow-sm"
                      : today
                        ? "font-semibold text-blue-600 hover:bg-blue-50"
                        : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                  }
                `}
              >
                {day}

                {hasEvents && !selected && (
                  <span className="
                    absolute bottom-0.5 left-1/2
                    h-1 w-1 -translate-x-1/2
                    rounded-full bg-blue-500
                  " />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Employee list - independent vertical scroll */}
      <section className="border-t border-gray-100 pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="
            text-[11px] font-bold
            uppercase tracking-wider text-gray-400
          ">
            Danh sách nhân viên
          </h3>

          <span className="
            rounded-full bg-blue-50
            px-2 py-0.5 text-[11px]
            font-semibold text-blue-600
          ">
            {users.length}
          </span>
        </div>

        {users.length > 0 ? (
          <div
            className="
              max-h-52 overflow-y-auto
              overscroll-contain
              rounded-lg border border-gray-100
              scrollbar-thin
            "
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="divide-y divide-gray-100">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="
                    flex min-w-0 items-center gap-2.5
                    px-2.5 py-2.5
                    transition-colors hover:bg-gray-50
                  "
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      className="
                        h-8 w-8 shrink-0
                        rounded-full object-cover
                      "
                    />
                  ) : (
                    <div
                      className="
                        flex h-8 w-8 shrink-0
                        items-center justify-center
                        rounded-full text-xs
                        font-semibold text-white
                      "
                      style={{
                        backgroundColor: user.color || "#2563EB",
                      }}
                    >
                      {getInitial(user.name)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-700">
                      {user.name}
                    </p>

                    {user.email && (
                      <p className="mt-0.5 truncate text-[10px] text-gray-400">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="
            rounded-lg border border-dashed
            border-gray-200 bg-gray-50
            px-3 py-5 text-center
          ">
            <p className="text-xs text-gray-400">
              Chưa có nhân viên.
            </p>
          </div>
        )}
      </section>

      {/* Status statistics */}
      <section className="border-t border-gray-100 pt-4">
        <h3 className="
          mb-3 text-[11px] font-bold
          uppercase tracking-wider text-gray-400
        ">
          Trạng thái công việc
        </h3>

        <div className="space-y-3">
          {counts.map((item) => (
            <div
              key={item.value}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2 text-xs text-gray-600">
                <span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                {item.label}
              </span>

              <span className="text-xs font-semibold tabular-nums text-gray-800">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Total tasks */}
      <section className="
        rounded-xl border border-blue-100
        bg-blue-50/70 p-3
      ">
        <p className="text-xs font-semibold text-blue-800">
          Tổng công việc
        </p>

        <p className="mt-1 text-2xl font-bold tabular-nums text-blue-700">
          {events.length}
        </p>

        <p className="mt-1 text-[11px] leading-5 text-blue-600">
          Công việc đang được quản lý trên lịch.
        </p>
      </section>
    </aside>
  );
}
