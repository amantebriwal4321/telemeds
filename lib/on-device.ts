import { acknowledgementInstruction } from "./dialogue";
import { installEgressGuard } from "./egress";
import { language } from "./language";
import { modelSource } from "./model-source";

/** The full system prompt in lib/prompt.ts is the behaviour spec. This short line is all the small model sees. */
function thanksPrompt(): string {
  return [
    "You are Noor, a gentle, respectful voice on this device. You are not a doctor.",
    "Reply with one short sentence that says thank you.",
    "Do not ask a question, give advice, name a medicine, or repeat what she said.",
  ].join(" ");
}

export type ModelProgress = {
  label: string;
};

type GenerateFn = (
  messages: Array<{ role: string; content: string }>,
  options: { max_new_tokens: number; do_sample: boolean },
) => Promise<unknown>;

type TranscribeFn = (
  audio: Float32Array,
  options: { language: string; task: "transcribe" | "translate"; return_timestamps: false },
) => Promise<unknown>;

export type OnDeviceEngine = {
  generate: (latestUser: string) => Promise<string | null>;
  transcribe: (audio: Float32Array) => Promise<string>;
};

type ProgressEvent = {
  status?: string;
  file?: string;
  name?: string;
  progress?: number;
};

let configured: Promise<void> | null = null;
let languageModel: Promise<GenerateFn | null> | null = null;
let listeningModel: Promise<TranscribeFn | null> | null = null;

function fileLabel(file: string | undefined, fallback: string): string {
  if (!file) return fallback;
  const clean = file.split("?")[0] ?? file;
  const base = clean.split("/").pop();
  return base || fallback;
}

function report(kind: string, event: ProgressEvent, onProgress?: (progress: ModelProgress) => void) {
  if (!onProgress) return;
  if (event.status === "progress" && typeof event.progress === "number") {
    const name = fileLabel(event.file ?? event.name, kind);
    onProgress({ label: `${kind}: ${name} ${Math.round(event.progress)}%` });
    return;
  }
  if (event.status === "done" || event.status === "ready") {
    onProgress({ label: `${kind} is on this device` });
  }
}

function extractGenerated(output: unknown): string | null {
  const row = Array.isArray(output) ? output[0] : output;
  if (!row || typeof row !== "object") return null;
  const generated = (row as { generated_text?: unknown }).generated_text;
  if (typeof generated === "string") return generated;
  if (Array.isArray(generated)) {
    const last = generated[generated.length - 1] as { content?: unknown } | undefined;
    if (typeof last?.content === "string") return last.content;
  }
  return null;
}

function extractTranscript(output: unknown): string {
  const row = Array.isArray(output) ? output[0] : output;
  if (!row || typeof row !== "object") return "";
  const text = (row as { text?: unknown }).text;
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
}

async function configure() {
  installEgressGuard();
  const { env } = await import("@huggingface/transformers");
  const onnx = env.backends.onnx as {
    wasm?: { wasmPaths?: string; numThreads?: number; proxy?: boolean };
  };
  if (onnx.wasm) {
    onnx.wasm.wasmPaths = "/onnx/";
    onnx.wasm.numThreads = 1;
    onnx.wasm.proxy = false;
  }
  env.allowRemoteModels = !modelSource.preferLocalFiles;
  env.allowLocalModels = modelSource.preferLocalFiles;
  env.localModelPath = modelSource.localPath;
  env.remoteHost = modelSource.remoteHost;
  env.useBrowserCache = true;
  env.useFS = false;
  env.useFSCache = false;
}

function ensureConfigured(): Promise<void> {
  if (!configured) {
    configured = configure().catch((error: unknown) => {
      configured = null;
      throw error;
    });
  }
  return configured;
}

function ensureLanguageModel(onProgress?: (progress: ModelProgress) => void): Promise<GenerateFn | null> {
  if (!languageModel) {
    languageModel = ensureConfigured()
      .then(async () => {
        const transformers = await import("@huggingface/transformers");
        const create = transformers.pipeline as unknown as (
          task: string,
          model: string,
          options: Record<string, unknown>,
        ) => Promise<GenerateFn>;
        return create("text-generation", language.llm.model, {
          dtype: language.llm.dtype,
          device: language.llm.device,
          progress_callback: (event: ProgressEvent) => report("Language model", event, onProgress),
        });
      })
      .catch((error: unknown) => {
        languageModel = null;
        throw error;
      });
  }
  return languageModel;
}

function ensureListeningModel(onProgress?: (progress: ModelProgress) => void): Promise<TranscribeFn | null> {
  if (!listeningModel) {
    listeningModel = ensureConfigured()
      .then(async () => {
        const transformers = await import("@huggingface/transformers");
        const create = transformers.pipeline as unknown as (
          task: string,
          model: string,
          options: Record<string, unknown>,
        ) => Promise<TranscribeFn>;
        return create("automatic-speech-recognition", language.stt.model, {
          dtype: language.stt.dtype,
          device: language.stt.device,
          progress_callback: (event: ProgressEvent) => report("Listening model", event, onProgress),
        });
      })
      .catch((error: unknown) => {
        listeningModel = null;
        throw error;
      });
  }
  return listeningModel;
}

export function preloadLanguageModel(onProgress?: (progress: ModelProgress) => void): Promise<boolean> {
  return ensureLanguageModel(onProgress).then(
    (model) => Boolean(model),
    () => false,
  );
}

export function prepareEngine(onProgress?: (progress: ModelProgress) => void): Promise<OnDeviceEngine> {
  const generateModel = ensureLanguageModel(onProgress);
  return Promise.resolve({
    async generate(latestUser: string) {
      const generate = await generateModel.catch(() => null);
      if (!generate) return null;
      try {
        const output = await generate(
          [
            { role: "system", content: thanksPrompt() },
            { role: "user", content: acknowledgementInstruction(latestUser) },
          ],
          { max_new_tokens: language.llm.maxNewTokens, do_sample: false },
        );
        return extractGenerated(output);
      } catch {
        return null;
      }
    },
    async transcribe(audio: Float32Array) {
      const transcribe = await ensureListeningModel(onProgress).catch(() => null);
      if (!transcribe) throw new Error("speech");
      const output = await transcribe(audio, {
        language: language.stt.language,
        task: language.stt.task,
        return_timestamps: false,
      });
      return extractTranscript(output);
    },
  });
}
