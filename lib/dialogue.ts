import { limits } from "./limits";
import { language } from "./language";
import {
  applyMedicalSafety,
  mentionsMedicalRedFlag,
  mentionsSelfHarm,
  needsHandsOnFirstAid,
  replyIsUnsafe,
  selfHarmTurn,
} from "./safety";
import type { CheckInSummary, CheckInTurn, Phase, UrgentKind } from "./types";

export type Notes = {
  wellbeing: string;
  concern: string;
  comfort: string;
  firstAid: string;
};

export function emptyNotes(): Notes {
  return { wellbeing: "", concern: "", comfort: "", firstAid: "" };
}

function clip(text: string, max: number): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

export function comfortFor(text: string): string {
  const sample = text.toLowerCase();
  const { remedies } = language;
  if (/fever|temperature/.test(sample)) return remedies.fever;
  if (/throat|cough|cold|hoarse/.test(sample)) return remedies.throat;
  if (/headache|\bhead\b/.test(sample)) return remedies.head;
  if (/stomach|nausea|belly|vomit/.test(sample)) return remedies.stomach;
  if (/tired|sleep|exhaust|weak|sleepy/.test(sample)) return remedies.rest;
  return remedies.general;
}

export function acknowledgementInstruction(latestUser: string): string {
  const words = clip(latestUser, 400);
  return [
    "She just spoke. The words she said are between the marks.",
    "Reply with one short, gentle, deferential sentence that thanks her.",
    "Do not ask a question. Do not give advice. Do not diagnose. Do not name a medicine or a dose.",
    "Do not repeat a name. No markdown.",
    `<<<${words}>>>`,
  ].join(" ");
}

export function withModelThanks(reply: string, modelText: string | null): string {
  const cleaned = cleanAcknowledgement(modelText);
  const scripted = language.ui.thanks;
  if (cleaned.prepared || !reply.startsWith(scripted)) return reply;
  return `${cleaned.text}${reply.slice(scripted.length)}`;
}

