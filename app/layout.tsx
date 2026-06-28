/**
 * app/layout.tsx
 *
 * Root layout — wraps the entire application.
 * Sets up fonts, metadata, and global providers.
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CollabDocs — Local-First Collaborative Editor",
    template: "%s | CollabDocs",
  },
  description:
    "A production-grade collaborative document editor with offline support, real-time sync, version history, and AI-powered writing tools.",
  keywords: [
    "collaborative editor",
    "offline-first",
    "real-time collaboration",
    "document editor",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
