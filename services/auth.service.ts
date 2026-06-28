/**
 * services/auth.service.ts
 *
 * Business logic for authentication.
 *
 * Responsibilities:
 *  - Register a new user (hash password, check duplicates)
 *  - Validate login credentials
 *  - Fetch a user profile by ID
 *
 * This layer sits between API route handlers and the database.
 * Route handlers must never call Prisma directly — they call this service.
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import type { UserProfile } from "@/types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  success: boolean;
  user?: UserProfile;
  error?: "EMAIL_TAKEN" | "UNKNOWN";
}

export interface LoginResult {
  success: boolean;
  user?: UserProfile;
  error?: "INVALID_CREDENTIALS" | "NO_PASSWORD" | "UNKNOWN";
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

export const authService = {
  /**
   * Register a new user.
   * Hashes the password with bcrypt (cost factor 12).
   * Returns an error if the email is already registered.
   */
  async register(payload: RegisterPayload): Promise<RegisterResult> {
    try {
      // 1. Check for existing account
      const existing = await prisma.user.findUnique({
        where: { email: payload.email },
        select: { id: true },
      });

      if (existing) {
        return { success: false, error: "EMAIL_TAKEN" };
      }

      // 2. Hash password — cost 12 is strong yet fast enough for sign-up UX
      const hashedPassword = await bcrypt.hash(payload.password, 12);

      // 3. Create the user
      const user = await prisma.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      });

      return { success: true, user };
    } catch {
      return { success: false, error: "UNKNOWN" };
    }
  },

  /**
   * Validate credentials for the NextAuth credentials provider.
   * Uses constant-time bcrypt comparison to prevent timing attacks.
   */
  async validateCredentials(
    email: string,
    password: string
  ): Promise<LoginResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          password: true,
          createdAt: true,
        },
      });

      // User not found — return generic error to prevent user enumeration
      if (!user) {
        return { success: false, error: "INVALID_CREDENTIALS" };
      }

      // OAuth user (no password set)
      if (!user.password) {
        return { success: false, error: "NO_PASSWORD" };
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return { success: false, error: "INVALID_CREDENTIALS" };
      }

      const { password: _pwd, ...safeUser } = user;
      return { success: true, user: safeUser };
    } catch {
      return { success: false, error: "UNKNOWN" };
    }
  },

  /**
   * Fetch a user's public profile by ID.
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });
  },

  /**
   * Find a user by email (used when adding document members).
   */
  async findUserByEmail(
    email: string
  ): Promise<Pick<UserProfile, "id" | "name" | "email" | "image"> | null> {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, image: true },
    });
  },
};
