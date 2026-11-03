
"use client";

import { useEffect, useRef, useState } from "react";

interface CalendarDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
}

const WEEK_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isValidDate(date: Date): boolean {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

export default function CalendarDatePicker({
  value,
  onChange,
  label = "Chọn ngày",
  disabled = false,
  placeholder = "dd/mm/yyyy",
}: CalendarDatePickerProps) {
  const [month, setMonth] = useState<Date>(() =>
    isValidDate(value) ? getMonthStart(value) : getMonthStart(new Date())
  );

  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Đồng bộ tháng khi giá trị thay đổi từ bên ngoài.
  useEffect(() => {
    if (isValidDate(value)) {
      setMonth(getMonthStart(value));
    }
  }, [value]);

  // Đóng popup khi click bên ngoài hoặc nhấn Escape.
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Tính toán ngày đầu tháng.
  const firstDay = new Date(
    month.getFullYear(),
    month.getMonth(),
    1
  );

  // Chuyển Chủ nhật thành vị trí cuối tuần.
  const offset = (firstDay.getDay() + 6) % 7;

  // Tổng số ngày trong tháng.
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate();

  // Tạo các ô ngày trong lịch.
  const cells = Array.from(
    {
      length: Math.ceil((offset + daysInMonth) / 7) * 7,
    },
    (_, index) => {
      const day = index - offset + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    }
  );

  // Tiêu đề tháng.
  const monthLabel = month.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  // Định dạng ngày được chọn.
  const formattedValue = isValidDate(value)
    ? value.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  // Chuyển tháng.
  const changeMonth = (amount: number) => {
    setMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + amount,
          1
        )
    );
  };

  // Chọn ngày.
  const selectDate = (day: number) => {
    const selectedDate = new Date(
      month.getFullYear(),
      month.getMonth(),
      day
    );

    onChange(selectedDate);
    setOpen(false);
  };

  // Chọn ngày hôm nay.
  const selectToday = () => {
    const today = new Date();

    onChange(today);
    setMonth(getMonthStart(today));
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full min-w-0"
    >
      {/* Trigger */}
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="
          flex h-10 w-full min-w-0
          items-center justify-between gap-3
          rounded-lg border border-gray-200
          bg-white px-3
          text-sm text-gray-700
          transition-all duration-200
          hover:border-blue-300
          focus:outline-none
          focus:border-blue-500
          focus:ring-2 focus:ring-blue-100
          disabled:cursor-not-allowed
          disabled:bg-gray-50
          disabled:text-gray-400
        "
      >
        <span className="flex min-w-0 items-center gap-2">
          {/* Calendar icon */}
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 text-blue-600"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="16"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M16 3v4M8 3v4M3 10h18"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>

          <span className="truncate">
            {formattedValue || placeholder}
          </span>
        </span>

        {/* Chevron */}
        <svg
          viewBox="0 0 24 24"
          className={`
            h-4 w-4 shrink-0 text-gray-400
            transition-transform duration-200
            ${open ? "rotate-180" : ""}
          `}
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m7 10 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Calendar popup */}
      {open && (
        <div
          role="dialog"
          aria-label="Chọn ngày"
          className="
            absolute left-0 top-[calc(100%+8px)]
            z-50 w-[290px]
            max-w-[calc(100vw-32px)]
            rounded-xl border border-gray-200
            bg-white p-4 shadow-xl
            animate-in fade-in zoom-in-95 duration-150
          "
        >
          {/* Month navigation */}
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Tháng trước"
              className="
                flex h-8 w-8 items-center justify-center
                rounded-lg text-gray-500
                transition hover:bg-gray-100
                hover:text-gray-800
                focus:outline-none
                focus:ring-2 focus:ring-blue-100
              "
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m15 18-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <span className="text-sm font-semibold capitalize text-gray-800">
              {monthLabel}
            </span>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Tháng sau"
              className="
                flex h-8 w-8 items-center justify-center
                rounded-lg text-gray-500
                transition hover:bg-gray-100
                hover:text-gray-800
                focus:outline-none
                focus:ring-2 focus:ring-blue-100
              "
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m9 18 6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Week days and dates */}
          <div className="grid grid-cols-7 gap-1">
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className="
                  py-2 text-center
                  text-[11px] font-semibold
                  text-gray-400
                "
              >
                {day}
              </div>
            ))}

            {cells.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${index}`}
                    aria-hidden="true"
                  />
                );
              }

              const date = new Date(
                month.getFullYear(),
                month.getMonth(),
                day
              );

              const selected =
                isValidDate(value) && sameDay(date, value);

              const today = sameDay(date, new Date());

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  aria-label={date.toLocaleDateString("vi-VN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  aria-pressed={selected}
                  className={`
                    flex h-8 items-center justify-center
                    rounded-lg text-xs
                    transition-all duration-150
                    focus:outline-none
                    focus:ring-2 focus:ring-blue-200

                    ${
                      selected
                        ? "bg-blue-600 font-semibold text-white shadow-sm"
                        : today
                          ? "border border-blue-200 font-semibold text-blue-600 hover:bg-blue-50"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div
            className="
              mt-3 flex items-center justify-between
              border-t border-gray-100 pt-3
            "
          >
            <button
              type="button"
              onClick={selectToday}
              className="
                text-xs font-medium text-blue-600
                transition hover:text-blue-700
              "
            >
              Hôm nay
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="
                text-xs font-medium text-gray-500
                transition hover:text-gray-700
              "
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
