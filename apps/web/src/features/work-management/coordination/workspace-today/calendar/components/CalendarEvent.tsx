
"use client";

import type { CalendarEvent as CalendarEventType } from "../types/calendar.types";

interface Props {
  event: CalendarEventType;
  compact?: boolean;
  onClick?: (event: CalendarEventType) => void;
}

const STATUS_STYLES: Record<string, string> = {
  todo: `
    border-l-gray-400
    bg-gray-50 text-gray-700
    hover:bg-gray-100
  `,
  in_progress: `
    border-l-blue-500
    bg-blue-50 text-blue-700
    hover:bg-blue-100
  `,
  completed: `
    border-l-emerald-500
    bg-emerald-50 text-emerald-700
    hover:bg-emerald-100
  `,
  review: `
    border-l-amber-500
    bg-amber-50 text-amber-700
    hover:bg-amber-100
  `,
  cancelled: `
    border-l-red-400
    bg-red-50 text-red-600
    hover:bg-red-100
  `,
};

const PRIORITY_DOTS: Record<string, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export default function CalendarEvent({
  event,
  compact = false,
  onClick,
}: Props) {
  const statusStyle =
    STATUS_STYLES[event.status] || STATUS_STYLES.todo;

  const priorityDot =
    PRIORITY_DOTS[event.priority] || PRIORITY_DOTS.medium;

  const timeLabel = event.allDay
    ? "Cả ngày"
    : event.startTime || "Chưa xác định";

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      title={`${event.title} (${timeLabel})`}
      aria-label={`${event.title}, ${timeLabel}`}
      className={`
        group block w-full min-w-0
        overflow-hidden rounded-md
        border-l-[3px]
        text-left

        transition-all duration-150

        hover:shadow-sm
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-300
        focus-visible:ring-offset-1

        ${statusStyle}

        ${
          compact
            ? "px-1.5 py-1"
            : "px-2.5 py-2"
        }
      `}
    >
      {/* Event title and metadata */}
      <div className="flex min-w-0 items-center gap-1.5">
        {!event.allDay && event.startTime && (
          <span className="
            shrink-0 text-[10px]
            font-semibold tabular-nums
            opacity-75
          ">
            {event.startTime}
          </span>
        )}

        <span className={`
          min-w-0 flex-1 truncate
          font-semibold leading-snug
          ${compact ? "text-[10px]" : "text-xs"}
        `}>
          {event.title}
        </span>

        {/* Priority indicator */}
        <span
          className={`
            h-1.5 w-1.5 shrink-0
            rounded-full ${priorityDot}
          `}
          title={`Priority: ${event.priority}`}
          aria-label={`Priority: ${event.priority}`}
        />
      </div>

      {/* Assignee */}
      {!compact && event.assignee?.name && (
        <div className="
          mt-1 flex min-w-0 items-center gap-1
          text-[10px] opacity-70
        ">
          <svg
            viewBox="0 0 24 24"
            className="h-3 w-3 shrink-0"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="8"
              r="4"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>

          <span className="truncate">
            {event.assignee.name}
          </span>
        </div>
      )}
    </button>
  );
}
