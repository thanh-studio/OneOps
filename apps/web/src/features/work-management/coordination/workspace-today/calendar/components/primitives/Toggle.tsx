
"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
}: ToggleProps) {
  const dimensions =
    size === "sm"
      ? "h-4 w-7"
      : "h-5 w-9";

  const knob =
    size === "sm"
      ? "h-3 w-3"
      : "h-4 w-4";

  const translate =
    size === "sm"
      ? "translate-x-3"
      : "translate-x-4";

  return (
    <div
      className={`
        inline-flex min-w-0 items-center justify-between gap-4
        ${disabled ? "cursor-not-allowed opacity-50" : ""}
      `}
    >
      {(label || description) && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className="
            min-w-0 flex-1 text-left
            focus-visible:outline-none
            focus-visible:underline
            disabled:cursor-not-allowed
          "
        >
          {label && (
            <span className="block text-sm font-medium text-gray-800">
              {label}
            </span>
          )}

          {description && (
            <span className="mt-0.5 block text-xs text-gray-500">
              {description}
            </span>
          )}
        </button>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || description || "Toggle"}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex ${dimensions}
          shrink-0 items-center rounded-full

          transition-colors duration-200

          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-blue-300
          focus-visible:ring-offset-2

          disabled:cursor-not-allowed

          ${checked ? "bg-blue-600" : "bg-gray-300"}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            ${knob}
            absolute left-0.5
            rounded-full bg-white
            shadow-sm

            transition-transform duration-200

            ${checked ? translate : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}
