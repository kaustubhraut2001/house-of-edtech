/**
 * repositories/document.repository.ts
 *
 * All database access for documents is centralized here.
 * API routes call this — never query Prisma directly in route handlers.
 */

import { prisma } from "@/lib/db/prisma";
import type { DocumentRole, DocumentSummary } from "@/types";

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

/**
 * Get all documents visible to a user (owned + shared), excluding soft-deleted.
 */
export async function getDocumentsForUser(
  userId: string
): Promise<DocumentSummary[]> {
  // Get owned documents
  const owned = await prisma.document.findMany({
    where: { ownerId: userId, deletedAt: null },
    select: {
      id: true,
      title: true,
      ownerId: true,
      revision: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { members: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get shared documents
  const shared = await prisma.documentMember.findMany({
    where: {
      userId,
      document: { deletedAt: null, ownerId: { not: userId } },
    },
    select: {
      role: true,
      document: {
        select: {
          id: true,
          title: true,
          ownerId: true,
          revision: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { members: true } },
        },
      },
    },
  });

  const ownedMapped: DocumentSummary[] = owned.map((d) => ({
    id: d.id,
    title: d.title,
    ownerId: d.ownerId,
    revision: d.revision,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    currentUserRole: "OWNER" as DocumentRole,
    memberCount: d._count.members,
  }));

  const sharedMapped: DocumentSummary[] = shared.map(({ role, document: d }) => ({
    id: d.id,
    title: d.title,
    ownerId: d.ownerId,
    revision: d.revision,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    currentUserRole: role as DocumentRole,
    memberCount: d._count.members,
  }));

  // Combine and sort by updatedAt descending
  return [...ownedMapped, ...sharedMapped].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}

/**
 * Get a single document with members. Ensures the requesting user has access.
 */
export async function getDocumentWithAccess(
  documentId: string,
  userId: string
) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
  });

  if (!doc) return null;

  // Determine the requesting user's role
  let currentUserRole: DocumentRole | null = null;

  if (doc.ownerId === userId) {
    currentUserRole = "OWNER";
  } else {
    const membership = doc.members.find((m) => m.userId === userId);
    if (membership) {
      currentUserRole = membership.role as DocumentRole;
    }
  }

  if (!currentUserRole) return null; // No access

  return { ...doc, currentUserRole };
}

// ─────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────

/** Create a new document */
export async function createDocument(
  ownerId: string,
  title: string,
  content: string
) {
  return prisma.document.create({
    data: { title, content, ownerId, revision: 0 },
  });
}

/**
 * Update document content with optimistic concurrency control.
 * Increments revision atomically.
 * Returns null if there's a revision conflict.
 */
export async function updateDocumentContent(
  documentId: string,
  userId: string,
  title: string | undefined,
  content: string | undefined,
  baseRevision: number
) {
  // Only allow update if revision matches (no one else wrote since)
  const updated = await prisma.document.updateMany({
    where: {
      id: documentId,
      revision: baseRevision, // Optimistic lock
      deletedAt: null,
    },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      revision: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    // Revision mismatch — conflict detected
    return null;
  }

  return prisma.document.findUnique({ where: { id: documentId } });
}

/** Soft-delete a document (owner only) */
export async function softDeleteDocument(
  documentId: string,
  ownerId: string
): Promise<boolean> {
  const result = await prisma.document.updateMany({
    where: { id: documentId, ownerId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}

// ─────────────────────────────────────────────
// MEMBERS
// ─────────────────────────────────────────────

/** Add or update a member's role */
export async function upsertDocumentMember(
  documentId: string,
  userId: string,
  role: "EDITOR" | "VIEWER"
) {
  return prisma.documentMember.upsert({
    where: { documentId_userId: { documentId, userId } },
    create: { documentId, userId, role },
    update: { role },
  });
}

/** Remove a member from a document */
export async function removeDocumentMember(
  documentId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.documentMember.deleteMany({
    where: { documentId, userId },
  });
  return result.count > 0;
}

// ─────────────────────────────────────────────
// VERSIONS
// ─────────────────────────────────────────────

/** Create a version snapshot */
export async function createVersion(
  documentId: string,
  createdById: string,
  label: string | undefined
) {
  // Fetch current document state for snapshot
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { title: true, content: true, revision: true },
  });

  if (!doc) throw new Error("Document not found");

  return prisma.version.create({
    data: {
      documentId,
      createdById,
      label,
      title: doc.title,
      content: doc.content,
      revision: doc.revision,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });
}

/** Get all versions for a document */
export async function getDocumentVersions(documentId: string) {
  return prisma.version.findMany({
    where: { documentId },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Restore a document to a previous version.
 * Creates a new version snapshot before overwriting (never destroys history).
 */
export async function restoreVersion(
  documentId: string,
  versionId: string,
  restoredById: string
) {
  const version = await prisma.version.findFirst({
    where: { id: versionId, documentId },
  });

  if (!version) throw new Error("Version not found");

  // Snapshot current state before restore
  await createVersion(documentId, restoredById, "Auto-save before restore");

  // Apply the restored version's content
  return prisma.document.update({
    where: { id: documentId },
    data: {
      title: version.title,
      content: version.content,
      revision: { increment: 1 },
    },
  });
}
