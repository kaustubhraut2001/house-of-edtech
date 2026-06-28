/**
 * app/(auth)/layout.tsx
 *
 * Shared layout for authentication pages (login, register).
 * Centers content vertically with a branded background.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950">
      {/* Top nav bar */}
      <header className="flex h-16 items-center px-6 border-b border-[var(--border)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
        >
          <FileText className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
          <span>CollabDocs</span>
        </Link>
      </header>

      {/* Centered content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[var(--muted-foreground)]">
        &copy; {new Date().getFullYear()} CollabDocs. All rights reserved.
      </footer>
    </div>
  );
}
