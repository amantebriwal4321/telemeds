/**
 * Public model files only. These hosts serve weights that are the same for
 * every person. The app must never send her words or her voice to them.
 *
 * To self-host, copy the model folders into `public/models/` (see the README)
 * and set `preferLocalFiles` to true. You can then drop the remote origins
 * from this list so the page does not need those hosts at all.
 */
export const modelSource = {
  preferLocalFiles: false,
  remoteHost: "https://huggingface.co/",
  localPath: "/models/",
} as const;

/** Origins a browser may contact for those public files. No wildcards here. */
export const MODEL_ORIGINS = [
  "https://huggingface.co",
  "https://cdn-lfs.huggingface.co",
  "https://cas-bridge.xethub.hf.co",
  "https://us.aws.cdn.hf.co",
  "https://eu.aws.cdn.hf.co",
] as const;

/** Hugging Face's storage CDN uses regional hostnames such as `us.aws.cdn.hf.co`. */
export const MODEL_HOST_SUFFIXES = [".aws.cdn.hf.co"] as const;

export function isModelHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (MODEL_ORIGINS.some((origin) => new URL(origin).hostname === host)) return true;
  return MODEL_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
