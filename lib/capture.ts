import { downsample, mixToMono } from "./pcm";

/** Decode a recording in this tab. The samples are not uploaded. */
export async function blobToMono16k(blob: Blob): Promise<Float32Array> {
  if (typeof AudioContext === "undefined") {
    throw new Error("audio");
  }
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const channels: Float32Array[] = [];
    for (let index = 0; index < decoded.numberOfChannels; index += 1) {
      channels.push(decoded.getChannelData(index));
    }
    return downsample(mixToMono(channels), decoded.sampleRate, 16_000);
  } finally {
    await context.close();
  }
}
