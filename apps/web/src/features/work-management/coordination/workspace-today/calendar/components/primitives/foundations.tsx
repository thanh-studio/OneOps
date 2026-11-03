
"use client";

import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "destructive"
    | "outline";
}

const variants: Record<
  NonNullable<BadgeProps["variant"]>,
  string
> = {
  default:
    "border-transparent bg-blue-600 text-white",

  secondary:
    "border-transparent bg-gray-100 text-gray-700",

  success:
    "border-transparent bg-green-100 text-green-700",

  warning:
    "border-transparent bg-yellow-100 text-yellow-800",

  destructive:
    "border-transparent bg-red-100 text-red-700",

  outline:
    "border border-gray-300 bg-transparent text-gray-700",
};

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
