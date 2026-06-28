/**
 * app/api/documents/[id]/members/route.ts
 *
 * GET    /api/documents/:id/members  — List members
 * POST   /api/documents/:id/members  — Add/update a member
 * DELETE /api/documents/:id/members  — Remove a member
 */

import { NextRequest } from "next/server";
import { addMemberSchema } from "@/lib/validations/document";
import { prisma } from "@/lib/db/prisma";
import {
  getDocumentWithAccess,
  upsertDocumentMember,
  removeDocumentMember,
} from "@/repositories/document.repository";
import {
  requireAuth,
  successResponse,
  errorResponse,
  withErrorHandler,
} from "@/lib/utils/api";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/documents/:id/members
export async function GET(_req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    const doc = await getDocumentWithAccess(id, user.id);
    if (!doc) return errorResponse("Document not found", 404);

    return successResponse(doc.members);
  });
}

// POST /api/documents/:id/members — Add a member (owner only)
export async function POST(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    const doc = await getDocumentWithAccess(id, user.id);
    if (!doc) return errorResponse("Document not found", 404);
    if (doc.currentUserRole !== "OWNER") {
      return errorResponse("Forbidden — only owners can add members", 403);
    }

    const body = await req.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    // Find the user to add by email
    const targetUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (!targetUser) {
      return errorResponse("No user found with that email address", 404);
    }

    if (targetUser.id === user.id) {
      return errorResponse("You cannot add yourself as a member", 400);
    }

    const member = await upsertDocumentMember(
      id,
      targetUser.id,
      parsed.data.role
    );

    return successResponse(member, 201);
  });
}

// DELETE /api/documents/:id/members — Remove a member (owner only)
export async function DELETE(req: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    const doc = await getDocumentWithAccess(id, user.id);
    if (!doc) return errorResponse("Document not found", 404);
    if (doc.currentUserRole !== "OWNER") {
      return errorResponse("Forbidden — only owners can remove members", 403);
    }

    const { memberId } = await req.json();
    if (!memberId) return errorResponse("memberId is required", 400);

    const removed = await removeDocumentMember(id, memberId);
    if (!removed) return errorResponse("Member not found", 404);

    return successResponse({ message: "Member removed" });
  });
}
