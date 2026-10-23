"use client";

import { useEffect, useRef, useState } from "react";

import { Composer } from "@/components/composer";
import { PrivacyPanel } from "@/components/privacy-panel";
import { ProgressSteps } from "@/components/progress-steps";
import { SummaryCard } from "@/components/summary-card";
import { Transcript } from "@/components/transcript";
import { UrgentPanel } from "@/components/urgent-panel";
import { Welcome } from "@/components/welcome";
import { Button } from "@/components/ui/button";
import { blobToMono16k } from "@/lib/capture";
import { emptyNotes, openingTurn, planReply, withModelThanks, type Notes } from "@/lib/dialogue";
import { clearSensitive, installEgressGuard, noteSensitive } from "@/lib/egress";
import { language } from "@/lib/language";
import { limits } from "@/lib/limits";
import { subscribeVoice } from "@/lib/neural-voice";
import { preloadLanguageModel, prepareEngine } from "@/lib/on-device";
import { mentionsMedicalRedFlag, mentionsSelfHarm, needsHandsOnFirstAid } from "@/lib/safety";
import { speakAloud, startVoiceDownload, unlockAudio } from "@/lib/speech";
import { formatSummary } from "@/lib/summary";
import { thanksWithin } from "@/lib/thanks";
import type { CheckInSummary, Phase, Turn, UrgentKind } from "@/lib/types";

type Status = "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "preparing";

