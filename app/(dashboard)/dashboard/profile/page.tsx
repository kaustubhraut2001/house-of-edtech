/**
 * app/(dashboard)/profile/page.tsx
 */

"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInitials, formatDateTime } from "@/lib/utils/format";

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
              <AvatarFallback className="text-xl">{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">{user?.name ?? "—"}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{user?.email}</p>
              <Badge variant="secondary" className="mt-1 text-xs">Free Plan</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide font-medium">User ID</p>
              <p className="text-sm text-[var(--foreground)] font-mono mt-1 truncate">{user?.id ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide font-medium">Email</p>
              <p className="text-sm text-[var(--foreground)] mt-1">{user?.email ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
