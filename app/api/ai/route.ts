/**
 * app/api/ai/route.ts
 *
 * POST /api/ai
 *
 * AI-powered writing tools.
 * Accepts text + an action and returns AI-generated output.
 * Uses the Anthropic Claude API via the AI SDK.
 */

import { NextRequest, NextResponse } from "next/server";
import { aiRequestSchema } from "@/lib/validations/document";
import {
  requireAuth,
  errorResponse,
  withErrorHandler,
} from "@/lib/utils/api";

// Build the prompt for each AI action
function buildPrompt(action: string, text: string, targetLanguage?: string): string {
  switch (action) {
    case "summarize":
      return `Summarize the following text concisely in 2-3 sentences:\n\n${text}`;
    case "improve":
      return `Improve the writing quality of the following text while preserving its meaning and tone:\n\n${text}\n\nReturn only the improved text, no explanation.`;
    case "grammar":
      return `Fix all grammar, spelling, and punctuation errors in the following text. Return only the corrected text:\n\n${text}`;
    case "generate_title":
      return `Generate a concise, descriptive title for the following document content. Return only the title, nothing else:\n\n${text}`;
    case "rewrite":
      return `Rewrite the following text in a clearer and more professional way:\n\n${text}\n\nReturn only the rewritten text.`;
    case "translate":
      return `Translate the following text to ${targetLanguage ?? "Spanish"}. Return only the translated text:\n\n${text}`;
    case "continue":
      return `Continue writing the following text naturally, maintaining the same style and tone. Add 2-3 sentences:\n\n${text}`;
    case "explain":
      return `Explain the following text in simple, easy-to-understand terms:\n\n${text}`;
    default:
      return text;
  }
}

export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    await requireAuth();

    const body = await req.json();
    const parsed = aiRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { action, text, targetLanguage } = parsed.data;
    const prompt = buildPrompt(action, text, targetLanguage);

    // Check for API Keys
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!geminiKey && !anthropicKey) {
      return errorResponse("AI service is not configured", 503);
    }

    let result = "";

    if (geminiKey) {
      // Call Google Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error("[Gemini API Error]", errText);
        return errorResponse("AI service request failed", 502);
      }

      const aiData = await response.json();
      result = aiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from AI service.";
    } else {
      // Call Anthropic Claude API
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[Anthropic API Error]", errText);
        return errorResponse("AI service request failed", 502);
      }

      const aiData = await response.json();
      result = aiData?.content?.[0]?.text ?? "No response from AI service.";
    }

    return NextResponse.json({ data: { result, action } });
  });
}
