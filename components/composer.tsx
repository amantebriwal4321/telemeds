import { language } from "@/lib/language";
import { inputDisabled, microphoneDisabled, type ComposerStatus } from "@/lib/composer-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Composer({
  status,
  draft,
  showHearAgain,
  statusText,
  modelStatus,
  voiceStatus,
  onDraft,
  onMic,
  onSend,
  onSkip,
  onFinish,
  onHearAgain,
}: {
  status: ComposerStatus;
  draft: string;
  showHearAgain: boolean;
  statusText: string;
  modelStatus: string;
  voiceStatus: string;
  onDraft: (value: string) => void;
  onMic: () => void;
  onSend: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onHearAgain: () => void;
}) {
  const listening = status === "listening";
  const typingClosed = inputDisabled(status);
  return (
    <div className="border-t border-border bg-background/95 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
      <p className="min-h-5 text-center text-sm text-muted-foreground" aria-live="polite">
        {statusText}
      </p>
      <p className="mt-1 text-center text-xs text-muted-foreground" data-model-status aria-live="polite">
        {modelStatus}
      </p>
      <p className="text-center text-xs text-muted-foreground" data-voice-status>
        {voiceStatus}
      </p>
      <div className="mt-3 flex flex-col items-center">
        <button
          type="button"
          onClick={onMic}
          disabled={microphoneDisabled(status)}
          aria-pressed={listening}
          aria-label={listening ? "Stop and send what I said" : "Speak"}
          className="relative grid size-24 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_16px_40px_-18px] shadow-primary outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-50"
        >
          {listening ? <span className="listening-ring pointer-events-none absolute inset-0 rounded-full border border-primary" /> : null}
          {listening ? <StopIcon /> : <MicIcon />}
        </button>
      </div>
      <form
        className="mt-4 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <Input
          value={draft}
          onValueChange={onDraft}
          maxLength={2000}
          autoComplete="off"
          placeholder={language.ui.typePlaceholder}
          aria-label={language.ui.typePlaceholder}
          className="h-12 rounded-full px-4 text-base md:text-base"
          disabled={typingClosed}
        />
        <Button
          type="submit"
          variant="secondary"
          className="h-12 rounded-full px-4"
          disabled={typingClosed || !draft.trim()}
        >
          {language.ui.send}
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="ghost" className="h-9 rounded-full px-3" onClick={onSkip} disabled={typingClosed}>
          {language.ui.skip}
        </Button>
        <Button type="button" variant="ghost" className="h-9 rounded-full px-3" onClick={onFinish} disabled={typingClosed}>
          {language.ui.finish}
        </Button>
        {showHearAgain ? (
          <Button type="button" variant="ghost" className="h-9 rounded-full px-3" onClick={onHearAgain} disabled={typingClosed}>
            {language.ui.hearAgain}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-10" aria-hidden="true">
      <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" d="M7 11a5 5 0 0 0 10 0M12 16.5V20" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-8" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
    </svg>
  );
}
