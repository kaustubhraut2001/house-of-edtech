/**
 * app/(dashboard)/settings/page.tsx
 */

"use client";

import { signOut } from "next-auth/react";
import { LogOut, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clearLocalData } from "@/lib/db/local";
import { toast } from "@/components/ui/toaster";

export default function SettingsPage() {
  async function handleClearCache() {
    await clearLocalData();
    toast({ title: "Local cache cleared", variant: "success" });
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Settings</h1>

      {/* Offline Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Offline Storage</CardTitle>
          <CardDescription>
            CollabDocs stores a local copy of your documents in your browser for offline use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear Local Cache
          </Button>
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            This removes all locally cached documents. Your server data is unaffected.
          </p>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Manage your session.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
