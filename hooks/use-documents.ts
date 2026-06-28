/**
 * hooks/use-documents.ts
 *
 * TanStack Query hooks for document CRUD operations.
 * Reads from server but always writes to IndexedDB first (optimistic).
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import {
  upsertLocalDocument,
  getLocalDocuments,
  getLocalDocument,
  deleteLocalDocument,
  enqueueOperation,
} from "@/lib/db/local";
import { syncEngine } from "@/features/sync/sync-engine";
import { getDeviceId } from "@/lib/utils/format";
import { toast } from "@/components/ui/toaster";
import type { DocumentSummary, LocalDocument, LocalOperation } from "@/types";

// ─────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────
export const documentKeys = {
  all: ["documents"] as const,
  detail: (id: string) => ["documents", id] as const,
  versions: (id: string) => ["documents", id, "versions"] as const,
  members: (id: string) => ["documents", id, "members"] as const,
};

// ─────────────────────────────────────────────
// List Documents
// ─────────────────────────────────────────────
export function useDocuments() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: documentKeys.all,
    queryFn: async (): Promise<DocumentSummary[]> => {
      // 1. Load from IndexedDB immediately (no network wait)
      if (userId) {
        const local = await getLocalDocuments(userId);
        if (local.length > 0) {
          // Return local data instantly, then fetch server in background
        }
      }

      // 2. Fetch from server to get latest
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to fetch documents");
      const json = await res.json();
      const serverDocs: DocumentSummary[] = json.data;

      // 3. Sync server docs into IndexedDB
      if (userId) {
        for (const doc of serverDocs) {
          const localDoc = await getLocalDocument(doc.id);
          await upsertLocalDocument({
            id: doc.id,
            title: doc.title,
            content: localDoc?.content ?? "",
            ownerId: doc.ownerId,
            revision: doc.revision,
            lastSyncedAt: new Date().toISOString(),
            isLocalOnly: false,
            deletedAt: null,
            createdAt: doc.createdAt.toString(),
            updatedAt: doc.updatedAt.toString(),
            currentUserRole: doc.currentUserRole,
          });
        }
      }

      return serverDocs;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────
// Single Document
// ─────────────────────────────────────────────
export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error("Failed to fetch document");
      const json = await res.json();

      // Cache in IndexedDB
      const doc = json.data;
      await upsertLocalDocument({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        ownerId: doc.ownerId,
        revision: doc.revision,
        lastSyncedAt: new Date().toISOString(),
        isLocalOnly: false,
        deletedAt: doc.deletedAt,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        currentUserRole: doc.currentUserRole,
      });

      return doc;
    },
    enabled: !!id,
    staleTime: 10_000,
  });
}

// ─────────────────────────────────────────────
// Create Document
// ─────────────────────────────────────────────
export function useCreateDocument() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (data: { title?: string; content?: string }) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const tempId = uuidv4();
      const now = new Date().toISOString();

      // Optimistic local write — instant UI update
      const localDoc: LocalDocument = {
        id: tempId,
        title: data.title ?? "Untitled Document",
        content: data.content ?? "",
        ownerId: userId,
        revision: 0,
        lastSyncedAt: null,
        isLocalOnly: true,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        currentUserRole: "OWNER",
      };
      await upsertLocalDocument(localDoc);

      // Try server in background — if offline, operation is queued
      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title ?? "Untitled Document",
            content: data.content ?? "",
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const serverDoc = json.data;
          // Replace temp local doc with real server doc
          await upsertLocalDocument({
            ...localDoc,
            id: serverDoc.id,
            isLocalOnly: false,
            lastSyncedAt: now,
            revision: serverDoc.revision,
          });
          return serverDoc;
        }
      } catch {
        // Offline — queue the creation operation
        const op: LocalOperation = {
          id: uuidv4(),
          documentId: tempId,
          userId,
          deviceId: getDeviceId(),
          operationType: "UPDATE_CONTENT",
          payload: { title: localDoc.title, content: localDoc.content },
          status: "PENDING",
          revision: 0,
          timestamp: now,
          queuedAt: now,
          retryCount: 0,
          lastAttemptAt: null,
        };
        await enqueueOperation(op);
        syncEngine?.triggerSync();
      }

      return localDoc;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },

    onError: () => {
      toast({
        title: "Failed to create document",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });
}

// ─────────────────────────────────────────────
// Delete Document
// ─────────────────────────────────────────────
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      // Optimistic local delete
      await deleteLocalDocument(documentId);

      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete document");
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast({
        title: "Document deleted",
        variant: "success",
      });
    },

    onError: () => {
      toast({
        title: "Failed to delete document",
        variant: "destructive",
      });
    },
  });
}

// ─────────────────────────────────────────────
// Versions
// ─────────────────────────────────────────────
export function useDocumentVersions(documentId: string) {
  return useQuery({
    queryKey: documentKeys.versions(documentId),
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/versions`);
      if (!res.ok) throw new Error("Failed to fetch versions");
      const json = await res.json();
      return json.data;
    },
    enabled: !!documentId,
  });
}

export function useCreateVersion(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (label?: string) => {
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error("Failed to create version");
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentKeys.versions(documentId),
      });
      toast({ title: "Version saved", variant: "success" });
    },
  });
}
