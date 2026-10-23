const SHELL = "aram-shell-v1";
const MODELS = "aram-models-v1";

const MODEL_HOSTS = new Set([
  "huggingface.co",
  "cdn-lfs.huggingface.co",
  "cas-bridge.xethub.hf.co",
  "us.aws.cdn.hf.co",
  "eu.aws.cdn.hf.co",
]);

function isModelHost(hostname) {
  const host = hostname.toLowerCase();
  if (MODEL_HOSTS.has(host)) return true;
  return host.endsWith(".aws.cdn.hf.co");
}

function cacheable(response) {
  return response && response.ok && (response.type === "basic" || response.type === "cors");
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (cacheable(response) && !request.headers.has("range")) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (cacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" && request.method !== "HEAD") return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (isModelHost(url.hostname)) {
    event.respondWith(cacheFirst(MODELS, request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/onnx/")) {
    event.respondWith(cacheFirst(SHELL, request));
    return;
  }
  if (request.mode === "navigate" || url.pathname === "/" || url.pathname.startsWith("/_next/")) {
    event.respondWith(networkFirst(SHELL, request));
  }
});
