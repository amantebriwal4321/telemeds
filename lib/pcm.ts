/** Mix recorder channels down to one stream the speech model can read. */
export function mixToMono(channels: Float32Array[]): Float32Array {
  const length = channels[0]?.length ?? 0;
  const mono = new Float32Array(length);
  if (!channels.length || length === 0) return mono;
  for (let i = 0; i < length; i += 1) {
    let sum = 0;
    for (const channel of channels) sum += channel[i] ?? 0;
    mono[i] = sum / channels.length;
  }
  return mono;
}

/** Linear resample. Whisper expects 16 kHz mono. */
export function downsample(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (inRate === outRate) return input.slice();
  if (inRate <= 0 || outRate <= 0 || input.length === 0) return new Float32Array();
  const ratio = inRate / outRate;
  const length = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const weight = position - left;
    output[i] = (input[left] ?? 0) * (1 - weight) + (input[right] ?? 0) * weight;
  }
  return output;
}
