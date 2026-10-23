import type { CheckInSummary } from "./types";

export const summaryRows: Array<[keyof CheckInSummary, string]> = [
  ["wellbeing", "Wellbeing"],
  ["concern", "What is troubling her"],
  ["comfort", "Comfort offered"],
  ["firstAid", "First aid"],
  ["urgentConcerns", "Urgent concerns"],
];

export function formatSummary(summary: CheckInSummary): string {
  const lines = [
    "Aram private check-in",
    "Not a diagnosis. Not a medical record. For a clinician to read with her.",
    "",
    ...summaryRows.map(([key, label]) => `${label}: ${summary[key]}`),
    "",
    "Note for the clinician:",
    summary.forClinician,
    "",
    "This was spoken in a private browser tab. Aram did not save it.",
  ];
  return lines.join("\n");
}
