/**
 * components/ui/toaster.tsx
 *
 * Toast notification system using Radix UI Toast.
 */

"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ── Hook ──────────────────────────────────────
type ToastVariant = "default" | "destructive" | "success";

interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

let toastCount = 0;
let addToastFn: ((toast: ToastData) => void) | null = null;

export function toast(data: Omit<ToastData, "id">) {
  const id = `toast-${++toastCount}`;
  addToastFn?.({ id, ...data });
}

// ── Component ─────────────────────────────────
export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  React.useEffect(() => {
    addToastFn = (t) => setToasts((prev) => [...prev, t]);
    return () => { addToastFn = null; };
  }, []);

  const remove = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastPrimitives.Provider swipeDirection="right">
      {toasts.map((t) => (
        <ToastPrimitives.Root
          key={t.id}
          duration={t.duration ?? 4000}
          onOpenChange={(open) => !open && remove(t.id)}
          className={cn(
            "group pointer-events-auto relative flex w-full items-center justify-between",
            "space-x-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all",
            "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
            "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
            "data-[state=open]:animate-fade-in",
            t.variant === "destructive"
              ? "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
              : t.variant === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
              : "border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)]"
          )}
        >
          <div className="flex flex-col gap-1">
            {t.title && (
              <ToastPrimitives.Title className="text-sm font-semibold">
                {t.title}
              </ToastPrimitives.Title>
            )}
            {t.description && (
              <ToastPrimitives.Description className="text-sm opacity-90">
                {t.description}
              </ToastPrimitives.Description>
            )}
          </div>
          <ToastPrimitives.Close
            className="shrink-0 rounded-md p-1 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </ToastPrimitives.Close>
        </ToastPrimitives.Root>
      ))}

      <ToastPrimitives.Viewport
        className={cn(
          "fixed bottom-4 right-4 z-[100] flex max-h-screen w-full flex-col-reverse gap-2",
          "sm:max-w-[380px]"
        )}
      />
    </ToastPrimitives.Provider>
  );
}
