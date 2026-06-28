/**
 * lib/utils/api.ts
 *
 * Server-side API utility helpers.
 * Standardizes response shapes, error handling, and auth checks.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import type { ApiError } from "@/types";

/**
 * Return a typed JSON success response.
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/**
 * Return a typed JSON error response.
 */
export function errorResponse(
  message: string,
  status = 400,
  details?: Record<string, string[]>
): NextResponse {
  const body: ApiError = { error: message };
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * Get the authenticated user from the current request session.
 * Returns null if not authenticated.
 */
export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user as { id: string; name?: string | null; email?: string | null };
}

/**
 * Require authentication — returns user or throws a 401 response.
 * Use at the top of protected route handlers.
 */
export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    throw errorResponse("Unauthorized", 401);
  }
  return user;
}

/**
 * Wrap a route handler in try/catch with consistent error formatting.
 */
export function withErrorHandler(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  return handler().catch((err: unknown) => {
    // If we threw an error response ourselves, return it directly
    if (err instanceof NextResponse) return err;

    console.error("[API Error]", err);

    return errorResponse("Internal server error", 500);
  });
}
