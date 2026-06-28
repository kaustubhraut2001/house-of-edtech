/**
 * app/api/documents/[id]/versions/route.ts
 *
 * GET  /api/documents/:id/versions          — List all versions
 * POST /api/documents/:id/versions          — Create a new snapshot
 * POST /api/documents/:id/versions/:vid/restore — Restore a version
 */

import { NextRequest } from "next/server";
import { createVersionSchema } from "@/lib/validations/document";
import {
  getDocumentWithAccess,
  createVersion,
  getDocumentVersions,
  restoreVersion,
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

// GET /api/documents/:id/versions
export async function GET(_req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    const doc = await getDocumentWithAccess(id, user.id);
    if (!doc) return errorResponse("Document not found", 404);

    const versions = await getDocumentVersions(id);
    return successResponse(versions);
  });
}

// POST /api/documents/:id/versions
export async function POST(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    const doc = await getDocumentWithAccess(id, user.id);
    if (!doc) return errorResponse("Document not found", 404);

    if (doc.currentUserRole === "VIEWER") {
      return errorResponse("Forbidden — viewers cannot create versions", 403);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createVersionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const version = await createVersion(id, user.id, parsed.data.label);
    return successResponse(version, 201);
  });
}
