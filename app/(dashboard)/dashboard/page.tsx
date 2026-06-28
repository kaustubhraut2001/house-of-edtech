/**
 * app/(dashboard)/dashboard/page.tsx
 *
 * Main dashboard — shows recent documents + quick actions.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, FileText, Clock, Users, ArrowRight } from "lucide-react";
import { useDocuments, useCreateDocument } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatRelativeTime, truncate } from "@/lib/utils/format";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: documents, isLoading } = useDocuments();
  const createDocument = useCreateDocument();

  const userName = session?.user?.name?.split(" ")[0] ?? "there";

  async function handleNewDocument() {
    const doc = await createDocument.mutateAsync({
      title: "Untitled Document",
      content: "",
    });
    if (doc?.id) {
      router.push(`/dashboard/documents/${doc.id}`);
    }
  }

  const recentDocs = documents?.slice(0, 6) ?? [];
  const stats = {
    total: documents?.length ?? 0,
    owned: documents?.filter((d) => d.currentUserRole === "OWNER").length ?? 0,
    shared: documents?.filter((d) => d.currentUserRole !== "OWNER").length ?? 0,
  };

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Good {getTimeOfDay()}, {userName} 👋
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Here&apos;s what&apos;s happening with your documents today.
          </p>
        </div>
        <Button
          onClick={handleNewDocument}
          isLoading={createDocument.isPending}
          className="mt-4 sm:mt-0 gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<FileText className="h-5 w-5 text-[var(--primary)]" />}
          label="Total Documents"
          value={stats.total}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-emerald-500" />}
          label="Shared with Me"
          value={stats.shared}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          label="My Documents"
          value={stats.owned}
        />
      </div>

      {/* Recent Documents */}
      <section aria-labelledby="recent-docs-title">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="recent-docs-title"
            className="text-lg font-semibold text-[var(--foreground)]"
          >
            Recent Documents
          </h2>
          <Link
            href="/dashboard/documents"
            className="flex items-center gap-1 text-sm text-[var(--primary)] hover:underline"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : recentDocs.length === 0 ? (
          <EmptyState onNew={handleNewDocument} isLoading={createDocument.isPending} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--muted)]">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentCard({ doc }: { doc: { id: string; title: string; updatedAt: Date | string; currentUserRole: string; memberCount: number } }) {
  const roleColors: Record<string, "default" | "secondary" | "outline"> = {
    OWNER: "default",
    EDITOR: "secondary",
    VIEWER: "outline",
  };

  return (
    <Link href={`/dashboard/documents/${doc.id}`} className="group block">
      <Card className="h-full transition-shadow hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-[var(--ring)]">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-medium line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
              {truncate(doc.title || "Untitled", 60)}
            </CardTitle>
            <Badge variant={roleColors[doc.currentUserRole] ?? "outline"} className="shrink-0 text-[10px]">
              {doc.currentUserRole}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatRelativeTime(doc.updatedAt)}
            </span>
            {doc.memberCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden="true" />
                {doc.memberCount}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({
  onNew,
  isLoading,
}: {
  onNew: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-20 text-center">
      <FileText
        className="h-12 w-12 text-[var(--muted-foreground)] mb-4"
        aria-hidden="true"
      />
      <h3 className="text-lg font-medium text-[var(--foreground)]">
        No documents yet
      </h3>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Create your first document to get started.
      </p>
      <Button className="mt-6 gap-2" onClick={onNew} isLoading={isLoading}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create Document
      </Button>
    </div>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
