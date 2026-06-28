/**
 * features/ai/ai-panel.tsx
 *
 * AI-powered writing assistant panel.
 * Actions: summarize, improve, grammar, generate_title, rewrite,
 *          translate, continue, explain.
 */

"use client";

import { useState } from "react";
import {
  X,
  Sparkles,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import { useAI } from "@/hooks/use-ai";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils/cn";
import type { AIAction } from "@/types";

interface AIPanelProps {
  documentContent: string;
  onApply: (result: string) => void;
  onClose: () => void;
}

interface AIActionConfig {
  action: AIAction;
  label: string;
  description: string;
  emoji: string;
}

const AI_ACTIONS: AIActionConfig[] = [
  { action: "summarize",      label: "Summarize",      description: "Get a concise summary",          emoji: "📝" },
  { action: "improve",        label: "Improve Writing", description: "Enhance quality and clarity",    emoji: "✨" },
  { action: "grammar",        label: "Fix Grammar",     description: "Correct grammar and spelling",   emoji: "🔍" },
  { action: "generate_title", label: "Generate Title",  description: "Create a document title",        emoji: "🏷️" },
  { action: "rewrite",        label: "Rewrite",         description: "Rewrite more professionally",    emoji: "♻️" },
  { action: "continue",       label: "Continue Writing",description: "Add more content naturally",     emoji: "▶️" },
  { action: "explain",        label: "Explain",         description: "Explain in simple terms",        emoji: "💡" },
  { action: "translate",      label: "Translate",       description: "Translate to another language",  emoji: "🌐" },
];

export function AIPanel({ documentContent, onApply, onClose }: AIPanelProps) {
  const { runAI, isLoading, result, setResult } = useAI();
  const [selectedAction, setSelectedAction] = useState<AIAction | null>(null);
  const [customText, setCustomText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [copied, setCopied] = useState(false);

  async function handleRun(action: AIAction) {
    setSelectedAction(action);
    setResult(null);

    const text = customText.trim() || documentContent;
    await runAI(action, text, action === "translate" ? targetLanguage : undefined);
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard", variant: "success" });
  }

  function handleApply() {
    if (!result) return;
    onApply(result);
    toast({ title: "Applied to document", variant: "success" });
  }

  return (
    <div className="flex h-full flex-col bg-[var(--card)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
          <h3 className="font-semibold text-[var(--foreground)]">AI Assistant</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
          aria-label="Close AI panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Optional: custom text input */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Selected Text (optional)
          </p>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Paste specific text here, or leave empty to use the full document…"
            rows={3}
            className={cn(
              "w-full resize-none rounded-md border border-[var(--input)] bg-transparent",
              "px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            )}
          />
        </div>

        {/* Language selector for translate */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Translate to
          </p>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-full h-9 rounded-md border border-[var(--input)] bg-transparent px-2 text-sm text-[var(--foreground)]"
          >
            {["Spanish", "French", "German", "Italian", "Portuguese", "Japanese", "Chinese", "Hindi", "Arabic"].map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Actions
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {AI_ACTIONS.map(({ action, label, description, emoji }) => (
              <button
                key={action}
                onClick={() => handleRun(action)}
                disabled={isLoading}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5",
                  "text-left transition-colors hover:bg-[var(--accent)] hover:border-[var(--primary)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                  selectedAction === action && result
                    ? "border-[var(--primary)] bg-indigo-50 dark:bg-indigo-950"
                    : "",
                  isLoading && selectedAction === action ? "opacity-60" : ""
                )}
                aria-label={`Run: ${label}`}
              >
                <span className="text-lg" aria-hidden="true">{emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{description}</p>
                </div>
                {isLoading && selectedAction === action ? (
                  <Spinner size="sm" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Result
            </p>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3">
              <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                {result}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex-1 gap-1.5"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="flex-1 gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
