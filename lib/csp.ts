import { MODEL_ORIGINS } from "./model-source";

/**
 * connect-src is this origin plus the public model-file hosts.
 * `wasm-unsafe-eval` lets the on-device runtime compile WebAssembly.
 * It does not allow eval of JavaScript. `unsafe-inline` remains because
 * the Next.js runtime still emits inline bootstrap scripts.
 */
export function contentSecurityPolicy(isDev: boolean): string {
  const connect = ["'self'", ...MODEL_ORIGINS, "https://*.aws.cdn.hf.co"].join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function securityHeaders(isDev: boolean): Array<{ key: string; value: string }> {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev) },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
  ];
}
