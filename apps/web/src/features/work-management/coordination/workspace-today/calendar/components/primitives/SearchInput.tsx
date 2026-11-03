
"use client";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  disabled = false,
  className = "",
}: SearchInputProps) {
  return (
    <div
      className={`
        group flex h-10 w-full min-w-0
        items-center gap-2.5
        rounded-lg border border-gray-200
        bg-white px-3

        transition-all duration-150

        hover:border-gray-300

        focus-within:border-blue-500
        focus-within:ring-2
        focus-within:ring-blue-100

        ${
          disabled
            ? "cursor-not-allowed bg-gray-50 opacity-60"
            : ""
        }

        ${className}
      `}
    >
      {/* Search icon */}
      <svg
        viewBox="0 0 24 24"
        className="
          h-[18px] w-[18px] shrink-0
          text-gray-400
          transition-colors duration-150
          group-focus-within:text-blue-600
        "
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="11"
          cy="11"
          r="7"
          stroke="currentColor"
          strokeWidth="1.8"
        />

        <path
          d="m16 16 4 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>

      {/* Search input */}
      <input
        type="search"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="
          h-full w-full min-w-0
          border-0 bg-transparent p-0

          text-sm font-normal
          text-gray-800 outline-none

          placeholder:text-gray-400

          disabled:cursor-not-allowed
          disabled:text-gray-500

          [&::-webkit-search-cancel-button]:cursor-pointer
        "
      />
    </div>
  );
}
