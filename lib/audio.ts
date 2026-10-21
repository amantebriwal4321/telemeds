const TYPES: Record<string, { filename: string; mime: string }> = {
  "audio/webm": { filename: "speech.webm", mime: "audio/webm" },
  "video/webm": { filename: "speech.webm", mime: "audio/webm" },
  "audio/mp4": { filename: "speech.m4a", mime: "audio/mp4" },
  "audio/m4a": { filename: "speech.m4a", mime: "audio/mp4" },
  "audio/x-m4a": { filename: "speech.m4a", mime: "audio/mp4" },
  "video/mp4": { filename: "speech.m4a", mime: "audio/mp4" },
  "audio/mpeg": { filename: "speech.mp3", mime: "audio/mpeg" },
  "audio/mp3": { filename: "speech.mp3", mime: "audio/mpeg" },
  "audio/wav": { filename: "speech.wav", mime: "audio/wav" },
  "audio/x-wav": { filename: "speech.wav", mime: "audio/wav" },
  "audio/wave": { filename: "speech.wav", mime: "audio/wav" },
  "audio/ogg": { filename: "speech.ogg", mime: "audio/ogg" },
};

export function audioUploadName(type: string): { filename: string; mime: string } | null {
  const base = type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!base) return TYPES["audio/webm"];
  return TYPES[base] ?? null;
}
