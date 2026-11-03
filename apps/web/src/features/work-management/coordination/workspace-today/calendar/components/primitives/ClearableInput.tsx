
"use client";

interface ClearableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function ClearableInput({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  disabled = false,
  className = "",
}: ClearableInputProps) {
  const hasValue = value.length > 0;

  return (
    <div
      className={`
        group flex h-10 min-w-0 items-center gap-2
        rounded-lg border border-gray-200
        bg-white px-3
        transition-all duration-150

        hover:border-gray-300

        focus-within:border-blue-500
        focus-within:ring-2
        focus-within:ring-blue-100

        ${
          disabled
            ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
            : ""
        }

        ${className}
      `}
    >
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="
          h-full w-full min-w-0
          border-0 bg-transparent
          p-0 text-sm font-normal
          text-gray-800 outline-none

          placeholder:text-gray-400
          placeholder:font-normal

          disabled:cursor-not-allowed
          disabled:text-gray-500
        "
      />

      {hasValue && !disabled && (
        <button
          type="button"
          aria-label="Xóa nội dung"
          title="Xóa nội dung"
          onClick={() => onChange("")}
          className="
            flex h-6 w-6 shrink-0
            items-center justify-center
            rounded-md text-gray-400

            transition-colors duration-150

            hover:bg-gray-100
            hover:text-gray-700

            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-blue-500
            focus-visible:ring-offset-1

            active:bg-gray-200
          "
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M18 6 6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
