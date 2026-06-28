/**
 * features/documents/members-panel.tsx
 *
 * Panel to view and manage document collaborators.
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, UserPlus, Trash2, Crown, Pencil, Eye } from "lucide-react";
import { documentKeys } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { getInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { DocumentMember } from "@/types";

interface MembersPanelProps {
  documentId: string;
  isOwner: boolean;
  onClose: () => void;
}

export function MembersPanel({ documentId, isOwner, onClose }: MembersPanelProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");

  const { data: members = [], isLoading } = useQuery<DocumentMember[]>({
    queryKey: documentKeys.members(documentId),
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const json = await res.json();
      return json.data;
    },
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to add member");
      }
      return res.json();
    },
    onSuccess: () => {
      setEmail("");
      queryClient.invalidateQueries({ queryKey: documentKeys.members(documentId) });
      toast({ title: "Member added", variant: "success" });
    },
    onError: (err) => {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/documents/${documentId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error("Failed to remove member");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.members(documentId) });
      toast({ title: "Member removed", variant: "success" });
    },
  });

  const roleIcon: Record<string, React.ReactNode> = {
    OWNER: <Crown className="h-3.5 w-3.5 text-amber-500" />,
    EDITOR: <Pencil className="h-3.5 w-3.5 text-[var(--primary)]" />,
    VIEWER: <Eye className="h-3.5 w-3.5 text-slate-400" />,
  };

  return (
    <div className="flex h-full flex-col bg-[var(--card)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h3 className="font-semibold text-[var(--foreground)]">Members</h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          aria-label="Close members panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-5">
        {/* Add member (owner only) */}
        {isOwner && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Invite
            </p>
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && email) addMember.mutate();
              }}
            />
            <div className="flex gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
                className="flex-1 h-9 rounded-md border border-[var(--input)] bg-transparent px-2 text-sm text-[var(--foreground)]"
                aria-label="Select role"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <Button
                size="sm"
                onClick={() => addMember.mutate()}
                isLoading={addMember.isPending}
                disabled={!email.trim()}
                className="gap-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Members list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <ul className="space-y-2" role="list">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--accent)]"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.image ?? undefined} />
                    <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {member.user.name ?? member.user.email}
                    </p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">
                      {member.user.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {roleIcon[member.role]}
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {member.role}
                    </span>

                    {isOwner && member.role !== "OWNER" && (
                      <button
                        onClick={() => removeMember.mutate(member.userId)}
                        className={cn(
                          "ml-1 rounded-md p-1 text-[var(--muted-foreground)]",
                          "hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950",
                          "focus-visible:outline-none focus-visible:ring-2"
                        )}
                        aria-label={`Remove ${member.user.name ?? member.user.email}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
