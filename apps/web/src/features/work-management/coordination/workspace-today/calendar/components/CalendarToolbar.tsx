
"use client";

import CalendarDatePicker from "./CalendarDatePicker";

export type CalendarViewMode = "day" | "week" | "month" | "year";

interface Props {
  date: Date;
  view: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

const VIEWS: { label: string; value: CalendarViewMode }[] = [
  { label: "Ngày", value: "day" },
  { label: "Tuần", value: "week" },
  { label: "Tháng", value: "month" },
  { label: "Năm", value: "year" },
];

const FILTERS = [
  { label: "Tất cả", value: "all" },
  { label: "Cần làm", value: "todo" },
  { label: "Đang làm", value: "in_progress" },
  { label: "Hoàn thành", value: "completed" },
  { label: "Lưu trữ", value: "archived" },
];

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? (
        <path d="m15 18-6-6 6-6" />
      ) : (
        <path d="m9 18 6-6-6-6" />
      )}
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export default function CalendarToolbar({
  date,
  view,
  onDateChange,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Navigation and view selector */}
      <div className="
        flex flex-col justify-between gap-3
        xl:flex-row xl:items-center
      ">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {/* Today */}
          <button
            type="button"
            onClick={onToday}
            className="
              inline-flex h-10 shrink-0 items-center
              justify-center rounded-lg
              border border-gray-200 bg-white
              px-4 text-sm font-semibold text-gray-700
              transition-colors
              hover:border-blue-300 hover:bg-blue-50
              hover:text-blue-600
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-blue-300
            "
          >
            Hôm nay
          </button>

          {/* Previous / Next */}
          <div className="
            flex h-10 shrink-0 items-center
            overflow-hidden rounded-lg
            border border-gray-200 bg-white
          ">
            <button
              type="button"
              onClick={onPrevious}
              aria-label="Khoảng thời gian trước"
              className="
                flex h-full w-10 items-center
                justify-center text-gray-500
                transition-colors
                hover:bg-gray-50 hover:text-blue-600
                focus-visible:z-10
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-inset
                focus-visible:ring-blue-300
              "
            >
              <ChevronIcon direction="left" />
            </button>

            <div className="h-5 w-px bg-gray-100" />

            <button
              type="button"
              onClick={onNext}
              aria-label="Khoảng thời gian tiếp theo"
              className="
                flex h-full w-10 items-center
                justify-center text-gray-500
                transition-colors
                hover:bg-gray-50 hover:text-blue-600
                focus-visible:z-10
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-inset
                focus-visible:ring-blue-300
              "
            >
              <ChevronIcon direction="right" />
            </button>
          </div>

          {/* Date picker */}
          <div className="w-44 shrink-0">
            <CalendarDatePicker
              value={date}
              onChange={onDateChange}
            />
          </div>
        </div>

        {/* View modes */}
        <div
          className="
            inline-flex w-fit max-w-full
            overflow-x-auto rounded-lg
            border border-gray-200 bg-gray-50 p-1
          "
          role="group"
          aria-label="Chế độ xem lịch"
        >
          {VIEWS.map((item) => {
            const active = view === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onViewChange(item.value)}
                aria-pressed={active}
                className={`
                  shrink-0 whitespace-nowrap
                  rounded-md px-4 py-2
                  text-xs font-semibold sm:text-sm
                  transition-all
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-blue-300
                  ${
                    active
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }
                `}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters and search */}
      <div className="
        flex min-w-0 flex-col gap-3
        lg:flex-row lg:items-center
        lg:justify-between
      ">
        {/* Status filters */}
        <div className="min-w-0 flex-1 overflow-x-auto pb-1">
          <div className="flex w-max min-w-full items-center gap-2">
            {FILTERS.map((filter) => {
              const active = statusFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => onStatusFilterChange(filter.value)}
                  aria-pressed={active}
                  className={`
                    inline-flex shrink-0 items-center
                    justify-center whitespace-nowrap
                    rounded-lg border px-3.5 py-2
                    text-xs font-medium transition-colors
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-blue-300
                    ${
                      active
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-600"
                    }
                  `}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full shrink-0 lg:w-64 xl:w-72">
          <span className="
            pointer-events-none absolute
            left-3 top-1/2 -translate-y-1/2
            text-gray-400
          ">
            <SearchIcon />
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm kiếm công việc..."
            aria-label="Tìm kiếm công việc"
            className="
              h-10 w-full rounded-lg
              border border-gray-200 bg-white
              pl-9 pr-3 text-sm text-gray-700
              outline-none transition-all
              placeholder:text-gray-400
              hover:border-gray-300
              focus:border-blue-500
              focus:ring-2 focus:ring-blue-100
            "
          />
        </div>
      </div>
    </div>
  );
}
