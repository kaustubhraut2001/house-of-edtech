/**
 * app/(dashboard)/documents/page.tsx
 *
 * Full documents list with search, sort, and create.
 */

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  FileText,
  Trash2,
  Clock,
  Users,
  ChevronDown,
} from "lucide-react";
import { useDocuments, useCreateDocument, useDeleteDocument } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime, truncate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type SortKey = "updatedAt" | "title";

export default function DocumentsPage() {
  const router = useRouter();
  const { data: documents, isLoading } = useDocuments();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("updatedAt");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleNew() {
    const doc = await createDocument.mutateAsync({ title: "Untitled Document" });
    if (doc?.id) router.push(`/dashboard/documents/${doc.id}`);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeletingId(id);
    await deleteDocument.mutateAsync(id);
    setDeletingId(null);
  }

  const filtered = useMemo(() => {
    let docs = documents ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter((d) => d.title.toLowerCase().includes(q));
    }
    return [...docs].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [documents, search, sort]);

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Documents</h1>
        <Button onClick={handleNew} isLoading={createDocument.isPending} className="gap-2 sm:w-auto">
          <Plus className="h-4 w-4" />
          New Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <Input
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search documents"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={cn(
              "flex h-10 appearance-none items-center rounded-md border border-[var(--input)]",
              "bg-transparent pl-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-[var(--ring)] text-[var(--foreground)]"
            )}
            aria-label="Sort documents"
          >
            <option value="updatedAt">Last modified</option>
            <option value="title">Title A–Z</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-20 text-center">
          <FileText className="h-10 w-10 text-[var(--muted-foreground)] mb-3" />
          <p className="font-medium text-[var(--foreground)]">
            {search ? "No documents match your search" : "No documents yet"}
          </p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {search ? "Try a different search term" : "Create your first document to get started"}
          </p>
          {!search && (
            <Button className="mt-5 gap-2" onClick={handleNew} isLoading={createDocument.isPending}>
              <Plus className="h-4 w-4" />
              Create Document
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((doc) => (
            <Link key={doc.id} href={`/dashboard/documents/${doc.id}`} className="group block">
              <Card className="transition-shadow hover:shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)]">
                    <FileText className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                      {truncate(doc.title || "Untitled", 80)}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(doc.updatedAt)}
                      </span>
                      {doc.memberCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {doc.memberCount} collaborator{doc.memberCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        doc.currentUserRole === "OWNER"
                          ? "default"
                          : doc.currentUserRole === "EDITOR"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {doc.currentUserRole}
                    </Badge>

                    {doc.currentUserRole === "OWNER" && (
                      <button
                        onClick={(e) => handleDelete(doc.id, e)}
                        disabled={deletingId === doc.id}
                        className={cn(
                          "rounded-md p-1.5 text-[var(--muted-foreground)] transition-colors",
                          "hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
                          "opacity-0 group-hover:opacity-100"
                        )}
                        aria-label={`Delete ${doc.title}`}
                      >
                        {deletingId === doc.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Count */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-[var(--muted-foreground)] text-center">
          Showing {filtered.length} of {documents?.length ?? 0} document{documents?.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
