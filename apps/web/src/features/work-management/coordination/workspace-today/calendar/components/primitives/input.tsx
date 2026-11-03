
"use client";

import {
  type ComponentProps,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "./utils";

export const inputStyles =
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";

export interface InputProps
  extends ComponentProps<"input"> {
  error?: string;
}

export function Input({
  className,
  error,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      <input
        className={cn(
          inputStyles,
          error &&
            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
          className,
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />

      {error && (
        <p className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function Textarea({
  className,
  error,
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      <textarea
        className={cn(
          "flex min-h-24 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
          error &&
            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
          className,
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />

      {error && (
        <p className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export function Select({
  className,
  error,
  children,
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      <select
        className={cn(
          inputStyles,
          "cursor-pointer",
          error &&
            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
          className,
        )}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>

      {error && (
        <p className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
