/**
 * lib/db/local.ts
 *
 * IndexedDB schema using Dexie.
 * This is the client's primary database — the server is treated as a backup.
 *
 * All reads happen from IndexedDB first.
 * Writes go to IndexedDB immediately, then sync to the server in the background.
 */

import Dexie, { type Table } from "dexie";
import type {
  LocalDocument,
  LocalOperation,
  LocalVersion,
  CollaboratorPresence,
} from "@/types";

// ─────────────────────────────────────────────
// Database Schema Version
// ─────────────────────────────────────────────
class CollabEditorDB extends Dexie {
  // Tables
  documents!: Table<LocalDocument, string>;
  operations!: Table<LocalOperation, string>;
  versions!: Table<LocalVersion, string>;
  presence!: Table<CollaboratorPresence, string>;

  constructor() {
    super("collab_editor_db");

    // Version 1 — initial schema
    this.version(1).stores({
      // documents — indexed by id, ownerId, and updatedAt for sorting
      documents: "id, ownerId, updatedAt, deletedAt, isLocalOnly",

      // operations — indexed for efficient sync queue processing
      operations:
        "id, documentId, status, queuedAt, [documentId+status]",

      // versions — indexed for timeline display
      versions: "id, documentId, createdAt, revision",

      // presence — collaborators currently viewing/editing a document
      presence: "userId, documentId",
    });
  }
}

// Singleton instance
let _db: CollabEditorDB | null = null;

/**
 * Get the local IndexedDB database instance.
 * Safe to call multiple times — returns the same instance.
 */
export function getLocalDB(): CollabEditorDB {
  if (!_db) {
    _db = new CollabEditorDB();
  }
  return _db;
}

// ─────────────────────────────────────────────
// Document helpers
// ─────────────────────────────────────────────

/** Save or update a document in IndexedDB */
export async function upsertLocalDocument(doc: LocalDocument): Promise<void> {
  const db = getLocalDB();
  await db.documents.put(doc);
}

/** Get a single document by ID */
export async function getLocalDocument(
  id: string
): Promise<LocalDocument | undefined> {
  const db = getLocalDB();
  return db.documents.get(id);
}

/** Get all non-deleted documents for a user, sorted by most recently updated */
export async function getLocalDocuments(
  userId: string
): Promise<LocalDocument[]> {
  const db = getLocalDB();
  return db.documents
    .where("ownerId")
    .equals(userId)
    .filter((doc) => doc.deletedAt === null)
    .toArray()
    .then((docs) =>
      docs.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    );
}

/** Soft-delete a document locally */
export async function deleteLocalDocument(id: string): Promise<void> {
  const db = getLocalDB();
  await db.documents.update(id, { deletedAt: new Date().toISOString() });
}

// ─────────────────────────────────────────────
// Operation Queue helpers
// ─────────────────────────────────────────────

/** Add an operation to the local pending queue */
export async function enqueueOperation(op: LocalOperation): Promise<void> {
  const db = getLocalDB();
  await db.operations.put(op);
}

/** Get all pending operations for a document */
export async function getPendingOperations(
  documentId: string
): Promise<LocalOperation[]> {
  const db = getLocalDB();
  return db.operations
    .where("[documentId+status]")
    .equals([documentId, "PENDING"])
    .sortBy("queuedAt");
}

/** Get all pending operations across all documents (for background sync) */
export async function getAllPendingOperations(): Promise<LocalOperation[]> {
  const db = getLocalDB();
  return db.operations.where("status").equals("PENDING").sortBy("queuedAt");
}

/** Update an operation's status after sync attempt */
export async function updateOperationStatus(
  id: string,
  status: LocalOperation["status"],
  extra?: Partial<LocalOperation>
): Promise<void> {
  const db = getLocalDB();
  await db.operations.update(id, { status, ...extra });
}

// ─────────────────────────────────────────────
// Version helpers
// ─────────────────────────────────────────────

/** Save a version snapshot locally */
export async function saveLocalVersion(version: LocalVersion): Promise<void> {
  const db = getLocalDB();
  await db.versions.put(version);
}

/** Get all versions for a document, sorted newest first */
export async function getLocalVersions(
  documentId: string
): Promise<LocalVersion[]> {
  const db = getLocalDB();
  return db.versions
    .where("documentId")
    .equals(documentId)
    .reverse()
    .sortBy("createdAt");
}

/** Clear all local data (used on logout) */
export async function clearLocalData(): Promise<void> {
  const db = getLocalDB();
  await Promise.all([
    db.documents.clear(),
    db.operations.clear(),
    db.versions.clear(),
    db.presence.clear(),
  ]);
}
