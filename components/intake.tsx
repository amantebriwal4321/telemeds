"use client";

import { useEffect, useRef, useState } from "react";

import { Composer } from "@/components/composer";
import { ProgressSteps } from "@/components/progress-steps";
import { SummaryCard } from "@/components/summary-card";
import { Transcript } from "@/components/transcript";
import { UrgentPanel } from "@/components/urgent-panel";
import { Welcome } from "@/components/welcome";
import { Button } from "@/components/ui/button";
import { audioUploadName } from "@/lib/audio";
import { language } from "@/lib/language";
import { limits } from "@/lib/limits";
import { formatSummary } from "@/lib/summary";
import type { CheckInSummary, CheckInTurn, Phase, Turn, UrgentKind } from "@/lib/types";

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

type Status = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

export function Intake() {
  const [started, setStarted] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [messages, setMessages] = useState<Turn[]>([]);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [summary, setSummary] = useState<CheckInSummary | null>(null);
  const [urgentKind, setUrgentKind] = useState<UrgentKind>("none");
  const [status, setStatus] = useState<Status>("idle");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hearAgain, setHearAgain] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const urlsRef = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<Phase | null>(null);
  const messagesRef = useRef<Turn[]>([]);
  const wipeRef = useRef<() => void>(() => {});
  const releaseRef = useRef<() => void>(() => {});
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, summary, error, status, started]);

  useEffect(() => {
    const onHide = () => wipeRef.current();
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) wipeRef.current();
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
      generation.current += 1;
      abortRef.current?.abort();
      releaseRef.current();
    };
  }, []);

  function releaseMedia() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current = [];
  }

  function wipe() {
    generation.current += 1;
    abortRef.current?.abort();
    releaseMedia();
    setStarted(false);
    setMessages([]);
    setPhase(null);
    setSummary(null);
    setUrgentKind("none");
    setStatus("idle");
    setDraft("");
    setError(null);
    setCopied(false);
    setHearAgain(null);
    setCleared(true);
  }

  useEffect(() => {
    phaseRef.current = phase;
    messagesRef.current = messages;
    wipeRef.current = wipe;
    releaseRef.current = releaseMedia;
  });

  function unlockAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = SILENT_WAV;
    audio.muted = true;
    const pending = audio.play();
    if (pending) {
      pending
        .then(() => {
          audio.pause();
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    }
  }

  function beginRequest() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  }

  async function readError(response: Response): Promise<string> {
    try {
      const data = (await response.json()) as { error?: unknown };
      if (typeof data.error === "string" && data.error) return data.error;
    } catch {
      /* The body was not JSON. Fall through to the calm generic line. */
    }
    return language.ui.errors.generic;
  }

  async function speak(text: string, gen: number, signal: AbortSignal) {
    setStatus("speaking");
    setHearAgain(text);
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal,
      });
      if (gen !== generation.current) return;
      if (!response.ok) {
        setError(await readError(response));
        setStatus("idle");
        return;
      }
      const blob = await response.blob();
      if (gen !== generation.current) return;
      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);
      const audio = audioRef.current;
      if (!audio) {
        setStatus("idle");
        return;
      }
      audio.muted = false;
      audio.src = url;
      await audio.play();
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        audio.addEventListener("ended", done, { once: true });
        audio.addEventListener("error", done, { once: true });
        signal.addEventListener("abort", done, { once: true });
      });
      if (gen === generation.current) setStatus("idle");
    } catch (err) {
      if (gen !== generation.current || (err instanceof DOMException && err.name === "AbortError")) return;
      setError(language.ui.errors.tapToHear);
      setStatus("idle");
    }
  }

  async function ask(nextMessages: Turn[], intent: "start" | "continue") {
    const gen = generation.current;
    const controller = beginRequest();
    setStatus("thinking");
    setError(null);
    setCopied(false);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          messages: nextMessages,
          phase: phaseRef.current,
        }),
        signal: controller.signal,
      });
      if (gen !== generation.current) return;
      if (!response.ok) {
        setError(await readError(response));
        setStatus("idle");
        return;
      }
      const data = (await response.json()) as { turn?: CheckInTurn };
      const turn = data.turn;
      if (!turn?.reply) {
        setError(language.ui.errors.generic);
        setStatus("idle");
        return;
      }
      if (gen !== generation.current) return;
      setMessages(
        intent === "start" ? [{ role: "assistant", content: turn.reply }] : [...nextMessages, { role: "assistant", content: turn.reply }],
      );
      setPhase(turn.phase);
      setSummary(turn.summary);
      setUrgentKind(turn.urgent ? turn.urgentKind : "none");
      await speak(turn.reply, gen, controller.signal);
    } catch (err) {
      if (gen !== generation.current || (err instanceof DOMException && err.name === "AbortError")) return;
      setError(language.ui.errors.generic);
      setStatus("idle");
    }
  }

  function begin() {
    unlockAudio();
    setStarted(true);
    setCleared(false);
    void ask([], "start");
  }

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || status === "listening" || status === "transcribing" || status === "thinking") return;
    unlockAudio();
    audioRef.current?.pause();
    setDraft("");
    const next = [...messages, { role: "user" as const, content: trimmed.slice(0, limits.textMessage) }];
    setMessages(next);
    void ask(next, "continue");
  }

  async function stopAndTranscribe() {
    const gen = generation.current;
    const mime = recorderRef.current?.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];
    if (gen !== generation.current) return;
    if (blob.size < 800) {
      setError(language.ui.errors.tooQuiet);
      setStatus("idle");
      return;
    }
    if (blob.size > limits.audioBytes) {
      setError(language.ui.errors.tooLong);
      setStatus("idle");
      return;
    }
    const named = audioUploadName(blob.type);
    if (!named) {
      setError(language.ui.errors.generic);
      setStatus("idle");
      return;
    }
    setStatus("transcribing");
    setError(null);
    const controller = beginRequest();
    const file = new File([blob], named.filename, { type: named.mime });
    const form = new FormData();
    form.append("audio", file);
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        cache: "no-store",
        body: form,
        signal: controller.signal,
      });
      if (gen !== generation.current) return;
      if (!response.ok) {
        setError(await readError(response));
        setStatus("idle");
        return;
      }
      const data = (await response.json()) as { text?: unknown };
      if (typeof data.text !== "string" || !data.text.trim()) {
        setError(language.ui.errors.emptyAudio);
        setStatus("idle");
        return;
      }
      const next = [...messagesRef.current, { role: "user" as const, content: data.text.trim() }];
      if (gen !== generation.current) return;
      setMessages(next);
      await ask(next, "continue");
    } catch (err) {
      if (gen !== generation.current || (err instanceof DOMException && err.name === "AbortError")) return;
      setError(language.ui.errors.generic);
      setStatus("idle");
    }
  }

  async function toggleMic() {
    if (status === "transcribing" || status === "thinking") return;
    if (status === "listening") {
      recorderRef.current?.stop();
      return;
    }
    unlockAudio();
    audioRef.current?.pause();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(language.ui.errors.micMissing);
      return;
    }
    try {
      const genAtAsk = generation.current;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (genAtAsk !== generation.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const options = preferredRecorderOptions();
      const recorder = new MediaRecorder(stream, options);
      const gen = generation.current;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        stream.getTracks().forEach((track) => track.stop());
        if (streamRef.current === stream) streamRef.current = null;
        recorderRef.current = null;
        if (gen !== generation.current) return;
        void stopAndTranscribe();
      };
      recorderRef.current = recorder;
      recorder.start();
      setStatus("listening");
      setError(null);
      timerRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, limits.recordMs);
    } catch {
      setError(language.ui.errors.micDenied);
      setStatus("idle");
    }
  }

  async function copySummary() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(formatSummary(summary));
      setCopied(true);
    } catch {
      setCopied(false);
      setError(language.ui.errors.generic);
    }
  }

  const blocked = status === "transcribing" || status === "thinking";
  const statusText =
    error ??
    (summary && status === "idle"
      ? language.ui.status.summary
      : language.ui.status[status]);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col">
      <header className="flex items-center justify-between gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div>
          <p className="font-heading text-3xl leading-none text-primary">{language.ui.product}</p>
          <p className="mt-1 text-xs text-muted-foreground">Private check-in · nothing is saved</p>
        </div>
        <Button type="button" variant="destructive" className="h-10 rounded-full px-4" onClick={wipe}>
          {language.ui.erase}
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-6">
        {started ? (
          <div className="flex flex-col gap-6">
            <ProgressSteps phase={phase} />
            {urgentKind !== "none" ? <UrgentPanel kind={urgentKind} /> : null}
            {messages.length > 0 ? (
              <Transcript messages={messages} />
            ) : error ? null : (
              <p className="text-muted-foreground">{language.ui.preparing}</p>
            )}
            {summary ? <SummaryCard summary={summary} copied={copied} onCopy={() => void copySummary()} /> : null}
            {!messages.length && error ? (
              <Button type="button" variant="outline" className="h-10 self-start rounded-full px-4" onClick={begin}>
                {language.ui.tryAgain}
              </Button>
            ) : null}
            <div ref={endRef} />
          </div>
        ) : (
          <Welcome cleared={cleared} onBegin={begin} />
        )}
      </main>

      {started ? (
        <Composer
          status={status}
          draft={draft}
          blocked={blocked}
          showHearAgain={Boolean(hearAgain)}
          statusText={statusText}
          onDraft={setDraft}
          onMic={() => void toggleMic()}
          onSend={() => submitText(draft)}
          onSkip={() => submitText(language.ui.skipUtterance)}
          onFinish={() => submitText(language.ui.finishUtterance)}
          onHearAgain={() => {
            if (!hearAgain) return;
            unlockAudio();
            const controller = beginRequest();
            void speak(hearAgain, generation.current, controller.signal);
          }}
        />
      ) : (
        <p className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs leading-5 text-muted-foreground">
          {language.ui.footer}
        </p>
      )}
      <audio ref={audioRef} playsInline preload="auto" className="hidden" />
    </div>
  );
}

function preferredRecorderOptions(): MediaRecorderOptions | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type));
  return mimeType ? { mimeType } : undefined;
}
