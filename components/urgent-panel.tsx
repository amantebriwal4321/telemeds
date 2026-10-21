import { language } from "@/lib/language";
import type { UrgentKind } from "@/lib/types";

export function UrgentPanel({ kind }: { kind: Exclude<UrgentKind, "none"> }) {
  const { safety } = language;
  const selfHarm = kind === "self_harm";
  return (
    <section
      className="rounded-3xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm leading-6"
      role="note"
      aria-label={safety.urgentTitle}
    >
      <h2 className="font-heading text-xl text-destructive">{safety.urgentTitle}</h2>
      <p className="mt-2 text-foreground">
        {selfHarm ? safety.urgentSelfHarmBody : safety.urgentMedicalBody}
      </p>
      <p className="mt-3">
        <a className="font-medium underline underline-offset-4" href={`tel:${safety.ambulanceNumber}`}>
          {safety.ambulanceLabel} {safety.ambulanceNumber}
        </a>
        <span className="text-muted-foreground"> · </span>
        <a className="font-medium underline underline-offset-4" href={`tel:${safety.helplineNumber}`}>
          {safety.helplineLabel} {safety.helplineNumber}
        </a>
      </p>
      <p className="mt-2 text-muted-foreground">{safety.helplineNote}</p>
    </section>
  );
}
