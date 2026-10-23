import { language } from "./language";
import { preloadVoice, speakNeural, voiceIsReady } from "./neural-voice";

export type VoiceChoice = {
  name: string;
  localService: boolean;
};

export type SpeakResult = "neural" | "device" | "silent";

let audioContext: AudioContext | null = null;

export function chooseVoice(voices: VoiceChoice[]): VoiceChoice | null {
  const pool = language.tts.preferLocal ? voices.filter((voice) => voice.localService) : voices;
  if (!pool.length) return null;
  const hinted = pool.find((voice) =>
    language.tts.femaleNameHints.some((hint) => voice.name.toLowerCase().includes(hint.toLowerCase())),
  );
  return hinted ?? pool[0];
}

export function voiceIsFeminine(voice: VoiceChoice): boolean {
  return language.tts.femaleNameHints.some((hint) => voice.name.toLowerCase().includes(hint.toLowerCase()));
}

/** Call from a tap so later playback is allowed. The context is created in the gesture. */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    if (!audioContext) audioContext = new Ctx();
    void audioContext.resume();
  } catch {
    audioContext = null;
  }
}

export function startVoiceDownload(): Promise<boolean> {
  return preloadVoice();
}

function utterance(text: string, voice: SpeechSynthesisVoice): SpeechSynthesisUtterance {
  const spoken = new SpeechSynthesisUtterance(text.slice(0, 1_200));
  spoken.voice = voice;
  spoken.rate = language.tts.rate;
  spoken.pitch = language.tts.pitch;
  spoken.lang = language.locale;
  spoken.volume = 1;
  return spoken;
}

function speakWithDevice(text: string, signal: AbortSignal): Promise<SpeakResult> {
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve("silent");
  const synth = window.speechSynthesis;
  const finish = (result: SpeakResult, resolve: (value: SpeakResult) => void) => {
    if (signal.aborted) {
      synth.cancel();
      resolve("silent");
      return;
    }
    resolve(result);
  };

  const speakWith = (voice: SpeechSynthesisVoice, resolve: (value: SpeakResult) => void) => {
    if (signal.aborted) {
      resolve("silent");
      return;
    }
    const line = utterance(text, voice);
    line.addEventListener("end", () => finish("device", resolve), { once: true });
    line.addEventListener("error", () => finish("silent", resolve), { once: true });
    signal.addEventListener(
      "abort",
      () => {
        synth.cancel();
        resolve("silent");
      },
      { once: true },
    );
    synth.cancel();
    synth.speak(line);
  };

  return new Promise((resolve) => {
    const existing = synth.getVoices();
    const picked = chooseVoice(existing);
    if (picked) {
      const match = existing.find((voice) => voice.name === picked.name && voice.localService === picked.localService);
      if (match) {
        speakWith(match, resolve);
        return;
      }
    }
    if (existing.length) {
      resolve("silent");
      return;
    }
    let settled = false;
    const settle = (result: SpeakResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const onVoices = () => {
      const voices = synth.getVoices();
      const choice = chooseVoice(voices);
      const match = choice
        ? voices.find((voice) => voice.name === choice.name && voice.localService === choice.localService)
        : undefined;
      if (!match) {
        settle("silent");
        return;
      }
      speakWith(match, settle);
    };
    synth.addEventListener("voiceschanged", onVoices, { once: true });
    window.setTimeout(() => settle("silent"), 700);
  });
}

/**
 * Prefer the on-device Kokoro voice when it is already loaded.
 * Otherwise use an offline speechSynthesis voice, then text only.
 * A download in progress does not hold the sentence.
 */
export async function speakAloud(text: string, signal: AbortSignal): Promise<SpeakResult> {
  if (voiceIsReady() && audioContext) {
    const inner = new AbortController();
    const onAbort = () => inner.abort();
    signal.addEventListener("abort", onAbort);
    const timer = window.setTimeout(() => inner.abort(), 20_000);
    try {
      const spoken = await speakNeural(text, inner.signal, audioContext);
      if (spoken && !signal.aborted) return "neural";
    } finally {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    }
  }
  if (signal.aborted) return "silent";
  return speakWithDevice(text, signal);
}
