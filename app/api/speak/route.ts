import OpenAI from "openai";

import { noStoreJson, rateLimited, readLimitedJson } from "@/lib/http";
import { language } from "@/lib/language";
import { limits } from "@/lib/limits";
import { getOpenAI, logUpstreamStatus, publicAiError } from "@/lib/openai";

export const maxDuration = 60;

export async function POST(request: Request) {
  const limited = rateLimited(request, "speak");
  if (limited) return limited;

  const body = await readLimitedJson(request);
  if (!body.ok) return body.response;
  if (!body.value || typeof body.value !== "object") {
    return noStoreJson({ error: language.ui.errors.generic }, 400);
  }
  const text = (body.value as { text?: unknown }).text;
  if (typeof text !== "string" || !text.trim()) {
    return noStoreJson({ error: language.ui.errors.generic }, 400);
  }
  if (text.length > limits.textMessage) {
    return noStoreJson({ error: language.ui.errors.tooLong }, 413);
  }

  const client = getOpenAI();
  if (!client) return noStoreJson({ error: language.ui.errors.missingKey }, 503);

  const spoken = text.replace(/\s+/g, " ").trim().slice(0, limits.ttsChars);

  try {
    const audio = await synthesize(client, spoken);
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": 'inline; filename="voice.mp3"',
      },
    });
  } catch (error) {
    logUpstreamStatus(error);
    const mapped = publicAiError(error);
    return noStoreJson({ error: mapped.message }, mapped.status);
  }
}

async function synthesize(client: OpenAI, input: string): Promise<ArrayBuffer> {
  try {
    const speech = await client.audio.speech.create({
      model: language.tts.model,
      voice: language.tts.voice,
      input,
      instructions: language.tts.instructions,
      speed: language.tts.speed,
      response_format: "mp3",
    });
    return speech.arrayBuffer();
  } catch (error) {
    if (error instanceof OpenAI.APIError && error.status === 400) {
      const speech = await client.audio.speech.create({
        model: "tts-1",
        voice: language.tts.voice,
        input,
        response_format: "mp3",
      });
      return speech.arrayBuffer();
    }
    throw error;
  }
}
