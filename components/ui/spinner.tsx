/**
 * components/ui/spinner.tsx
 *
 * Loading spinner for async states.
 */

import { cn } from "@/lib/utils/cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full",
        "border-[var(--border)] border-t-[var(--primary)]",
        sizeMap[size],
        className
      )}
    />
  );
}
