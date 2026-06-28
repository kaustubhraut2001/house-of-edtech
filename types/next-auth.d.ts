/**
 * types/next-auth.d.ts
 *
 * Augment NextAuth types to include the user ID on the session object.
 */

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