function cleanAcknowledgement(raw: string | null): { text: string; prepared: boolean } {
  const fallback = language.ui.thanks;
  if (!raw) return { text: fallback, prepared: true };
  const text = raw.replace(/[*_`#<>]/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return { text: fallback, prepared: true };
  if (replyIsUnsafe(text) || mentionsSelfHarm(text)) return { text: fallback, prepared: true };
  if (
    /if she|instruction|system|diagnos|doctor|clinician|medicine|dose|khuda|assalaam|ignore /i.test(text)
  ) {
    return { text: fallback, prepared: true };
  }
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  const statement = sentences.map((sentence) => sentence.trim()).find((sentence) => sentence && !sentence.includes("?"));
  if (!statement || statement.length > 120 || !/\bthank you\b/i.test(statement)) {
    return { text: fallback, prepared: true };
  }
  return { text: statement, prepared: false };
}

function summaryFrom(notes: Notes, urgentKind: UrgentKind): CheckInSummary {
  const { ui, safety } = language;
  const blank = ui.notDiscussed;
  const wellbeing = notes.wellbeing || blank;
  const concern = notes.concern || blank;
  const comfort = notes.comfort || blank;
  const firstAid = notes.firstAid || blank;
  const urgentConcerns =
    urgentKind === "self_harm"
      ? safety.selfHarmSummary
      : urgentKind === "medical"
        ? safety.medicalUrgentSummary
        : "None she mentioned";
  const forClinician = clip(
    `This is not a diagnosis. Wellbeing: ${wellbeing} Concern: ${concern} Comfort offered: ${comfort} First aid: ${firstAid} Urgent: ${urgentConcerns} Please assess her in person. This screen did not examine her.`,
    limits.clinicianChars,
  );
  return {
    wellbeing: clip(wellbeing, limits.summaryFieldChars),
    concern: clip(concern, limits.summaryFieldChars),
    comfort: clip(comfort, limits.summaryFieldChars),
    firstAid: clip(firstAid, limits.summaryFieldChars),
    urgentConcerns: clip(urgentConcerns, limits.summaryFieldChars),
    forClinician,
  };
}

function fit(ack: string, rest: string): string {
  const body = rest.replace(/\s+/g, " ").trim();
  const room = limits.replyChars - body.length - 1;
  if (room >= 24) {
    return `${ack.slice(0, room).trim()} ${body}`.replace(/\s+/g, " ").trim();
  }
  if (body.length <= limits.replyChars) return body;
  return body.slice(body.length - limits.replyChars).trim();
}

function remember(notes: Notes, phase: Phase, latest: string): Notes {
  const next = { ...notes };
  const clipped = clip(latest, limits.summaryFieldChars);
  if (phase === "wellbeing") next.wellbeing = clipped;
  else next.concern = clip(next.concern ? `${next.concern} ${clipped}` : clipped, limits.summaryFieldChars);
  return next;
}

export function openingTurn(): CheckInTurn {
  const { ui } = language;
  return {
    reply: `${ui.greeting} ${ui.askWellbeing}`,
    phase: "wellbeing",
    urgent: false,
    urgentKind: "none",
    summary: null,
  };
}

export function planReply(input: {
  phase: Phase;
  latestUser: string;
  notes: Notes;
  modelAcknowledgement: string | null;
  modelAttempted: boolean;
}): { turn: CheckInTurn; notes: Notes; prepared: boolean } {
  const { ui, safety } = language;
  const latest = clip(input.latestUser, limits.textMessage);
  if (input.phase === "urgent_stop" || mentionsSelfHarm(latest)) {
    return { turn: selfHarmTurn(), notes: input.notes, prepared: false };
  }

  const skip = latest === ui.skipUtterance;
  const finish = latest === ui.finishUtterance;
  const handsOn = !skip && !finish && needsHandsOnFirstAid(latest);
  const medical = handsOn || (!skip && !finish && mentionsMedicalRedFlag(latest));
  const cleaned = input.modelAttempted
    ? cleanAcknowledgement(input.modelAcknowledgement)
    : { text: ui.thanks, prepared: false };
  const ack = skip || finish ? ui.skipThanks : cleaned.text;
  const prepared = input.modelAttempted && cleaned.prepared;
  let notes = skip || finish ? { ...input.notes } : remember(input.notes, input.phase, latest);

  const close = (urgentKind: UrgentKind, rest: string, firstAid: boolean): CheckInTurn => {
    if (firstAid) notes = { ...notes, firstAid: safety.firstAidSummary };
    const reply = fit(ack, rest);
    const drafted: CheckInTurn = {
      reply,
      phase: "summary",
      urgent: urgentKind === "medical",
      urgentKind,
      summary: summaryFrom(notes, urgentKind),
    };
    return applyMedicalSafety(drafted, latest);
  };

  if (handsOn) {
    return {
      turn: close("medical", `${safety.firstAidScript} ${ui.closing}`, true),
      notes,
      prepared,
    };
  }

  if (medical) {
    notes = { ...notes, comfort: comfortFor(`${notes.wellbeing} ${notes.concern} ${latest}`) };
    return {
      turn: close("medical", `${notes.comfort} ${ui.clinicianLine} ${ui.closing}`, false),
      notes,
      prepared,
    };
  }

  if (finish || input.phase === "care" || input.phase === "summary" || input.phase === "first_aid") {
    return {
      turn: close("none", ui.closing, false),
      notes,
      prepared,
    };
  }

  if (input.phase === "concern") {
    const comfort = comfortFor(`${notes.wellbeing} ${notes.concern}`);
    notes = { ...notes, comfort };
    const drafted: CheckInTurn = {
      reply: fit(ack, `${comfort} ${ui.askMore}`),
      phase: "care",
      urgent: false,
      urgentKind: "none",
      summary: null,
    };
    return { turn: applyMedicalSafety(drafted, latest), notes, prepared };
  }

  const drafted: CheckInTurn = {
    reply: fit(ack, ui.askConcern),
    phase: "concern",
    urgent: false,
    urgentKind: "none",
    summary: null,
  };
  return { turn: applyMedicalSafety(drafted, latest), notes, prepared };
}
