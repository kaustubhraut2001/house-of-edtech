/**
 * lib/utils/format.ts
 *
 * Date, text, and general formatting utilities.
 */

/**
 * Format a date as a human-readable relative string.
 * e.g. "2 minutes ago", "3 days ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date as a full timestamp string.
 * e.g. "Jan 15, 2025, 3:42 PM"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Truncate a string to a given length, appending "..." if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Get initials from a name string.
 * e.g. "John Doe" → "JD"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Generate a random device ID for the sync engine.
 * Stored in localStorage to identify the current browser instance.
 */
export function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get or create a persistent device ID stored in localStorage.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";

  const key = "collab_editor_device_id";
  let deviceId = localStorage.getItem(key);

  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(key, deviceId);
  }

  return deviceId;
}

/**
 * Sleep utility for exponential backoff in sync engine.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay.
 * @param attempt - Number of retry attempts (0-indexed)
 * @param baseMs - Base delay in milliseconds (default: 1000ms)
 * @param maxMs - Maximum delay cap (default: 30000ms)
 */
export function exponentialBackoff(
  attempt: number,
  baseMs = 1000,
  maxMs = 30_000
): number {
  const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}
