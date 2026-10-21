export const limits = {
  audioBytes: 3_500_000,
  textMessage: 2_000,
  historyTurns: 24,
  historyChars: 16_000,
  jsonBodyChars: 48_000,
  ttsChars: 900,
  replyChars: 1_200,
  summaryFieldChars: 500,
  clinicianChars: 900,
  recordMs: 45_000,
  rate: {
    transcribe: { limit: 8, windowMs: 10 * 60 * 1000 },
    chat: { limit: 20, windowMs: 10 * 60 * 1000 },
    speak: { limit: 20, windowMs: 10 * 60 * 1000 },
  },
} as const;

export type RateBucket = keyof typeof limits.rate;
