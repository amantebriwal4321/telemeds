import { language } from "@/lib/language";
import { Button } from "@/components/ui/button";

export function Welcome({
  cleared,
  onBegin,
}: {
  cleared: boolean;
  onBegin: () => void;
}) {
  const { ui } = language;
  return (
    <div className="flex flex-col gap-6">
      {cleared ? (
        <p className="text-sm text-primary" role="status">
          {ui.cleared}
        </p>
      ) : null}
      <div>
        <p className="text-sm tracking-wide text-primary">{ui.welcomeKicker}</p>
        <h1 className="mt-2 font-heading text-4xl leading-tight sm:text-5xl">{ui.welcomeTitle}</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{ui.welcomeBody}</p>
      </div>
      <ul className="space-y-2 rounded-3xl border border-border bg-card px-4 py-4 text-sm leading-6">
        {ui.welcomePoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <div>
        <p className="text-sm text-muted-foreground">{ui.topicsLabel}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
          {ui.topics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      </div>
      <Button type="button" className="h-12 rounded-full px-6 text-base" onClick={onBegin}>
        {ui.begin}
      </Button>
      <p className="text-sm leading-6 text-muted-foreground">{ui.welcomeFoot}</p>
    </div>
  );
}
