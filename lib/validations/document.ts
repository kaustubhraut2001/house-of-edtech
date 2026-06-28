/**
 * lib/validations/document.ts
 *
 * Zod schemas for document-related API requests.
 */

import { z } from "zod";

// ── Create Document ────────────────────────────
export const createDocumentSchema = z.object({
  title: z
    .string()
    .max(200, "Title must be under 200 characters")
    .default("Untitled Document"),
  content: z.string().default(""),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// ── Update Document ────────────────────────────
export const updateDocumentSchema = z.object({
  title: z.string().max(200, "Title must be under 200 characters").optional(),
  content: z.string().max(500_000, "Document content is too large").optional(),
  revision: z.number().int().min(0),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

// ── Add Member ─────────────────────────────────
export const addMemberSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.enum(["EDITOR", "VIEWER"]).default("VIEWER"),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

// ── Update Member Role ─────────────────────────
export const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

// ── Create Version ─────────────────────────────
export const createVersionSchema = z.object({
  label: z
    .string()
    .max(100, "Label must be under 100 characters")
    .optional(),
});

export type CreateVersionInput = z.infer<typeof createVersionSchema>;

// ── Sync Operations ────────────────────────────
export const syncOperationSchema = z.object({
  id: z.string().min(1),          // client-generated operation id
  documentId: z.string().min(1),
  deviceId: z.string().min(1),
  operationType: z.enum([
    "INSERT",
    "DELETE",
    "UPDATE_TITLE",
    "UPDATE_CONTENT",
    "CREATE_VERSION",
    "RESTORE_VERSION",
  ]),
  payload: z.record(z.unknown()),
  revision: z.number().int().min(0),
  timestamp: z.string().datetime(),
  queuedAt: z.string().datetime(),
});

export const syncBatchSchema = z.object({
  operations: z
    .array(syncOperationSchema)
    .min(1)
    .max(100, "Too many operations in a single batch"),
});

export type SyncOperation = z.infer<typeof syncOperationSchema>;
export type SyncBatch = z.infer<typeof syncBatchSchema>;

// ── AI Request ─────────────────────────────────
export const aiRequestSchema = z.object({
  action: z.enum([
    "summarize",
    "improve",
    "grammar",
    "generate_title",
    "rewrite",
    "translate",
    "continue",
    "explain",
  ]),
  text: z
    .string()
    .min(1, "Text is required")
    .max(10_000, "Text is too long for AI processing"),
  targetLanguage: z.string().optional(), // used with "translate" action
});

export type AIRequestInput = z.infer<typeof aiRequestSchema>;
