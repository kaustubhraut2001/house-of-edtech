/**
 * app/(auth)/register/page.tsx
 */

import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a new CollabDocs account.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
