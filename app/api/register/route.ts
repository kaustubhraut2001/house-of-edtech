/**
 * app/api/register/route.ts
 *
 * POST /api/register
 * Creates a new user account with a hashed password.
 */

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/validations/auth";
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from "@/lib/utils/api";

export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    const body = await req.json();

    // Validate request body with Zod
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { name, email, password } = parsed.data;

    // Check if email is already in use
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("An account with this email already exists", 409);
    }

    // Hash password with bcrypt (cost factor 12 — strong but not too slow)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the user
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return successResponse(
      { user, message: "Account created successfully" },
      201
    );
  });
}
