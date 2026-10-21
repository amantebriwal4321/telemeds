import "server-only";

import type OpenAI from "openai";

import { language } from "./language";
import { getOpenAI, logUpstreamStatus, publicAiError } from "./openai";
import { crisisAddendum, startInstruction, systemPrompt } from "./prompt";
import {
  applyMedicalSafety,
  mentionsSelfHarm,
  selfHarmTurn,
  usableCrisisSummary,
} from "./safety";
import { parseTurn, turnResponseFormat } from "./turn";
import type { CheckInTurn, Phase, Turn } from "./types";

export class CheckInError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "CheckInError";
  }
}

export async function runCheckIn(input: {
  intent: "start" | "continue";
  messages: Turn[];
  fallbackPhase: Phase;
}): Promise<CheckInTurn> {
  const client = getOpenAI();
  if (!client) {
    throw new CheckInError(503, language.ui.errors.missingKey);
  }

  const latest =
    [...input.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const crisis = input.intent === "continue" && mentionsSelfHarm(latest);

  const modelMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: crisis ? `${systemPrompt()}\n\n${crisisAddendum()}` : systemPrompt(),
    },
  ];

  if (input.intent === "start") {
    modelMessages.push({ role: "user", content: startInstruction() });
  } else {
    for (const message of input.messages) {
      modelMessages.push({ role: message.role, content: message.content });
    }
  }

  let turn: CheckInTurn | null = null;
  try {
    turn = await complete(client, modelMessages);
  } catch (error) {
    logUpstreamStatus(error);
    const mapped = publicAiError(error);
    throw new CheckInError(mapped.status, mapped.message);
  }

  if (!turn) {
    return {
      reply: language.ui.errors.misheard,
      phase: input.fallbackPhase,
      urgent: false,
      urgentKind: "none",
      summary: null,
    };
  }

  if (crisis) {
    const fixed = selfHarmTurn();
    return {
      ...fixed,
      summary: usableCrisisSummary(turn.summary) ?? fixed.summary,
    };
  }

  return applyMedicalSafety(turn, latest);
}

async function complete(
  client: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<CheckInTurn | null> {
  const first = await once(client, messages);
  const parsed = parseTurn(first);
  if (parsed) return parsed;
  const second = await once(client, [
    ...messages,
    { role: "assistant", content: first.slice(0, 2_000) || "{}" },
    {
      role: "user",
      content:
        "That was not valid. Reply again with JSON only, in the required shape. The reply field is short spoken English, with no markdown.",
    },
  ]);
  return parseTurn(second);
}

async function once(
  client: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<string> {
  const completion = await client.chat.completions.create({
    model: language.llm.model,
    temperature: 0.4,
    max_completion_tokens: 900,
    store: false,
    response_format: turnResponseFormat,
    messages,
  });
  return completion.choices[0]?.message?.content ?? "";
}
