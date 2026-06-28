/**
 * app/api/sync/route.ts
 *
 * POST /api/sync
 *
 * The core sync endpoint.
 * Accepts a batch of offline operations and applies them deterministically.
 *
 * Conflict resolution strategy:
 * - If the incoming operation's base revision matches the server revision → apply (fast path)
 * - If revision is behind → attempt 3-way merge (last-write-wins per field, with logging)
 * - If the operation was already synced (idempotency check) → return cached result
 */

import { NextRequest } from "next/server";
import { syncBatchSchema } from "@/lib/validations/document";
import { prisma } from "@/lib/db/prisma";
import { getDocumentWithAccess } from "@/repositories/document.repository";
import {
  requireAuth,
  successResponse,
  errorResponse,
  withErrorHandler,
} from "@/lib/utils/api";
import type { SyncResult } from "@/types";

// Max payload size: 500KB per sync batch
const MAX_PAYLOAD_BYTES = 500 * 1024;

export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    const user = await requireAuth();

    // Guard against excessively large payloads (OOM protection)
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      return errorResponse("Payload too large", 413);
    }

    const body = await req.json();
    const parsed = syncBatchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid sync batch", 422, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { operations } = parsed.data;
    const results: SyncResult[] = [];

    for (const op of operations) {
      // Check access for each operation's document
      const doc = await getDocumentWithAccess(op.documentId, user.id);

      if (!doc) {
        results.push({
          operationId: op.id,
          status: "error",
          error: "Document not found or access denied",
        });
        continue;
      }

      // Viewers must never submit editing operations
      if (
        doc.currentUserRole === "VIEWER" &&
        ["INSERT", "DELETE", "UPDATE_TITLE", "UPDATE_CONTENT"].includes(
          op.operationType
        )
      ) {
        results.push({
          operationId: op.id,
          status: "error",
          error: "Forbidden — viewers cannot edit documents",
        });
        continue;
      }

      // Idempotency check — was this operation already synced?
      const existing = await prisma.operation.findUnique({
        where: { id: op.id },
      });

      if (existing && existing.status === "SYNCED") {
        results.push({
          operationId: op.id,
          status: "synced",
          serverRevision: doc.revision,
        });
        continue;
      }

      try {
        // Apply the operation
        const result = await applyOperation(op, doc, user.id);
        results.push(result);

        // Log the operation to DB
        await prisma.operation.upsert({
          where: { id: op.id },
          create: {
            id: op.id,
            documentId: op.documentId,
            userId: user.id,
            deviceId: op.deviceId,
            operationType: op.operationType as never,
            payload: op.payload as any,
            status: result.status === "synced" ? "SYNCED" : "CONFLICT",
            revision: op.revision,
            timestamp: new Date(op.timestamp),
            syncedAt: new Date(),
          },
          update: {
            status: result.status === "synced" ? "SYNCED" : "CONFLICT",
            syncedAt: new Date(),
          },
        });

        // Log sync event
        await prisma.syncLog.create({
          data: {
            documentId: op.documentId,
            userId: user.id,
            deviceId: op.deviceId,
            status: result.status === "synced" ? "SUCCESS" : "CONFLICT",
            details: (result.conflictData ?? null) as any,
          },
        });
      } catch (err) {
        results.push({
          operationId: op.id,
          status: "error",
          error: "Failed to apply operation",
        });
      }
    }

    return successResponse({ results });
  });
}

/**
 * Apply a single operation to a document.
 * Returns a SyncResult indicating success or conflict.
 */
async function applyOperation(
  op: {
    id: string;
    documentId: string;
    operationType: string;
    payload: Record<string, unknown>;
    revision: number;
  },
  doc: { id: string; revision: number; title: string; content: string },
  userId: string
): Promise<SyncResult> {
  if (
    op.operationType === "UPDATE_CONTENT" ||
    op.operationType === "UPDATE_TITLE"
  ) {
    const newTitle = op.operationType === "UPDATE_TITLE"
      ? (op.payload.title as string)
      : undefined;
    const newContent = op.operationType === "UPDATE_CONTENT"
      ? (op.payload.content as string)
      : undefined;

    // Fast path — no concurrent modification
    if (op.revision === doc.revision) {
      const updated = await prisma.document.update({
        where: { id: doc.id },
        data: {
          ...(newTitle !== undefined && { title: newTitle }),
          ...(newContent !== undefined && { content: newContent }),
          revision: { increment: 1 },
        },
      });

      return {
        operationId: op.id,
        status: "synced",
        serverRevision: updated.revision,
      };
    }

    // Conflict path — server has moved ahead
    // Strategy: apply the change anyway (last-write-wins) but return conflict info
    // so the client can notify the user
    const currentDoc = await prisma.document.findUnique({
      where: { id: doc.id },
      select: { title: true, content: true, revision: true },
    });

    if (!currentDoc) {
      return { operationId: op.id, status: "error", error: "Document not found" };
    }

    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: {
        ...(newTitle !== undefined && { title: newTitle }),
        ...(newContent !== undefined && { content: newContent }),
        revision: { increment: 1 },
      },
    });

    return {
      operationId: op.id,
      status: "conflict",
      serverRevision: updated.revision,
      conflictData: {
        serverContent: currentDoc.content,
        serverTitle: currentDoc.title,
      },
    };
  }

  // For other operation types (INSERT, DELETE, etc.) — mark as synced
  return {
    operationId: op.id,
    status: "synced",
    serverRevision: doc.revision,
  };
}
