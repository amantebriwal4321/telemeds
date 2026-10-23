import { language } from "./language";
import { loadStateFromEvent, type LoadState, type ProgressEvent } from "./model-progress";
import { configureRuntime } from "./on-device";

type Spoken = {
  audio: Float32Array;
  sampling_rate: number;
};

type KokoroVoice = {
  generate: (text: string, options: { voice: string; speed: number }) => Promise<Spoken>;
};

const listeners = new Set<(state: LoadState) => void>();
let loading: Promise<KokoroVoice | null> | null = null;
let readyVoice: KokoroVoice | null = null;

function emit(state: LoadState) {
  for (const listener of listeners) listener(state);
}

export function voiceIsReady(): boolean {
  return readyVoice !== null;
}

export function subscribeVoice(listener: (state: LoadState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function preloadVoice(): Promise<boolean> {
  return ensureVoice().then(
    (voice) => Boolean(voice),
    () => false,
  );
}

function ensureVoice(): Promise<KokoroVoice | null> {
  if (readyVoice) return Promise.resolve(readyVoice);
  if (!loading) {
    loading = configureRuntime()
      .then(async () => {
        emit({ phase: "downloading", label: "Voice: downloading" });
        const { KokoroTTS } = await import("kokoro-js");
        const tts = await KokoroTTS.from_pretrained(language.tts.model, {
          dtype: language.tts.dtype as "q8",
          device: "wasm",
          progress_callback: (event: ProgressEvent) => {
            const state = loadStateFromEvent("Voice", event);
            if (state) emit(state);
          },
        });
        readyVoice = tts as KokoroVoice;
        emit({ phase: "ready", label: "Voice: ready" });
        return readyVoice;
      })
      .catch(() => {
        loading = null;
        emit({ phase: "failed", label: "Voice: failed" });
        return null;
      });
  }
  return loading;
}

function sentences(text: string): string[] {
  const parts = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const part of parts.length ? parts : [text.trim()]) {
    if (`${current} ${part}`.trim().length > 280 && current) {
      chunks.push(current);
      current = part;
    } else {
      current = `${current} ${part}`.trim();
    }
  }
  if (current) chunks.push(current);
  return chunks.slice(0, 8);
}

function playSamples(context: AudioContext, samples: Float32Array, rate: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted || samples.length === 0) return Promise.resolve();
  const buffer = context.createBuffer(1, samples.length, rate);
  buffer.getChannelData(0).set(samples);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  return new Promise((resolve) => {
    const finish = () => resolve();
    source.onended = finish;
    signal.addEventListener(
      "abort",
      () => {
        try {
          source.stop();
        } catch {
          /* The buffer already ended. */
        }
        finish();
      },
      { once: true },
    );
    source.start();
  });
}

/** Speak with Kokoro if its public voice files are already on this device. Does not start a long wait. */
export async function speakNeural(text: string, signal: AbortSignal, context: AudioContext): Promise<boolean> {
  if (!readyVoice) return false;
  const voice = readyVoice;
  for (const line of sentences(text)) {
    if (signal.aborted) return false;
    try {
      const spoken = await voice.generate(line, { voice: language.tts.voice, speed: language.tts.speed });
      const samples = spoken.audio;
      const rate = spoken.sampling_rate;
      if (!(samples instanceof Float32Array) || typeof rate !== "number") return false;
      await playSamples(context, samples, rate, signal);
    } catch {
      return false;
    }
  }
  return !signal.aborted;
}
