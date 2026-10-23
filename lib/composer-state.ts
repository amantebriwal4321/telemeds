export type ComposerStatus = "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "preparing";

/** The microphone stays tappable while models download or Noor speaks. It rests only while a recording is being written out. */
export function microphoneDisabled(status: ComposerStatus): boolean {
  return status === "transcribing";
}

/** Typing stays available except while a recording is in progress. The language model never closes the field. */
export function inputDisabled(status: ComposerStatus): boolean {
  return status === "listening" || status === "transcribing";
}
