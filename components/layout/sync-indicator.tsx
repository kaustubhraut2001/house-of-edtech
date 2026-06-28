/**
 * components/layout/sync-indicator.tsx
 *
 * Shows real-time sync status in the sidebar.
 * Green = synced, Yellow = syncing, Red = error, Grey = offline.
 */

"use client";

import { useSyncStatus } from "@/hooks/use-sync-status";
import { cn } from "@/lib/utils/cn";
import {
  Cloud,
  CloudOff,
  CloudUpload,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export function SyncIndicator() {
  const { status, pendingCount, isOnline } = useSyncStatus();

  const config = {
    idle: {
      icon: CheckCircle2,
      label: "All changes saved",
      color: "text-emerald-500",
      dot: "bg-emerald-500",
    },
    syncing: {
      icon: CloudUpload,
      label: `Syncing ${pendingCount} change${pendingCount !== 1 ? "s" : ""}…`,
      color: "text-amber-500",
      dot: "bg-amber-500 animate-pulse",
    },
    error: {
      icon: AlertCircle,
      label: "Sync failed — will retry",
      color: "text-red-500",
      dot: "bg-red-500",
    },
    offline: {
      icon: CloudOff,
      label: "Offline — changes queued",
      color: "text-slate-400",
      dot: "bg-slate-400",
    },
  };

  const { icon: Icon, label, color, dot } = config[status];

  return (
    <div
      className="flex items-center gap-2 text-xs"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span
        className={cn("h-2 w-2 rounded-full shrink-0", dot)}
        aria-hidden="true"
      />
      <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} aria-hidden="true" />
      <span className={cn("truncate", color)}>{label}</span>
    </div>
  );
}

/** Compact version for the editor toolbar */
export function SyncBadge() {
  const { status } = useSyncStatus();

  if (status === "idle") {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <Cloud className="h-3.5 w-3.5" />
        Saved
      </span>
    );
  }

  if (status === "syncing") {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600 animate-pulse-soft">
        <CloudUpload className="h-3.5 w-3.5" />
        Saving…
      </span>
    );
  }

  if (status === "offline") {
    return (
      <span className="flex items-center gap-1 text-xs text-slate-500">
        <CloudOff className="h-3.5 w-3.5" />
        Offline
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="h-3.5 w-3.5" />
      Sync error
    </span>
  );
}
