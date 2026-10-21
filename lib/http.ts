import "server-only";

import { limits, type RateBucket } from "./limits";
import { language } from "./language";
import { rateLimit, requestIp } from "./ratelimit";

export function noStoreJson(
  body: unknown,
  status = 200,
  extra?: Record<string, string>,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}

export function rateLimited(request: Request, bucket: RateBucket): Response | null {
  const rule = limits.rate[bucket];
  const result = rateLimit(`${bucket}:${requestIp(request)}`, rule.limit, rule.windowMs);
  if (result.ok) return null;
  return noStoreJson({ error: language.ui.errors.rateLimit }, 429, {
    "Retry-After": String(result.retryAfterSec),
  });
}

export async function readLimitedJson(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > limits.jsonBodyChars) {
    return {
      ok: false,
      response: noStoreJson(
        { error: "That message is too long. Please shorten it a little." },
        413,
      ),
    };
  }
  let text = "";
  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      response: noStoreJson({ error: language.ui.errors.generic }, 400),
    };
  }
  if (text.length > limits.jsonBodyChars) {
    return {
      ok: false,
      response: noStoreJson(
        { error: "That message is too long. Please shorten it a little." },
        413,
      ),
    };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false,
      response: noStoreJson({ error: "The conversation could not be read." }, 400),
    };
  }
}
