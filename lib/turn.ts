import { limits } from "./limits";
import { language } from "./language";
import {
  isPhase,
  isUrgentKind,
  type CheckInSummary,
  type CheckInTurn,
  type Phase,
} from "./types";

const summarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    wellbeing: { type: "string" },
    concern: { type: "string" },
    comfort: { type: "string" },
    firstAid: { type: "string" },
    urgentConcerns: { type: "string" },
    forClinician: { type: "string" },
  },
  required: ["wellbeing", "concern", "comfort", "firstAid", "urgentConcerns", "forClinician"],
} as const;

export const turnResponseFormat = {
  type: "json_schema" as const,
  json_schema: {
    name: "check_in_turn",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        reply: { type: "string" },
        phase: { type: "string", enum: ["wellbeing", "concern", "care", "first_aid", "summary", "urgent_stop"] },
        urgent: { type: "boolean" },
        urgentKind: { type: "string", enum: ["none", "medical", "self_harm"] },
        summary: { anyOf: [summarySchema, { type: "null" }] },
      },
      required: ["reply", "phase", "urgent", "urgentKind", "summary"],
    },
  },
};

function field(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return language.ui.notDiscussed;
  return text.slice(0, max);
}

function parseSummary(value: unknown): CheckInSummary | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const wellbeing = field(record.wellbeing, limits.summaryFieldChars);
  const concern = field(record.concern, limits.summaryFieldChars);
  const comfort = field(record.comfort, limits.summaryFieldChars);
  const firstAid = field(record.firstAid, limits.summaryFieldChars);
  const urgentConcerns = field(record.urgentConcerns, limits.summaryFieldChars);
  const forClinician = field(record.forClinician, limits.clinicianChars);
  if (!wellbeing || !concern || !comfort || !firstAid || !urgentConcerns || !forClinician) {
    return null;
  }
  return {
    wellbeing,
    concern,
    comfort,
    firstAid,
    urgentConcerns,
    forClinician,
  };
}

export function parseTurn(raw: string): CheckInTurn | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (typeof record.reply !== "string" || !isPhase(record.phase) || typeof record.urgent !== "boolean") {
    return null;
  }
  if (!isUrgentKind(record.urgentKind)) return null;

  const reply = record.reply
    .replace(/[\r\n]+/g, " ")
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limits.replyChars);
  if (!reply) return null;

  const phase: Phase = record.phase;
  const closing = phase === "summary" || phase === "urgent_stop";
  const summary = closing ? parseSummary(record.summary) : null;
  if (closing && !summary) return null;

  return {
    reply,
    phase,
    urgent: record.urgent,
    urgentKind: record.urgentKind,
    summary,
  };
}
