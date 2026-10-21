import OpenAI, { toFile } from "openai";

import { audioUploadName } from "@/lib/audio";
import { noStoreJson, rateLimited } from "@/lib/http";
import { language } from "@/lib/language";
import { limits } from "@/lib/limits";
import { getOpenAI, logUpstreamStatus, publicAiError } from "@/lib/openai";

export const maxDuration = 60;

export async function POST(request: Request) {
  const limited = rateLimited(request, "transcribe");
  if (limited) return limited;

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > limits.audioBytes) {
    return noStoreJson({ error: language.ui.errors.tooLong }, 413);
  }

  const client = getOpenAI();
  if (!client) return noStoreJson({ error: language.ui.errors.missingKey }, 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return noStoreJson({ error: language.ui.errors.generic }, 400);
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return noStoreJson({ error: language.ui.errors.emptyAudio }, 400);
  }
  if (audio.size > limits.audioBytes) {
    return noStoreJson({ error: language.ui.errors.tooLong }, 413);
  }

  const named = audioUploadName(audio.type);
  if (!named) {
    return noStoreJson({ error: language.ui.errors.generic }, 415);
  }

  try {
    const bytes = Buffer.from(await audio.arrayBuffer());
    const file = await toFile(bytes, named.filename, { type: named.mime });
    const result = await transcribe(client, file);
    const text = result.text.replace(/\s+/g, " ").trim().slice(0, limits.textMessage);
    if (!text) return noStoreJson({ error: language.ui.errors.emptyAudio }, 422);
    return noStoreJson({ text });
  } catch (error) {
    logUpstreamStatus(error);
    const mapped = publicAiError(error);
    return noStoreJson({ error: mapped.message }, mapped.status);
  }
}

async function transcribe(client: OpenAI, file: File) {
  try {
    return await client.audio.transcriptions.create({
      file,
      model: language.stt.model,
      language: language.stt.language,
      prompt: language.stt.prompt,
      response_format: "json",
    });
  } catch (error) {
    if (!(error instanceof OpenAI.APIError) || error.status !== 400) throw error;
    return client.audio.transcriptions.create({
      file,
      model: language.stt.model,
      language: language.stt.language,
      response_format: "json",
    });
  }
}
