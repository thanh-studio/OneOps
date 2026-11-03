
"use client";

import type { InputHTMLAttributes } from "react";

interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
}

export default function Radio({
  label,
  description,
  checked,
  defaultChecked,
  disabled = false,
  className = "",
  ...props
}: RadioProps) {
  const isChecked = Boolean(checked ?? defaultChecked);

  return (
    <label
      className={`
        inline-flex min-w-0 items-start gap-2.5

        ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer"
        }

        ${className}
      `}
    >
      {/* Native radio input */}
      <input
        {...props}
        type="radio"
        checked={checked}
        defaultChecked={
          checked === undefined ? defaultChecked : undefined
        }
        disabled={disabled}
        className="peer sr-only"
      />

      {/* Custom radio */}
      <span
        className={`
          mt-0.5 flex h-4 w-4 shrink-0
          items-center justify-center
          rounded-full border bg-white

          transition-all duration-150

          ${
            disabled
              ? isChecked
                ? "border-gray-300 bg-gray-100"
                : "border-gray-200 bg-gray-100"
              : isChecked
                ? "border-blue-600"
                : "border-gray-300 hover:border-blue-500"
          }

          peer-focus-visible:ring-2
          peer-focus-visible:ring-blue-200
          peer-focus-visible:ring-offset-1
        `}
      >
        {isChecked && (
          <span
            className={`
              h-2 w-2 rounded-full
              ${disabled ? "bg-gray-400" : "bg-blue-600"}
            `}
          />
        )}
      </span>

      {/* Label and description */}
      {(label || description) && (
        <span className="min-w-0">
          {label && (
            <span className="block text-sm font-medium leading-5 text-gray-800">
              {label}
            </span>
          )}

          {description && (
            <span className="mt-0.5 block text-xs leading-4 text-gray-500">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}
