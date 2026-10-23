export const PHASES = [
  "wellbeing",
  "concern",
  "care",
  "first_aid",
  "summary",
  "urgent_stop",
] as const;

export type Phase = (typeof PHASES)[number];

export type UrgentKind = "none" | "medical" | "self_harm";

export type Turn = {
  role: "user" | "assistant";
  content: string;
};

export type CheckInSummary = {
  wellbeing: string;
  concern: string;
  comfort: string;
  firstAid: string;
  urgentConcerns: string;
  forClinician: string;
};

export type CheckInTurn = {
  reply: string;
  phase: Phase;
  urgent: boolean;
  urgentKind: UrgentKind;
  summary: CheckInSummary | null;
};

export function isPhase(value: unknown): value is Phase {
  return typeof value === "string" && (PHASES as readonly string[]).includes(value);
}

export function isUrgentKind(value: unknown): value is UrgentKind {
  return value === "none" || value === "medical" || value === "self_harm";
}
