export type LoadPhase = "idle" | "downloading" | "ready" | "failed";

export type LoadState = {
  phase: LoadPhase;
  label: string;
};

export type ProgressEvent = {
  status?: string;
  file?: string;
  name?: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

function fileLabel(file: string | undefined, fallback: string): string {
  if (!file) return fallback;
  const clean = file.split("?")[0] ?? file;
  const base = clean.split("/").pop();
  return base || fallback;
}

function megabytes(bytes: number): string {
  const size = Math.max(1, Math.round(bytes / 1_000_000));
  return `${size} MB`;
}

/**
 * Hugging Face often omits Content-Length. The downloader then reports
 * progress 100 while `loaded` and `total` stay equal and keep growing.
 * That is not a finished file. Show the bytes instead of a stuck 100%.
 */
export function loadStateFromEvent(kind: string, event: ProgressEvent): LoadState | null {
  const file = fileLabel(event.file ?? event.name, kind);
  if (event.status === "initiate" || event.status === "download") {
    return { phase: "downloading", label: `${kind}: downloading ${file}` };
  }
  if (event.status === "progress") {
    const loaded = typeof event.loaded === "number" ? event.loaded : 0;
    const total = typeof event.total === "number" ? event.total : 0;
    const lengthUnknown = total <= 0 || (loaded > 0 && loaded >= total && event.progress === 100);
    if (lengthUnknown && loaded > 0) {
      return { phase: "downloading", label: `${kind}: downloading ${file} (${megabytes(loaded)})` };
    }
    if (typeof event.progress === "number") {
      return { phase: "downloading", label: `${kind}: downloading ${file} ${Math.round(event.progress)}%` };
    }
    return { phase: "downloading", label: `${kind}: downloading ${file}` };
  }
  if (event.status === "done") {
    return { phase: "downloading", label: `${kind}: ${file} is on this device` };
  }
  if (event.status === "ready") {
    return { phase: "ready", label: `${kind}: ready` };
  }
  if (event.status === "error") {
    return { phase: "failed", label: `${kind}: failed` };
  }
  return null;
}
