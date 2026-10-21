import "server-only";

import OpenAI from "openai";

import { language } from "./language";

let client: OpenAI | undefined;

export function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!client) {
    client = new OpenAI({ apiKey, timeout: 45_000, maxRetries: 0 });
  }
  return client;
}

export function publicAiError(error: unknown): { status: number; message: string } {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) {
      return { status: 503, message: language.ui.errors.missingKey };
    }
    if (error.status === 429) {
      return { status: 429, message: language.ui.errors.rateLimit };
    }
  }
  return { status: 502, message: language.ui.errors.generic };
}

export function logUpstreamStatus(error: unknown) {
  const status = error instanceof OpenAI.APIError ? error.status ?? 0 : 0;
  console.error("aram_upstream_error", status);
}
