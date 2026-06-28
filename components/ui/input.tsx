/**
 * components/ui/input.tsx
 *
 * Accessible form input with consistent styling.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional error state styling */
  hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, hasError, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm",
          "border-[var(--input)] text-[var(--foreground)]",
          "placeholder:text-[var(--muted-foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors",
          hasError && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]",
          className
        )}
        aria-invalid={hasError}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
