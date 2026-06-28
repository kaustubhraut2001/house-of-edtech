/**
 * features/documents/document-editor.tsx
 *
 * The rich text document editor.
 *
 * Features:
 * - Autosave with debounce (writes to IndexedDB instantly)
 * - Background sync to server via sync engine
 * - Toolbar: Bold, Italic, Headings, Lists
 * - AI panel integration
 * - Version snapshot button
 * - Read-only mode for VIEWER role
 */

"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { useSession } from "next-auth/react";
import {
  Save,
  History,
  Sparkles,
  Bold,
  Italic,
  Heading2,
  List,
  Users,
} from "lucide-react";
import { upsertLocalDocument, enqueueOperation } from "@/lib/db/local";
import { syncEngine } from "@/features/sync/sync-engine";
import { getDeviceId } from "@/lib/utils/format";
import { useCreateVersion } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { SyncBadge } from "@/components/layout/sync-indicator";
import { AIPanel } from "@/features/ai/ai-panel";
import { MembersPanel } from "@/features/documents/members-panel";
import { toast } from "@/components/ui/toaster";
import type { LocalDocument, LocalOperation } from "@/types";

interface DocumentEditorProps {
  document: LocalDocument;
  isReadOnly?: boolean;
}

/** How long to wait (ms) after last keystroke before saving */
const AUTOSAVE_DELAY_MS = 800;

export function DocumentEditor({ document, isReadOnly = false }: DocumentEditorProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";

  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [showAI, setShowAI] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createVersion = useCreateVersion(document.id);

  // Sync server document changes into local state
  useEffect(() => {
    setTitle(document.title);
    setContent(document.content);
  }, [document.id]);

  // ── Autosave ──────────────────────────────────
  const scheduleAutosave = useCallback(
    (newTitle: string, newContent: string) => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

      autosaveTimer.current = setTimeout(async () => {
        await save(newTitle, newContent);
      }, AUTOSAVE_DELAY_MS);
    },
    [document.id, document.revision, userId]
  );

  async function save(newTitle: string, newContent: string) {
    if (!userId || isReadOnly) return;

    const now = new Date().toISOString();

    // 1. Write to IndexedDB immediately — UI never blocks
    await upsertLocalDocument({
      ...document,
      title: newTitle,
      content: newContent,
      updatedAt: now,
    });

    // 2. Queue operation for server sync
    const op: LocalOperation = {
      id: uuidv4(),
      documentId: document.id,
      userId,
      deviceId: getDeviceId(),
      operationType: "UPDATE_CONTENT",
      payload: { title: newTitle, content: newContent },
      status: "PENDING",
      revision: document.revision,
      timestamp: now,
      queuedAt: now,
      retryCount: 0,
      lastAttemptAt: null,
    };

    await enqueueOperation(op);

    // 3. Trigger background sync
    syncEngine?.triggerSync();
  }

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    if (isReadOnly) return;
    const val = e.target.value;
    setTitle(val);
    scheduleAutosave(val, content);
  }

  function handleContentChange(e: ChangeEvent<HTMLTextAreaElement>) {
    if (isReadOnly) return;
    const val = e.target.value;
    setContent(val);
    scheduleAutosave(title, val);
  }

  // ── Toolbar actions (simple text formatting) ──
  function insertMarkdown(before: string, after = "") {
    if (isReadOnly) return;
    const ta = window.document.getElementById("editor-content") as HTMLTextAreaElement | null;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    const newContent =
      content.slice(0, start) + before + selected + after + content.slice(end);

    setContent(newContent);
    scheduleAutosave(title, newContent);

    // Restore cursor
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(
        start + before.length,
        start + before.length + selected.length
      );
    });
  }

  // Apply AI result to content
  function handleAIResult(result: string) {
    const newContent = content + "\n\n" + result;
    setContent(newContent);
    scheduleAutosave(title, newContent);
  }

  async function handleSaveVersion() {
    const label = prompt("Enter a label for this version (optional):");
    await createVersion.mutateAsync(label ?? undefined);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Editor Toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--card)] px-4 py-2 flex-wrap">
        {/* Formatting buttons */}
        {!isReadOnly && (
          <>
            <ToolbarButton
              onClick={() => insertMarkdown("**", "**")}
              label="Bold"
              icon={<Bold className="h-4 w-4" />}
            />
            <ToolbarButton
              onClick={() => insertMarkdown("_", "_")}
              label="Italic"
              icon={<Italic className="h-4 w-4" />}
            />
            <ToolbarButton
              onClick={() => insertMarkdown("\n## ")}
              label="Heading"
              icon={<Heading2 className="h-4 w-4" />}
            />
            <ToolbarButton
              onClick={() => insertMarkdown("\n- ")}
              label="Bullet List"
              icon={<List className="h-4 w-4" />}
            />
            <div className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden="true" />
          </>
        )}

        {/* Right-side actions */}
        <div className="ml-auto flex items-center gap-2">
          <SyncBadge />

          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveVersion}
              isLoading={createVersion.isPending}
              className="gap-1.5 text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              Save Version
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMembers(!showMembers)}
            className="gap-1.5 text-xs"
          >
            <Users className="h-3.5 w-3.5" />
            Members
          </Button>

          <Button
            variant={showAI ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAI(!showAI)}
            className="gap-1.5 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI
          </Button>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex flex-1 flex-col overflow-auto px-6 py-8 md:px-16 lg:px-24">
          {/* Document Title */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            readOnly={isReadOnly}
            placeholder="Untitled Document"
            className="w-full resize-none border-0 bg-transparent text-3xl font-bold text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:outline-none mb-6"
            aria-label="Document title"
            maxLength={200}
          />

          {/* Content Area */}
          <textarea
            id="editor-content"
            value={content}
            onChange={handleContentChange}
            readOnly={isReadOnly}
            placeholder={
              isReadOnly
                ? ""
                : "Start writing… (Markdown is supported)"
            }
            className="editor-content w-full flex-1 resize-none border-0 bg-transparent font-mono text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:outline-none"
            aria-label="Document content"
            aria-readonly={isReadOnly}
            style={{ minHeight: "60vh" }}
          />

          {isReadOnly && (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-4 py-2 text-sm text-[var(--muted-foreground)]">
              You have <strong>viewer</strong> access — editing is disabled.
            </div>
          )}
        </div>

        {/* AI Panel */}
        {showAI && (
          <div className="w-80 shrink-0 border-l border-[var(--border)] overflow-auto">
            <AIPanel
              documentContent={content}
              onApply={handleAIResult}
              onClose={() => setShowAI(false)}
            />
          </div>
        )}

        {/* Members Panel */}
        {showMembers && (
          <div className="w-72 shrink-0 border-l border-[var(--border)] overflow-auto">
            <MembersPanel
              documentId={document.id}
              isOwner={document.currentUserRole === "OWNER"}
              onClose={() => setShowMembers(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Toolbar Button
// ─────────────────────────────────────────────
function ToolbarButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      {icon}
    </button>
  );
}
