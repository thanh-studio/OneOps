
"use client";

interface Props {
  onCreate: () => void;
}

export default function CalendarHeader({ onCreate }: Props) {
  return (
    <header className="
      flex flex-col justify-between gap-4
      border-b border-gray-100 pb-5
      sm:flex-row sm:items-center
    ">
      {/* Page title */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="
          flex h-11 w-11 shrink-0
          items-center justify-center
          rounded-xl bg-blue-50
          text-blue-600
        ">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
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
            <path
              d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="min-w-0">
          <h1 className="
            text-xl font-bold tracking-tight
            text-gray-900 sm:text-2xl
          ">
            Lịch công việc
          </h1>

          <p className="
            mt-1 text-xs text-gray-500
            sm:text-sm
          ">
            Theo dõi, sắp xếp và quản lý tiến độ công việc của nhóm.
          </p>
        </div>
      </div>

      {/* Create button */}
      <button
        type="button"
        onClick={onCreate}
        className="
          inline-flex h-10 shrink-0
          items-center justify-center gap-2
          rounded-lg bg-blue-600
          px-4 text-sm font-semibold text-white
          shadow-sm transition-all duration-150

          hover:bg-blue-700
          hover:shadow-md

          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-blue-300
          focus-visible:ring-offset-2

          active:scale-[0.98]
        "
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        <span>Tạo công việc</span>
      </button>
    </header>
  );
}
