/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * NextAuth v5 catch-all route handler.
 * Handles: GET /api/auth/session, POST /api/auth/signin, etc.
 */

import { handlers } from "@/lib/auth/auth";

export const { GET, POST } = handlers;
