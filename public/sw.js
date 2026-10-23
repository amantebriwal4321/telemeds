const SHELL = "aram-shell-v2";

function cacheable(response) {
  return response && response.ok && (response.type === "basic" || response.type === "cors");
}

/**
 * Return the network response immediately. Waiting for cache.put kept the
 * page from seeing a single byte until the whole file was stored, so a large
 * model download looked frozen: no progress, and the check-in waited forever.
 */
async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (cacheable(response) && !request.headers.has("range")) {
    void cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function networkFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (cacheable(response)) void cache.put(request, response.clone()).catch(() => {});
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
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key === "aram-shell-v1").map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
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
  // Model files are cached by the on-device runtime as it reads them.
  // Intercepting them here hid download progress and could stall the response.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/onnx/")) {
    event.respondWith(cacheFirst(SHELL, request));
    return;
  }
  if (request.mode === "navigate" || url.pathname === "/" || url.pathname.startsWith("/_next/")) {
    event.respondWith(networkFirst(SHELL, request));
  }
});
