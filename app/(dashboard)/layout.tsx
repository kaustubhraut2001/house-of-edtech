/**
 * app/(dashboard)/layout.tsx
 *
 * Dashboard shell layout — sidebar + main content area.
 * Also boots the sync engine for all dashboard pages.
 */

"use client";

import { useEffect, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { syncEngine } from "@/features/sync/sync-engine";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // Start sync engine when user enters dashboard
  useEffect(() => {
    syncEngine?.start();
    return () => syncEngine?.stop();
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Left sidebar navigation */}
      <Sidebar />

      {/* Main content — offset by sidebar width on desktop */}
      <main
        className="flex-1 md:ml-[var(--sidebar-width)] overflow-auto"
        id="main-content"
      >
        {children}
      </main>
    </div>
  );
}
