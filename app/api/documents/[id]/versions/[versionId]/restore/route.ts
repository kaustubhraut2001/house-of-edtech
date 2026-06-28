/**
 * app/api/documents/[id]/versions/[versionId]/restore/route.ts
 *
 * POST /api/documents/:id/versions/:versionId/restore
 *
 * Restores document to a previous version.
 * Always creates a snapshot of the current state first — history is never destroyed.
 */

import { NextRequest } from "next/server";
import { getDocumentWithAccess, restoreVersion } from "@/repositories/document.repository";
import {
  requireAuth,
  successResponse,
  errorResponse,
  withErrorHandler,
} from "@/lib/utils/api";

interface Params {
  params: Promise<{ id: string; versionId: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id, versionId } = await params;

    const doc = await getDocumentWithAccess(id, user.id);
    if (!doc) return errorResponse("Document not found", 404);

    if (doc.currentUserRole === "VIEWER") {
      return errorResponse("Forbidden — viewers cannot restore versions", 403);
    }

    const updated = await restoreVersion(id, versionId, user.id);
    return successResponse(updated);
  });
}
