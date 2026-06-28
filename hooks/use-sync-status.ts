/**
 * hooks/use-sync-status.ts
 *
 * React hook that subscribes to the sync engine's status.
 * Components use this to show sync indicators in the UI.
 */

"use client";

import { useEffect, useState } from "react";
import { syncEngine, type SyncStatus } from "@/features/sync/sync-engine";

interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  isOnline: boolean;
}

export function useSyncStatus(): SyncState {
  const [state, setState] = useState<SyncState>({
    status: "idle",
    pendingCount: 0,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  });

  useEffect(() => {
    if (!syncEngine) return;

    // Subscribe to sync engine updates
    const unsubscribe = syncEngine.subscribe((status, pending) => {
      setState({
        status,
        pendingCount: pending,
        isOnline: status !== "offline",
      });
    });

    return unsubscribe;
  }, []);

  return state;
}
