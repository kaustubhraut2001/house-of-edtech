/**
 * app/page.tsx
 *
 * Public landing page.
 */

import Link from "next/link";
import { FileText, Zap, Shield, Wifi, Clock, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Wifi,
    title: "Works Offline",
    description: "Edit documents without internet. Changes sync automatically when you reconnect.",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950",
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    description: "See teammates' edits live. Share documents with granular role-based permissions.",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950",
  },
  {
    icon: Clock,
    title: "Version History",
    description: "Every save is a snapshot. Browse, preview, and restore any past version.",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950",
  },
  {
    icon: Sparkles,
    title: "AI Writing Tools",
    description: "Summarize, improve, translate, and rewrite with built-in AI assistance.",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "Row-level authorization, CSRF protection, and encrypted sessions.",
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950",
  },
  {
    icon: Zap,
    title: "Blazing Fast",
    description: "Local-first architecture means zero loading spinners when opening documents.",
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-[var(--border)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span className="text-[var(--foreground)]">CollabDocs</span>
        </Link>
        <nav className="ml-auto flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get started free</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center px-6 py-24 text-center bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950 dark:to-[var(--background)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white dark:bg-slate-900 px-4 py-1.5 text-sm text-[var(--muted-foreground)] mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
            Local-First · Real-time · AI-Powered
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-6xl">
            Collaborate on documents,{" "}
            <span className="text-[var(--primary)]">even offline</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[var(--muted-foreground)]">
            CollabDocs is a production-grade collaborative editor that works
            without internet. Your changes are saved locally and synced
            automatically when you reconnect.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button size="lg" className="px-8">Start writing for free</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-8">Sign in</Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-20 max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[var(--foreground)]">
              Everything you need to write and collaborate
            </h2>
            <p className="mt-3 text-[var(--muted-foreground)]">
              Built for teams that can&apos;t afford to lose their work.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description, color, bg }) => (
              <div
                key={title}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 hover:shadow-md transition-shadow"
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${bg} mb-4`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-8 text-center text-sm text-[var(--muted-foreground)]">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <span>&copy; {new Date().getFullYear()} CollabDocs</span>
          <span className="hidden sm:block">·</span>
          <Link href="/login" className="hover:text-[var(--foreground)] transition-colors">Sign In</Link>
          <span>·</span>
          <Link href="/register" className="hover:text-[var(--foreground)] transition-colors">Register</Link>
        </div>
      </footer>
    </div>
  );
}
