/**
 * features/sync/sync-engine.ts
 *
 * The core Sync Engine — runs entirely on the client.
 *
 * Responsibilities:
 *  1. Detect online / offline status
 *  2. Drain the local IndexedDB operation queue when online
 *  3. Retry failed operations with exponential backoff
 *  4. Deduplicate operations before sending
 *  5. Merge server responses back into local IndexedDB
 *  6. Emit events so UI components can react
 */

import {
  getAllPendingOperations,
  updateOperationStatus,
  upsertLocalDocument,
  getLocalDocument,
} from "@/lib/db/local";
import { exponentialBackoff, sleep } from "@/lib/utils/format";
import type { LocalOperation, SyncResult } from "@/types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type SyncStatus = "idle" | "syncing" | "error" | "offline";

type SyncListener = (status: SyncStatus, pending: number) => void;

// ─────────────────────────────────────────────
// Singleton Sync Engine
// ─────────────────────────────────────────────
class SyncEngine {
  private status: SyncStatus = "idle";
  private listeners: Set<SyncListener> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  // How often to attempt background sync (ms)
  private readonly SYNC_INTERVAL_MS = 5_000;

  // ── Lifecycle ────────────────────────────────

  /** Start the background sync loop. Call once on app mount. */
  start() {
    if (this.intervalId) return; // Already running

    // Listen for online/offline events
    window.addEventListener("online", () => this.onOnline());
    window.addEventListener("offline", () => this.onOffline());

    // Initial status
    this.setStatus(navigator.onLine ? "idle" : "offline");

    // Run a sync immediately, then on interval
    this.runSync();
    this.intervalId = setInterval(() => this.runSync(), this.SYNC_INTERVAL_MS);
  }

  /** Stop the background sync loop. Call on app unmount / logout. */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    window.removeEventListener("online", () => this.onOnline());
    window.removeEventListener("offline", () => this.onOffline());
  }

  /** Subscribe to sync status changes */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Emit current status immediately to new subscriber
    listener(this.status, 0);
    return () => this.listeners.delete(listener);
  }

  /** Trigger an immediate sync (e.g. after saving a document offline) */
  async triggerSync() {
    await this.runSync();
  }

  // ── Internal ─────────────────────────────────

  private onOnline() {
    this.setStatus("idle");
    this.runSync(); // Drain queue immediately on reconnect
  }

  private onOffline() {
    this.setStatus("offline");
  }

  private setStatus(status: SyncStatus, pending = 0) {
    this.status = status;
    this.listeners.forEach((l) => l(status, pending));
  }

  private async runSync() {
    // Guard: don't run if already syncing or offline
    if (this.isRunning || !navigator.onLine) return;

    this.isRunning = true;

    try {
      const pending = await getAllPendingOperations();

      if (pending.length === 0) {
        this.setStatus("idle", 0);
        return;
      }

      this.setStatus("syncing", pending.length);

      // Group operations by document to send in batches
      const byDocument = groupByDocument(pending);

      for (const [documentId, ops] of Object.entries(byDocument)) {
        await this.syncDocument(documentId, ops);
      }

      // Check if any are still pending (failed)
      const remaining = await getAllPendingOperations();
      this.setStatus(remaining.length > 0 ? "error" : "idle", remaining.length);
    } catch (err) {
      console.error("[SyncEngine] Sync failed:", err);
      this.setStatus("error", 0);
    } finally {
      this.isRunning = false;
    }
  }

  private async syncDocument(
    documentId: string,
    ops: LocalOperation[]
  ): Promise<void> {
    // Max retry attempts per operation
    const MAX_RETRIES = 3;

    // Filter out operations that have exceeded retry limit
    const eligible = ops.filter((op) => op.retryCount < MAX_RETRIES);

    if (eligible.length === 0) return;

    // Deduplicate: if multiple UPDATE_CONTENT ops exist, keep only latest
    const deduplicated = deduplicateOps(eligible);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: deduplicated }),
      });

      if (!res.ok) {
        // Mark all as failed and schedule retry
        for (const op of deduplicated) {
          await updateOperationStatus(op.id, "PENDING", {
            retryCount: op.retryCount + 1,
            lastAttemptAt: new Date().toISOString(),
          });

          // Exponential backoff before next retry
          await sleep(exponentialBackoff(op.retryCount));
        }
        return;
      }

      const { data } = await res.json();
      const results: SyncResult[] = data.results;

      // Process each result
      for (const result of results) {
        const op = deduplicated.find((o) => o.id === result.operationId);
        if (!op) continue;

        if (result.status === "synced") {
          await updateOperationStatus(op.id, "SYNCED", {
            lastAttemptAt: new Date().toISOString(),
          });

          // Update local document revision if server returned one
          if (result.serverRevision !== undefined) {
            const localDoc = await getLocalDocument(documentId);
            if (localDoc) {
              await upsertLocalDocument({
                ...localDoc,
                revision: result.serverRevision,
                lastSyncedAt: new Date().toISOString(),
              });
            }
          }
        } else if (result.status === "conflict") {
          await updateOperationStatus(op.id, "CONFLICT");

          // Update local with server's authoritative state
          if (result.serverRevision !== undefined && result.conflictData) {
            const localDoc = await getLocalDocument(documentId);
            if (localDoc) {
              await upsertLocalDocument({
                ...localDoc,
                title: result.conflictData.serverTitle,
                content: result.conflictData.serverContent,
                revision: result.serverRevision,
                lastSyncedAt: new Date().toISOString(),
              });
            }
          }

          console.warn("[SyncEngine] Conflict detected for op:", op.id);
        } else {
          await updateOperationStatus(op.id, "FAILED", {
            retryCount: op.retryCount + 1,
            lastAttemptAt: new Date().toISOString(),
          });
        }
      }
    } catch (networkErr) {
      // Network error — increment retry count for all ops in this batch
      for (const op of deduplicated) {
        await updateOperationStatus(op.id, "PENDING", {
          retryCount: op.retryCount + 1,
          lastAttemptAt: new Date().toISOString(),
        });
      }
    }
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function groupByDocument(
  ops: LocalOperation[]
): Record<string, LocalOperation[]> {
  return ops.reduce<Record<string, LocalOperation[]>>((acc, op) => {
    if (!acc[op.documentId]) acc[op.documentId] = [];
    acc[op.documentId].push(op);
    return acc;
  }, {});
}

/**
 * Deduplicate operations — collapse multiple UPDATE_CONTENT ops into one
 * (keep the latest), since sending all intermediate states is wasteful.
 */
function deduplicateOps(ops: LocalOperation[]): LocalOperation[] {
  const seen = new Map<string, LocalOperation>();

  for (const op of ops) {
    const key =
      op.operationType === "UPDATE_CONTENT" ||
      op.operationType === "UPDATE_TITLE"
        ? `${op.documentId}:${op.operationType}`
        : op.id;

    const existing = seen.get(key);
    if (!existing || new Date(op.timestamp) > new Date(existing.timestamp)) {
      seen.set(key, op);
    }
  }

  return Array.from(seen.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

// Export the singleton
export const syncEngine = typeof window !== "undefined" ? new SyncEngine() : null;
