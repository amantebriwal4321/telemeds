import { language } from "@/lib/language";
import type { CheckInSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";

const rows: Array<[keyof CheckInSummary, string]> = [
  ["wellbeing", "Wellbeing"],
  ["sleep", "Sleep"],
  ["nourishment", "Food and water"],
  ["symptoms", "Pain or symptoms"],
  ["pregnancy", "Pregnancy"],
  ["menstrual", "Menstrual health"],
  ["urgentConcerns", "Urgent concerns"],
];

export function SummaryCard({
  summary,
  copied,
  onCopy,
}: {
  summary: CheckInSummary;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl">{language.ui.summaryTitle}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{language.ui.summaryNote}</p>
        </div>
        <Button type="button" variant="outline" className="h-10 shrink-0 rounded-full px-4" onClick={onCopy}>
          {language.ui.copy}
        </Button>
      </div>
      <dl className="mt-4 space-y-3 text-sm leading-6">
        {rows.map(([key, label]) => (
          <div key={key}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{summary[key]}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm leading-6">{summary.forClinician}</p>
      {copied ? (
        <p className="mt-3 text-sm text-primary" role="status">
          {language.ui.copied}
        </p>
      ) : null}
    </section>
  );
}
