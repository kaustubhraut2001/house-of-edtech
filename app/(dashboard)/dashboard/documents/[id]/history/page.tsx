/**
 * app/(dashboard)/documents/[id]/history/page.tsx
 *
 * Version history / time travel page.
 */

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  RotateCcw,
  Eye,
  Clock,
  Tag,
} from "lucide-react";
import { useDocumentVersions, documentKeys } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toaster";
import { formatDateTime, getInitials } from "@/lib/utils/format";
import type { DocumentVersion } from "@/types";

export default function DocumentHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useDocumentVersions(id);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const restoreVersion = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(
        `/api/documents/${id}/versions/${versionId}/restore`,
        { method: "POST" }
      );
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Restore failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.versions(id) });
      toast({
        title: "Version restored",
        description: "A new version was saved before restoring.",
        variant: "success",
      });
      router.push(`/dashboard/documents/${id}`);
    },
    onError: (err) => {
      toast({
        title: "Restore failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    },
  });

  async function handleRestore(versionId: string) {
    if (!confirm("Restore this version? Your current content will be saved as a new version first.")) return;
    setRestoringId(versionId);
    await restoreVersion.mutateAsync(versionId);
    setRestoringId(null);
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex h-12 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4">
        <Link
          href={`/dashboard/documents/${id}`}
          className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Editor
        </Link>
        <span className="text-[var(--border)]">/</span>
        <span className="text-sm text-[var(--foreground)] font-medium">Version History</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Version timeline */}
        <div className="w-80 shrink-0 border-r border-[var(--border)] flex flex-col">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--foreground)]">Versions</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {versions.length} snapshot{versions.length !== 1 ? "s" : ""} saved
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Clock className="h-8 w-8 text-[var(--muted-foreground)] mb-3" />
              <p className="text-sm font-medium text-[var(--foreground)]">No versions saved</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Click &quot;Save Version&quot; in the editor to create a snapshot.
              </p>
            </div>
          ) : (
            <ul className="flex-1 overflow-auto divide-y divide-[var(--border)]" role="list">
              {versions.map((version: DocumentVersion, idx: number) => (
                <li
                  key={version.id}
                  className={`cursor-pointer px-4 py-3 hover:bg-[var(--accent)] transition-colors ${
                    previewVersion?.id === version.id ? "bg-[var(--accent)]" : ""
                  }`}
                  onClick={() => setPreviewVersion(version)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setPreviewVersion(version)}
                  aria-label={`View version ${idx + 1}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {idx === 0 && (
                          <Badge variant="success" className="text-[10px] py-0">Latest</Badge>
                        )}
                        {version.label ? (
                          <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                            <Tag className="h-3 w-3" />
                            {version.label}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            Version {versions.length - idx}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {formatDateTime(version.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={version.createdBy?.image ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(version.createdBy?.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Preview pane */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {previewVersion ? (
            <>
              {/* Preview header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {previewVersion.label ?? "Preview"}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {formatDateTime(previewVersion.createdAt)} · Rev. {previewVersion.revision}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(previewVersion.id)}
                    isLoading={restoringId === previewVersion.id}
                    className="gap-1.5 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                </div>
              </div>

              {/* Preview content */}
              <div className="flex-1 overflow-auto px-10 py-8">
                <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">
                  {previewVersion.title || "Untitled"}
                </h1>
                <pre className="text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono leading-relaxed">
                  {previewVersion.content || "(empty)"}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center px-8">
              <Eye className="h-12 w-12 text-[var(--muted-foreground)] mb-4" aria-hidden="true" />
              <p className="font-medium text-[var(--foreground)]">Select a version to preview</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Click on a version in the timeline to see its content.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
