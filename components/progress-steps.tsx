import { language } from "@/lib/language";
import type { Phase } from "@/lib/types";

function currentIndex(phase: Phase | null): number {
  if (!phase) return -1;
  const id = phase === "urgent_stop" ? "summary" : phase;
  return language.ui.steps.findIndex((step) => step.id === id);
}

export function ProgressSteps({ phase }: { phase: Phase | null }) {
  const current = currentIndex(phase);
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Check-in">
      {language.ui.steps.map((step, index) => {
        const state = current < 0 ? "todo" : index < current ? "done" : index === current ? "now" : "todo";
        return (
          <li
            key={step.id}
            aria-current={state === "now" ? "step" : undefined}
            className={
              state === "now"
                ? "rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground"
                : state === "done"
                  ? "rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
                  : "rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
            }
          >
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
