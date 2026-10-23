import { language } from "./language";

export type VoiceChoice = {
  name: string;
  localService: boolean;
};

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

function utterance(text: string, voice: SpeechSynthesisVoice): SpeechSynthesisUtterance {
  const spoken = new SpeechSynthesisUtterance(text.slice(0, 1_200));
  spoken.voice = voice;
  spoken.rate = language.tts.rate;
  spoken.pitch = language.tts.pitch;
  spoken.lang = language.locale;
  spoken.volume = 1;
  return spoken;
}

export function speakAloud(text: string, signal: AbortSignal): Promise<"spoken" | "silent"> {
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve("silent");
  const synth = window.speechSynthesis;
  const finish = (result: "spoken" | "silent", resolve: (value: "spoken" | "silent") => void) => {
    if (signal.aborted) {
      synth.cancel();
      resolve("silent");
      return;
    }
    resolve(result);
  };

  const speakWith = (voice: SpeechSynthesisVoice, resolve: (value: "spoken" | "silent") => void) => {
    if (signal.aborted) {
      resolve("silent");
      return;
    }
    const line = utterance(text, voice);
    const done = () => finish("spoken", resolve);
    line.addEventListener("end", done, { once: true });
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
    const settle = (result: "spoken" | "silent") => {
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
