/**
 * services/document.service.ts
 *
 * Business logic for document operations.
 *
 * Responsibilities:
 *  - Create, read, update, soft-delete documents
 *  - Enforce role-based authorization rules
 *  - Manage document members (invite, update role, remove)
 *  - Coordinate version snapshots
 *
 * This layer orchestrates calls to the document repository.
 * It does NOT touch Prisma directly.
 */

import * as repo from "@/repositories/document.repository";
import type {
  Document,
  DocumentSummary,
  DocumentMember,
  DocumentRole,
} from "@/types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CreateDocumentPayload {
  title?: string;
  content?: string;
}

export interface UpdateDocumentPayload {
  title?: string;
  content?: string;
  revision: number; // client must send the revision it based its edit on
}

export interface AddMemberPayload {
  email: string;
  role: "EDITOR" | "VIEWER";
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: number };

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export const documentService = {
  // ── List ────────────────────────────────────

  /**
   * Get all documents (owned + shared) visible to a user.
   */
  async listForUser(userId: string): Promise<ServiceResult<DocumentSummary[]>> {
    try {
      const documents = await repo.getDocumentsForUser(userId);
      return { ok: true, data: documents };
    } catch {
      return { ok: false, error: "Failed to fetch documents", code: 500 };
    }
  },

  // ── Get single ───────────────────────────────

  /**
   * Get a document including members.
   * Returns 404 if not found or the user has no access.
   */
  async getForUser(
    documentId: string,
    userId: string
  ): Promise<ServiceResult<Document & { currentUserRole: DocumentRole }>> {
    try {
      const doc = await repo.getDocumentWithAccess(documentId, userId);
      if (!doc) {
        return { ok: false, error: "Document not found", code: 404 };
      }
      return { ok: true, data: doc as unknown as Document & { currentUserRole: DocumentRole } };
    } catch {
      return { ok: false, error: "Failed to fetch document", code: 500 };
    }
  },

  // ── Create ───────────────────────────────────

  /**
   * Create a new document owned by the given user.
   */
  async create(
    ownerId: string,
    payload: CreateDocumentPayload
  ): Promise<ServiceResult<{ id: string; title: string; revision: number }>> {
    try {
      const doc = await repo.createDocument(
        ownerId,
        payload.title ?? "Untitled Document",
        payload.content ?? ""
      );
      return { ok: true, data: { id: doc.id, title: doc.title, revision: doc.revision } };
    } catch {
      return { ok: false, error: "Failed to create document", code: 500 };
    }
  },

  // ── Update ───────────────────────────────────

  /**
   * Update document content/title.
   *
   * Authorization rules enforced here:
   *  - VIEWER → forbidden
   *  - OWNER / EDITOR → allowed
   *
   * Returns 409 Conflict if the revision is stale.
   */
  async update(
    documentId: string,
    userId: string,
    payload: UpdateDocumentPayload
  ): Promise<ServiceResult<{ id: string; revision: number }>> {
    try {
      // 1. Verify access
      const doc = await repo.getDocumentWithAccess(documentId, userId);
      if (!doc) {
        return { ok: false, error: "Document not found", code: 404 };
      }
      if (doc.currentUserRole === "VIEWER") {
        return {
          ok: false,
          error: "Forbidden — viewers cannot edit documents",
          code: 403,
        };
      }

      // 2. Apply update with optimistic concurrency
      const updated = await repo.updateDocumentContent(
        documentId,
        userId,
        payload.title,
        payload.content,
        payload.revision
      );

      if (!updated) {
        return {
          ok: false,
          error:
            "Conflict: document was modified by another client. Re-fetch and try again.",
          code: 409,
        };
      }

      return { ok: true, data: { id: updated.id, revision: updated.revision } };
    } catch {
      return { ok: false, error: "Failed to update document", code: 500 };
    }
  },

  // ── Delete ───────────────────────────────────

  /**
   * Soft-delete a document.
   * Only the OWNER can delete.
   */
  async delete(
    documentId: string,
    userId: string
  ): Promise<ServiceResult<{ deleted: boolean }>> {
    try {
      const deleted = await repo.softDeleteDocument(documentId, userId);
      if (!deleted) {
        return {
          ok: false,
          error: "Document not found or you are not the owner",
          code: 404,
        };
      }
      return { ok: true, data: { deleted: true } };
    } catch {
      return { ok: false, error: "Failed to delete document", code: 500 };
    }
  },

  // ── Members ──────────────────────────────────

  /**
   * Add or update a member.
   * Only the OWNER can manage members.
   *
   * Uses findUserByEmail from the auth service to look up the target user.
   */
  async addMember(
    documentId: string,
    requestingUserId: string,
    targetEmail: string,
    role: "EDITOR" | "VIEWER"
  ): Promise<ServiceResult<DocumentMember>> {
    try {
      // 1. Check requester is owner
      const doc = await repo.getDocumentWithAccess(documentId, requestingUserId);
      if (!doc) {
        return { ok: false, error: "Document not found", code: 404 };
      }
      if (doc.currentUserRole !== "OWNER") {
        return {
          ok: false,
          error: "Forbidden — only owners can manage members",
          code: 403,
        };
      }

      // 2. Find target user
      const { prisma } = await import("@/lib/db/prisma");
      const targetUser = await prisma.user.findUnique({
        where: { email: targetEmail },
        select: { id: true, name: true, email: true, image: true },
      });

      if (!targetUser) {
        return {
          ok: false,
          error: "No user found with that email address",
          code: 404,
        };
      }

      if (targetUser.id === requestingUserId) {
        return {
          ok: false,
          error: "You cannot add yourself as a member",
          code: 400,
        };
      }

      // 3. Upsert membership
      const member = await repo.upsertDocumentMember(
        documentId,
        targetUser.id,
        role
      );

      return {
        ok: true,
        data: {
          id: member.id,
          userId: member.userId,
          documentId: member.documentId,
          role: member.role as DocumentRole,
          user: targetUser,
        },
      };
    } catch {
      return { ok: false, error: "Failed to add member", code: 500 };
    }
  },

  /**
   * Remove a member from a document.
   * Only the OWNER can remove members.
   */
  async removeMember(
    documentId: string,
    requestingUserId: string,
    targetUserId: string
  ): Promise<ServiceResult<{ removed: boolean }>> {
    try {
      const doc = await repo.getDocumentWithAccess(documentId, requestingUserId);
      if (!doc) {
        return { ok: false, error: "Document not found", code: 404 };
      }
      if (doc.currentUserRole !== "OWNER") {
        return {
          ok: false,
          error: "Forbidden — only owners can remove members",
          code: 403,
        };
      }

      const removed = await repo.removeDocumentMember(documentId, targetUserId);
      if (!removed) {
        return { ok: false, error: "Member not found", code: 404 };
      }

      return { ok: true, data: { removed: true } };
    } catch {
      return { ok: false, error: "Failed to remove member", code: 500 };
    }
  },
};
