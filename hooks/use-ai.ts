/**
 * hooks/use-ai.ts
 *
 * Hook for AI-powered document features.
 */

"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toaster";
import type { AIAction } from "@/types";

interface UseAIOptions {
  onSuccess?: (result: string, action: AIAction) => void;
}

export function useAI(options?: UseAIOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function runAI(
    action: AIAction,
    text: string,
    targetLanguage?: string
  ): Promise<string | null> {
    if (!text.trim()) {
      toast({
        title: "No text selected",
        description: "Please select or enter some text first.",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text, targetLanguage }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "AI request failed");
      }

      const output: string = json.data.result;
      setResult(output);
      options?.onSuccess?.(output, action);
      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI request failed";
      toast({ title: "AI Error", description: message, variant: "destructive" });
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { runAI, isLoading, result, setResult };
}
