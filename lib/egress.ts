import { isModelHost } from "./model-source";

export type EgressCode = "method" | "origin" | "body" | "sensitive" | "protocol";

export class EgressError extends Error {
  code: EgressCode;

  constructor(code: EgressCode) {
    super("Blocked a request that could leave this device.");
    this.name = "EgressError";
    this.code = code;
  }
}

const sensitive: string[] = [];

type GuardedGlobal = typeof globalThis & {
  __aramGuarded?: boolean;
  __aramNativeFetch?: typeof fetch;
};

function guardedGlobal(): GuardedGlobal {
  return globalThis as GuardedGlobal;
}

/** Remember a phrase she typed or we transcribed, so a later request cannot carry it. */
export function noteSensitive(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length < 8) return;
  if (!sensitive.includes(cleaned)) sensitive.push(cleaned);
  if (sensitive.length > 40) sensitive.shift();
}

export function clearSensitive() {
  sensitive.length = 0;
}

export function sensitivePhrases(): readonly string[] {
  return sensitive;
}

function leaks(value: string): boolean {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  const haystack = decoded.toLowerCase();
  return sensitive.some((phrase) => phrase.length >= 8 && haystack.includes(phrase.toLowerCase()));
}

function pageBase(): string {
  if (typeof location !== "undefined" && location.href) return location.href;
  return "http://localhost/";
}

function resolveUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) return input;
  if (typeof Request !== "undefined" && input instanceof Request) return new URL(input.url);
  return new URL(String(input), pageBase());
}

function isSelf(url: URL): boolean {
  return url.origin === new URL(pageBase()).origin;
}

async function bodyText(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
  const body = init?.body;
  if (typeof body === "string") return body;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return body.toString();
  if (body) return "[body]";
  if (typeof Request !== "undefined" && input instanceof Request && input.body) {
    return input.clone().text();
  }
  return "";
}

/**
 * Fail closed. Model downloads are GET or HEAD, with no body, to the public
 * model hosts or to this origin. Anything else can carry her words off the device.
 */
export async function assertEgressAllowed(input: RequestInfo | URL, init?: RequestInit): Promise<void> {
  const request = typeof Request !== "undefined" && input instanceof Request ? input : null;
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") throw new EgressError("method");

  let url: URL;
  try {
    url = resolveUrl(input);
  } catch {
    throw new EgressError("origin");
  }
  if (url.username || url.password) throw new EgressError("origin");
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new EgressError("protocol");

  const allowed = isSelf(url) || (url.protocol === "https:" && isModelHost(url.hostname));
  if (!allowed) throw new EgressError("origin");

  const payload = await bodyText(input, init);
  if (payload) throw new EgressError("body");
  if (leaks(url.href)) throw new EgressError("sensitive");
}

function neutralizeBeacon() {
  const nav = globalThis.navigator;
  if (!nav || typeof nav.sendBeacon !== "function") return;
  nav.sendBeacon = () => false;
}

function neutralizeSockets() {
  if (process.env.NODE_ENV !== "production") return;
  const root = globalThis as unknown as { WebSocket: unknown; EventSource: unknown };
  class BlockedSocket {
    constructor() {
      throw new EgressError("protocol");
    }
  }
  root.WebSocket = BlockedSocket;
  root.EventSource = BlockedSocket;
}

export function installEgressGuard(): void {
  const root = guardedGlobal();
  neutralizeBeacon();
  neutralizeSockets();
  if (root.__aramGuarded || typeof root.fetch !== "function") {
    root.__aramGuarded = true;
    return;
  }
  const native = root.fetch.bind(root);
  root.__aramNativeFetch = native;
  root.__aramGuarded = true;
  root.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    await assertEgressAllowed(input, init);
    return native(input, init);
  };
}

export function uninstallEgressGuard(): void {
  const root = guardedGlobal();
  if (root.__aramNativeFetch) root.fetch = root.__aramNativeFetch;
  root.__aramGuarded = false;
  root.__aramNativeFetch = undefined;
}
