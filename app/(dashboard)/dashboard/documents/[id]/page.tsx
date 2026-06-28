/**
 * app/(dashboard)/documents/[id]/page.tsx
 *
 * Document editor page.
 * Loads from IndexedDB first (instant), syncs server in background.
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { useDocument } from "@/hooks/use-documents";
import { getLocalDocument } from "@/lib/db/local";
import { DocumentEditor } from "@/features/documents/document-editor";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import type { LocalDocument } from "@/types";

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Immediately load from IndexedDB
  const [localDoc, setLocalDoc] = useState<LocalDocument | null>(null);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    getLocalDocument(id).then((doc) => {
      setLocalDoc(doc ?? null);
      setLocalLoading(false);
    });
  }, [id]);

  // Background server fetch
  const { data: serverDoc, isLoading: serverLoading, error } = useDocument(id);

  // Merge: prefer server data once loaded, fall back to local
  const doc: LocalDocument | null = serverDoc
    ? {
        id: serverDoc.id,
        title: serverDoc.title,
        content: serverDoc.content,
        ownerId: serverDoc.ownerId,
        revision: serverDoc.revision,
        lastSyncedAt: new Date().toISOString(),
        isLocalOnly: false,
        deletedAt: serverDoc.deletedAt,
        createdAt: serverDoc.createdAt,
        updatedAt: serverDoc.updatedAt,
        currentUserRole: serverDoc.currentUserRole,
      }
    : localDoc;

  const isReadOnly = doc?.currentUserRole === "VIEWER";

  if (localLoading && serverLoading) {
    return (
      <div className="flex h-full items-center justify-center py-40">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-40 gap-4">
        <p className="text-lg font-semibold text-[var(--foreground)]">Document not found</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          It may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => router.push("/dashboard/documents")} variant="outline">
          Back to Documents
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Page header */}
      <div className="flex h-12 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4">
        <Link
          href="/dashboard/documents"
          className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Documents
        </Link>
        <span className="text-[var(--border)]">/</span>
        <span className="text-sm truncate max-w-[200px] text-[var(--foreground)]">
          {doc.title || "Untitled"}
        </span>

        <div className="ml-auto">
          <Link href={`/dashboard/documents/${id}/history`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              History
            </Button>
          </Link>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <DocumentEditor document={doc} isReadOnly={isReadOnly} />
      </div>
    </div>
  );
}
