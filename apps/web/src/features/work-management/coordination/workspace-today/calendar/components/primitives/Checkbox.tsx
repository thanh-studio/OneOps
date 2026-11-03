
"use client";

import type { InputHTMLAttributes } from "react";
import { useEffect, useRef } from "react";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
}

export default function Checkbox({
  label,
  description,
  indeterminate = false,
  checked,
  defaultChecked,
  className = "",
  disabled = false,
  ...props
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const isChecked = Boolean(checked ?? defaultChecked);

  const checkboxClasses = `
    relative mt-0.5 flex h-4 w-4 shrink-0
    items-center justify-center
    rounded-[3px] border
    transition-all duration-150 ease-in-out

    ${
      disabled
        ? isChecked || indeterminate
          ? "border-gray-300 bg-gray-300"
          : "border-gray-200 bg-gray-100"
        : isChecked || indeterminate
          ? "border-blue-600 bg-blue-600"
          : "border-gray-300 bg-white hover:border-blue-500"
    }

    peer-focus-visible:ring-2
    peer-focus-visible:ring-blue-200
    peer-focus-visible:ring-offset-1
  `;

  return (
    <label
      className={`
        inline-flex min-w-0 items-start gap-2.5
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
        ${className}
      `}
    >
      <input
        {...props}
        ref={inputRef}
        type="checkbox"
        checked={checked}
        defaultChecked={checked === undefined ? defaultChecked : undefined}
        disabled={disabled}
        aria-checked={
          indeterminate ? "mixed" : checked === undefined ? undefined : checked
        }
        className="peer sr-only"
      />

      {/* Checkbox box */}
      <span className={checkboxClasses}>
        {indeterminate ? (
          <span className="h-0.5 w-2.5 rounded-full bg-white" />
        ) : isChecked ? (
          <svg
            viewBox="0 0 16 16"
            className="h-3 w-3 text-white"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m3 8 3.2 3.2L13 4.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
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