export function Intake() {
  const [started, setStarted] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [messages, setMessages] = useState<Turn[]>([]);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [notes, setNotes] = useState<Notes>(emptyNotes());
  const [summary, setSummary] = useState<CheckInSummary | null>(null);
  const [urgentKind, setUrgentKind] = useState<UrgentKind>("none");
  const [status, setStatus] = useState<Status>("idle");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hearAgain, setHearAgain] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [modelStatus, setModelStatus] = useState(language.ui.modelIdle);
  const [voiceStatus, setVoiceStatus] = useState(language.ui.voiceIdle);
  const [speechStatus, setSpeechStatus] = useState(language.ui.speechIdle);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<Phase | null>(null);
  const notesRef = useRef<Notes>(emptyNotes());
  const messagesRef = useRef<Turn[]>([]);
  const wipeRef = useRef<() => void>(() => {});
  const releaseRef = useRef<() => void>(() => {});

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, summary, error, status, started]);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    return subscribeVoice((state) => {
      setVoiceStatus(state.phase === "ready" ? language.ui.voiceReady : state.label);
    });
  }, []);

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
    window.speechSynthesis?.cancel();
  }

  function wipe() {
    generation.current += 1;
    abortRef.current?.abort();
    releaseMedia();
    clearSensitive();
    setStarted(false);
    setMessages([]);
    setPhase(null);
    setNotes(emptyNotes());
    setSummary(null);
    setUrgentKind("none");
    setStatus("idle");
    setDraft("");
    setError(null);
    setCopied(false);
    setHearAgain(null);
    setShowPrivacy(false);
    setCleared(true);
  }

  useEffect(() => {
    phaseRef.current = phase;
    notesRef.current = notes;
    messagesRef.current = messages;
    wipeRef.current = wipe;
    releaseRef.current = releaseMedia;
  });

  function beginSpeech() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  }

  async function speak(text: string, gen: number) {
    const controller = beginSpeech();
    setStatus("speaking");
    setHearAgain(text);
    const result = await speakAloud(text, controller.signal);
    if (gen !== generation.current || abortRef.current !== controller) return;
    if (result === "device") setVoiceStatus(language.ui.voiceDevice);
    if (result === "silent") setError(language.ui.errors.voiceUnavailable);
    else setError((current) => (current === language.ui.errors.voiceUnavailable ? null : current));
    setStatus("idle");
  }

  function applyPlan(text: string, modelAcknowledgement: string | null, modelAttempted: boolean, gen: number) {
    const planned = planReply({
      phase: phaseRef.current ?? "wellbeing",
      latestUser: text,
      notes: notesRef.current,
      modelAcknowledgement,
      modelAttempted,
    });
    if (gen !== generation.current) return;
    const nextMessages = [...messagesRef.current, { role: "assistant" as const, content: planned.turn.reply }];
    messagesRef.current = nextMessages;
    notesRef.current = planned.notes;
    phaseRef.current = planned.turn.phase;
    setMessages(nextMessages);
    setNotes(planned.notes);
    setPhase(planned.turn.phase);
    setSummary(planned.turn.summary);
    setUrgentKind(planned.turn.urgent ? planned.turn.urgentKind : "none");
    void speak(planned.turn.reply, gen);
  }

  function patchThanks(modelText: string, gen: number) {
    if (gen !== generation.current) return;
    const current = messagesRef.current;
    const index = current.length - 1;
    const last = current[index];
    if (!last || last.role !== "assistant") return;
    const nextReply = withModelThanks(last.content, modelText);
    if (nextReply === last.content) return;
    const next = current.slice();
    next[index] = { role: "assistant", content: nextReply };
    messagesRef.current = next;
    setMessages(next);
  }

  async function respond(text: string) {
    const gen = generation.current;
    const latest = text.trim().slice(0, limits.textMessage);
    noteSensitive(latest);
    const immediate =
      mentionsSelfHarm(latest) ||
      needsHandsOnFirstAid(latest) ||
      mentionsMedicalRedFlag(latest) ||
      latest === language.ui.skipUtterance ||
      latest === language.ui.finishUtterance;
    setCopied(false);
    applyPlan(latest, null, false, gen);
    if (immediate) return;
    const modelText = await thanksWithin(
      prepareEngine((update) => {
        if (gen === generation.current) setModelStatus(update.label);
      }).then((engine) => engine.generate(latest)),
    );
    if (!modelText) return;
    patchThanks(modelText, gen);
  }

  function begin() {
    unlockAudio();
    installEgressGuard();
    const turn = openingTurn();
    const gen = generation.current;
    const opening = [{ role: "assistant" as const, content: turn.reply }];
    messagesRef.current = opening;
    phaseRef.current = turn.phase;
    notesRef.current = emptyNotes();
    setStarted(true);
    setCleared(false);
    setMessages(opening);
    setPhase(turn.phase);
    setNotes(emptyNotes());
    setSummary(null);
    setUrgentKind("none");
    setError(null);
    void speak(turn.reply, gen);
    void preloadLanguageModel((update) => {
      if (generation.current === gen) setModelStatus(update.label);
    });
    void startVoiceDownload();
  }

  function submitText(text: string) {
    unlockAudio();
    const trimmed = text.trim();
    if (!trimmed || status === "listening" || status === "transcribing" || status === "thinking") return;
    setDraft("");
    const next = [...messagesRef.current, { role: "user" as const, content: trimmed.slice(0, limits.textMessage) }];
    setMessages(next);
    messagesRef.current = next;
    void respond(trimmed);
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
    setStatus("transcribing");
    setSpeechStatus("Speech model: downloading");
    setError(null);
    try {
      installEgressGuard();
      const samples = await blobToMono16k(blob);
      const engine = await prepareEngine((update) => {
        if (gen === generation.current && update.label.startsWith("Listening")) {
          setSpeechStatus(update.label.replace("Listening model", "Speech model"));
        }
      });
      if (gen !== generation.current) return;
      const text = await engine.transcribe(samples);
      if (gen !== generation.current) return;
      setSpeechStatus("Speech model: ready");
      if (!text) {
        setError(language.ui.errors.emptyAudio);
        setStatus("idle");
        return;
      }
      const next = [...messagesRef.current, { role: "user" as const, content: text.slice(0, limits.textMessage) }];
      setMessages(next);
      messagesRef.current = next;
      setStatus("idle");
      await respond(text);
    } catch {
      if (gen !== generation.current) return;
      setSpeechStatus("Speech model: failed");
      setError(language.ui.errors.speechFailed);
      setStatus("idle");
    }
  }

  async function toggleMic() {
    if (status === "transcribing") return;
    unlockAudio();
    if (status === "listening") {
      recorderRef.current?.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    if (!window.isSecureContext) {
      setError(language.ui.errors.micInsecure);
      return;
    }
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
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotFoundError" || name === "NotReadableError") setError(language.ui.errors.micMissing);
      else setError(language.ui.errors.micDenied);
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

  const baseStatus =
    error ??
    (status === "transcribing"
      ? speechStatus
      : summary && status === "idle"
        ? language.ui.status.summary
        : language.ui.status[status]);
  const statusText = baseStatus;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col">
      <header className="flex items-center justify-between gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div>
          <p className="font-heading text-3xl leading-none text-primary">{language.ui.product}</p>
          <p className="mt-1 text-xs text-muted-foreground">{language.ui.onDeviceLine}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full px-4"
            aria-expanded={showPrivacy}
            onClick={() => setShowPrivacy((open) => !open)}
          >
            {language.ui.privacyButton}
          </Button>
          <Button type="button" variant="destructive" className="h-10 rounded-full px-4" onClick={wipe}>
            {language.ui.erase}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-6">
        {showPrivacy && started ? (
          <div className="mb-6">
            <PrivacyPanel />
          </div>
        ) : null}
        {started ? (
          <div className="flex flex-col gap-6">
            <ProgressSteps phase={phase} notes={notes} />
            {urgentKind !== "none" ? <UrgentPanel kind={urgentKind} /> : null}
            {messages.length > 0 ? <Transcript messages={messages} /> : null}
            {summary ? <SummaryCard summary={summary} copied={copied} onCopy={() => void copySummary()} /> : null}
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
          showHearAgain={Boolean(hearAgain)}
          statusText={statusText}
          modelStatus={modelStatus}
          voiceStatus={voiceStatus}
          onDraft={setDraft}
          onMic={() => void toggleMic()}
          onSend={() => submitText(draft)}
          onSkip={() => submitText(language.ui.skipUtterance)}
          onFinish={() => submitText(language.ui.finishUtterance)}
          onHearAgain={() => {
            if (!hearAgain) return;
            unlockAudio();
            void speak(hearAgain, generation.current);
          }}
        />
      ) : (
        <p className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs leading-5 text-muted-foreground">
          {language.ui.footer}
        </p>
      )}
    </div>
  );
}

function preferredRecorderOptions(): MediaRecorderOptions | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type));
  return mimeType ? { mimeType } : undefined;
}
