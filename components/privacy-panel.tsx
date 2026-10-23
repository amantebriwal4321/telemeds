import { language } from "@/lib/language";

export function PrivacyPanel() {
  const { ui } = language;
  return (
    <section className="rounded-3xl border border-border bg-card px-4 py-4" aria-labelledby="privacy-title">
      <h2 id="privacy-title" className="font-heading text-2xl">
        {ui.privacyTitle}
      </h2>
      <h3 className="mt-3 text-sm font-medium">{ui.privacyStoredTitle}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
        {ui.privacyStored.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h3 className="mt-4 text-sm font-medium">{ui.privacyNotTitle}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
        {ui.privacyNot.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
