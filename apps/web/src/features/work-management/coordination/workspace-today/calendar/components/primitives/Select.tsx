
"use client";

interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Vui lòng chọn",
  disabled = false,
  className = "",
}: SelectProps) {
  return (
    <div className="group relative w-full min-w-0">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className={`
          h-10 w-full min-w-0 appearance-none
          rounded-lg border border-gray-200
          bg-white py-2 pl-3 pr-9

          text-sm font-normal
          text-gray-800

          outline-none
          transition-all duration-150

          hover:border-gray-300

          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-100

          disabled:cursor-not-allowed
          disabled:border-gray-200
          disabled:bg-gray-50
          disabled:text-gray-400

          ${className}
        `}
      >
        <option value="" disabled>
          {placeholder}
        </option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {/* Dropdown icon */}
      <svg
        viewBox="0 0 24 24"
        className={`
          pointer-events-none absolute
          right-3 top-1/2
          h-4 w-4 -translate-y-1/2
          text-gray-400
          transition-colors duration-150

          group-focus-within:text-blue-600

          ${disabled ? "text-gray-300" : ""}
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
    </div>
  );
}
