/**
 * app/api/documents/route.ts
 *
 * GET  /api/documents  — List all documents for the authenticated user
 * POST /api/documents  — Create a new document
 */

import { NextRequest } from "next/server";
import { createDocumentSchema } from "@/lib/validations/document";
import {
  getDocumentsForUser,
  createDocument,
} from "@/repositories/document.repository";
import {
  requireAuth,
  successResponse,
  errorResponse,
  withErrorHandler,
} from "@/lib/utils/api";

// GET /api/documents
export async function GET() {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const documents = await getDocumentsForUser(user.id);
    return successResponse(documents);
  });
}

// POST /api/documents
export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    const user = await requireAuth();

    const body = await req.json();
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const document = await createDocument(
      user.id,
      parsed.data.title,
      parsed.data.content
    );

    return successResponse(document, 201);
  });
}
