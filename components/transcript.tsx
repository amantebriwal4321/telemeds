import { language } from "@/lib/language";
import type { Turn } from "@/lib/types";

export function Transcript({ messages }: { messages: Turn[] }) {
  if (messages.length === 0) {
    return <p className="text-muted-foreground">{language.ui.preparing}</p>;
  }

  return (
    <ol className="space-y-5" aria-label="Conversation">
      {messages.map((message, index) => {
        const mine = message.role === "user";
        return (
          <li key={`${index}-${message.role}`} className={mine ? "flex justify-end" : ""}>
            <div className={mine ? "max-w-[85%]" : "max-w-full"}>
              <p className="mb-1 text-xs tracking-wide text-muted-foreground">
                {mine ? language.ui.youLabel : language.ui.voiceName}
              </p>
              <p
                className={
                  mine
                    ? "rounded-3xl bg-secondary px-4 py-3 text-base leading-7"
                    : "font-heading text-2xl leading-snug"
                }
              >
                {message.content}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
