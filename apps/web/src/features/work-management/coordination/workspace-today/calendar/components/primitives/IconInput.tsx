
"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
} from "react";

interface IconInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  helperText?: string;
  error?: string;
}

export default function IconInput({
  icon,
  helperText,
  error,
  className = "",
  disabled = false,
  id,
  ...props
}: IconInputProps) {
  const inputId =
    id || props.name || props.type || "icon-input";

  return (
    <div className="group min-w-0 w-full">
      {/* Input container */}
      <div
        className={`
          flex h-10 min-w-0 items-center gap-2.5
          rounded-lg border bg-white px-3

          transition-all duration-150

          ${
            error
              ? "border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100"
              : "border-gray-200 hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
          }

          ${
            disabled
              ? "cursor-not-allowed bg-gray-50 opacity-60"
              : ""
          }
        `}
      >
        {/* Icon */}
        {icon && (
          <span
            className={`
              flex shrink-0 items-center justify-center
              transition-colors

              ${
                error
                  ? "text-red-500"
                  : "text-gray-400 group-focus-within:text-blue-600"
              }
            `}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        {/* Input */}
        <input
          {...props}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error || helperText
              ? `${inputId}-description`
              : undefined
          }
          className={`
            h-full w-full min-w-0
            border-0 bg-transparent p-0

            text-sm font-normal text-gray-800
            outline-none

            placeholder:text-gray-400

            disabled:cursor-not-allowed
            disabled:text-gray-500

            ${className}
          `}
        />
      </div>

      {/* Helper text / Error */}
      {(helperText || error) && (
        <p
          id={`${inputId}-description`}
          role={error ? "alert" : undefined}
          className={`
            mt-1.5 text-xs leading-4

            ${
              error
                ? "text-red-500"
                : "text-gray-500"
            }
          `}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}
