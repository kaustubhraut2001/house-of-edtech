/**
 * app/api/documents/[id]/route.ts
 *
 * GET    /api/documents/:id — Get a single document (with members)
 * PATCH  /api/documents/:id — Update title/content (with conflict detection)
 * DELETE /api/documents/:id — Soft-delete (owner only)
 */

import { NextRequest } from "next/server";
import { updateDocumentSchema } from "@/lib/validations/document";
import {
  getDocumentWithAccess,
  updateDocumentContent,
  softDeleteDocument,
} from "@/repositories/document.repository";
import {
  requireAuth,
  successResponse,
  errorResponse,
  withErrorHandler,
} from "@/lib/utils/api";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/documents/:id
export async function GET(_req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    const document = await getDocumentWithAccess(id, user.id);
    if (!document) return errorResponse("Document not found", 404);

    return successResponse(document);
  });
}

// PATCH /api/documents/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    // Check access and role first
    const document = await getDocumentWithAccess(id, user.id);
    if (!document) return errorResponse("Document not found", 404);

    // Only OWNER and EDITOR can write
    if (document.currentUserRole === "VIEWER") {
      return errorResponse("Forbidden — viewers cannot edit documents", 403);
    }

    const body = await req.json();
    const parsed = updateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const updated = await updateDocumentContent(
      id,
      user.id,
      parsed.data.title,
      parsed.data.content,
      parsed.data.revision
    );

    if (!updated) {
      // Revision mismatch — a conflict occurred
      return errorResponse(
        "Conflict: document was modified by another client. Please re-fetch.",
        409
      );
    }

    return successResponse(updated);
  });
}

// DELETE /api/documents/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    const deleted = await softDeleteDocument(id, user.id);
    if (!deleted) {
      return errorResponse(
        "Document not found or you are not the owner",
        404
      );
    }

    return successResponse({ message: "Document deleted" });
  });
}
