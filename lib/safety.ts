import { language } from "./language";
import type { CheckInSummary, CheckInTurn } from "./types";

const NEGATION =
  /\b(not|no|never|don't|dont|do not|without|isn't|isnt|aren't|arent|won't|wont|no thoughts of)\b/i;

const SELF_HARM: Array<{ pattern: RegExp; allowNegation: boolean }> = [
  { pattern: /don'?t want to (live|be alive|wake up)/i, allowNegation: false },
  { pattern: /do not want to (live|be alive)/i, allowNegation: false },
  { pattern: /better off dead/i, allowNegation: false },
  { pattern: /no reason to live/i, allowNegation: false },
  { pattern: /end my life/i, allowNegation: true },
  { pattern: /kill myself/i, allowNegation: true },
  { pattern: /killing myself/i, allowNegation: true },
  { pattern: /\bwant to die\b/i, allowNegation: true },
  { pattern: /\bwanna die\b/i, allowNegation: true },
  { pattern: /suicid/i, allowNegation: true },
  { pattern: /self[-\s]?harm/i, allowNegation: true },
  { pattern: /hurt myself/i, allowNegation: true },
  { pattern: /harm myself/i, allowNegation: true },
  { pattern: /take my (own )?life/i, allowNegation: true },
];

const MEDICAL: RegExp[] = [
  /heavy bleeding/i,
  /bleeding (a lot|heavily|through)/i,
  /soaking (a |through )?(pad|cloth)/i,
  /can'?t breathe/i,
  /cannot breathe/i,
  /trouble breathing/i,
  /hard to breathe/i,
  /short of breath/i,
  /severe pain/i,
  /pain is (severe|unbearable|worst)/i,
  /worst pain/i,
  /high fever/i,
  /\bfever\b/i,
  /chest pain/i,
  /\bfainted\b/i,
  /passed out/i,
  /\bseizure\b/i,
  /convuls/i,
];

const GRAPHIC =
  /\b(overdose|poison|hang myself|rope|blade|wrist|slit|pills to die|bleed out)\b/i;

function matched(text: string, pattern: RegExp, allowNegation: boolean): boolean {
  const match = pattern.exec(text);
  if (!match || match.index === undefined) return false;
  if (!allowNegation) return true;
  const window = text.slice(Math.max(0, match.index - 40), match.index);
  return !NEGATION.test(window);
}

export function mentionsSelfHarm(text: string): boolean {
  return SELF_HARM.some(({ pattern, allowNegation }) =>
    matched(text, pattern, allowNegation),
  );
}

export function mentionsMedicalRedFlag(text: string): boolean {
  return MEDICAL.some((pattern) => matched(text, pattern, true));
}

export function selfHarmTurn(): CheckInTurn {
  const { safety, ui } = language;
  return {
    reply: safety.selfHarmSpoken,
    phase: "urgent_stop",
    urgent: true,
    urgentKind: "self_harm",
    summary: {
      wellbeing: ui.notDiscussed,
      sleep: ui.notDiscussed,
      nourishment: ui.notDiscussed,
      symptoms: ui.notDiscussed,
      pregnancy: ui.notDiscussed,
      menstrual: ui.notDiscussed,
      urgentConcerns: safety.selfHarmSummary,
      forClinician: safety.selfHarmClinician,
    },
  };
}

export function usableCrisisSummary(summary: CheckInSummary | null): CheckInSummary | null {
  if (!summary) return null;
  const blob = Object.values(summary).join("\n");
  if (mentionsSelfHarm(blob) || GRAPHIC.test(blob)) return null;
  return summary;
}

function alreadyAdvisesCare(reply: string): boolean {
  return /\b(clinic|midwife|ambulance|doctor|102|urgent care)\b/i.test(reply);
}

export function applyMedicalSafety(turn: CheckInTurn, latestUserText: string): CheckInTurn {
  if (turn.urgentKind === "self_harm" || mentionsSelfHarm(latestUserText)) {
    const fixed = selfHarmTurn();
    return {
      ...fixed,
      summary: usableCrisisSummary(turn.summary) ?? fixed.summary,
    };
  }

  const modelMedical =
    turn.urgentKind === "medical" ||
    (turn.urgent &&
      (turn.phase === "red_flags" || turn.phase === "summary" || turn.phase === "urgent_stop"));
  const medical = modelMedical || mentionsMedicalRedFlag(latestUserText);
  if (!medical) {
    return { ...turn, urgent: false, urgentKind: "none" };
  }

  const reply = (alreadyAdvisesCare(turn.reply)
    ? turn.reply
    : `${turn.reply} ${language.safety.medicalAdvice}`
  )
    .trim()
    .slice(0, 1_200);

  return {
    ...turn,
    reply,
    urgent: true,
    urgentKind: "medical",
  };
}
