import type { CheckInSummary } from "./types";

const rows: Array<[keyof CheckInSummary, string]> = [
  ["wellbeing", "Wellbeing"],
  ["sleep", "Sleep"],
  ["nourishment", "Food and water"],
  ["symptoms", "Pain or symptoms"],
  ["pregnancy", "Pregnancy"],
  ["menstrual", "Menstrual health"],
  ["urgentConcerns", "Urgent concerns"],
];

export function formatSummary(summary: CheckInSummary): string {
  const lines = [
    "Aram private check-in",
    "Not a diagnosis. Not a medical record. For a clinician to read with her.",
    "",
    ...rows.map(([key, label]) => `${label}: ${summary[key]}`),
    "",
    "Note for the clinician:",
    summary.forClinician,
    "",
    "This was spoken in a private browser tab. Aram did not save it.",
  ];
  return lines.join("\n");
}
