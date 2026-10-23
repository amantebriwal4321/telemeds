import { limits } from "./limits";
import { isPhase, type Phase, type Turn } from "./types";

export type ChatRequest = {
  intent: "start" | "continue";
  messages: Turn[];
  fallbackPhase: Phase;
};

export function sanitizeMessages(
  input: unknown,
): { ok: true; messages: Turn[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: "The conversation could not be read." };
  }
  if (input.length > limits.historyTurns) {
    return {
      ok: false,
      error: "This check-in has become long. Please erase it and begin again if you wish.",
    };
  }

  const messages: Turn[] = [];
  let total = 0;
  for (const item of input) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "The conversation could not be read." };
    }
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") {
      return { ok: false, error: "The conversation could not be read." };
    }
    if (typeof content !== "string") {
      return { ok: false, error: "The conversation could not be read." };
    }
    const cleaned = content
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .trim();
    if (!cleaned) continue;
    if (cleaned.length > limits.textMessage) {
      return {
        ok: false,
        error: "That message is too long. Please shorten it a little.",
      };
    }
    total += cleaned.length;
    if (total > limits.historyChars) {
      return {
        ok: false,
        error: "This check-in has become long. Please erase it and begin again if you wish.",
      };
    }
    messages.push({ role, content: cleaned });
  }
  return { ok: true, messages };
}

export function parseChatBody(
  raw: unknown,
): { ok: true; value: ChatRequest } | { ok: false; error: string; status: number } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "The conversation could not be read.", status: 400 };
  }
  const record = raw as { intent?: unknown; messages?: unknown; phase?: unknown };
  if (record.intent !== "start" && record.intent !== "continue") {
    return { ok: false, error: "The conversation could not be read.", status: 400 };
  }
  const sanitized = sanitizeMessages(record.messages ?? []);
  if (!sanitized.ok) {
    return { ok: false, error: sanitized.error, status: 400 };
  }
  if (record.intent === "continue") {
    const last = sanitized.messages[sanitized.messages.length - 1];
    if (!last || last.role !== "user") {
      return {
        ok: false,
        error: "Please say or type a few words first.",
        status: 400,
      };
    }
  }
  return {
    ok: true,
    value: {
      intent: record.intent,
      messages: record.intent === "start" ? [] : sanitized.messages,
      fallbackPhase: isPhase(record.phase) ? record.phase : "wellbeing",
    },
  };
}
