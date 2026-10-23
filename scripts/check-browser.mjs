/**
 * Headless check: the page loads, the privacy panel is visible, and no request
 * carries a canary phrase off the device. Requires the production server and
 * system Chrome. Does not claim a microphone or a GPU was exercised.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const pageUrl = process.env.ARAM_URL ?? "http://127.0.0.1:3456/";
const canary = "aram-canary-i-feel-very-unwell-today";
const chromePath = process.env.CHROME_PATH ?? "google-chrome";
const debugPort = 9223;

const { spawn } = await import("node:child_process");

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=/tmp/aram-chrome-profile-${Date.now()}`,
    "--ignore-certificate-errors",
    "--log-net-log=/tmp/aram-netlog.json",
    "--net-log-capture-mode=IncludeSensitive",
    "about:blank",
  ],
  { stdio: "ignore" },
);

function die(message) {
  chrome.kill("SIGTERM");
  console.error(message);
  process.exit(1);
}

async function debuggerUrl() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) {
        const body = await response.json();
        return body.webSocketDebuggerUrl;
      }
    } catch {
      /* Chrome is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  die("Chrome did not open a debugging port.");
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.next = 1;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.next++;
    const message = sessionId ? { id, sessionId, method, params } : { id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(message));
    });
  }

  on(listener) {
    this.listeners.push(listener);
  }
}

const versionSocket = await debuggerUrl();
const versionWs = new WebSocket(versionSocket);
await new Promise((resolve, reject) => {
  versionWs.addEventListener("open", resolve);
  versionWs.addEventListener("error", reject);
});
const browser = new Cdp(versionWs);
const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json().then((list) =>
  list.find((target) => target.id === targetId),
);
const pageWs = new WebSocket(webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  pageWs.addEventListener("open", resolve);
  pageWs.addEventListener("error", reject);
});
const page = new Cdp(pageWs);
const requests = [];
const seen = new Set();
const consoleMessages = [];

function recordRequest(message) {
  if (message.method !== "Network.requestWillBeSent") return;
  const request = message.params.request;
  const key = `${message.sessionId ?? "page"}:${message.params.requestId}:${request.method}:${request.url}`;
  if (seen.has(key)) return;
  seen.add(key);
  requests.push({
    url: request.url,
    method: request.method,
    postData: request.postData ?? "",
  });
}

browser.on((message) => {
  recordRequest(message);
  if (message.method === "Target.attachedToTarget") {
    browser.send("Network.enable", {}, message.params.sessionId).catch(() => {});
  }
});
await browser.send("Target.setAutoAttach", {
  autoAttach: true,
  waitForDebuggerOnStart: false,
  flatten: true,
});

page.on((message) => {
  recordRequest(message);
  if (message.method === "Runtime.consoleAPICalled") {
    const text = (message.params.args ?? []).map((arg) => arg.value ?? arg.description ?? "").join(" ");
    consoleMessages.push(text);
  }
  if (message.method === "Log.entryAdded") {
    consoleMessages.push(message.params.entry.text ?? "");
  }
});
await page.send("Network.enable");
await page.send("Page.enable");
await page.send("Runtime.enable");
await page.send("Log.enable");
await page.send("Page.navigate", { url: pageUrl });
for (let attempt = 0; attempt < 30; attempt += 1) {
  const text = await evaluate(`document.body ? document.body.innerText : ""`);
  if (text.includes("Privacy")) break;
  await new Promise((resolve) => setTimeout(resolve, 200));
}

async function evaluate(expression) {
  const result = await page.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    die(`Page script failed: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result.value;
}

const welcome = await evaluate(`document.body.innerText`);
if (!welcome.includes("Privacy")) die("Privacy panel was not visible.");
if (!welcome.includes("nothing is sent away") && !welcome.includes("not sent to a server")) {
  die("Privacy copy was missing.");
}
if (!welcome.includes("public model files")) die("The page did not say that only public model files are downloaded.");

mkdirSync("/opt/cursor/artifacts", { recursive: true });
const shot = await page.send("Page.captureScreenshot", { format: "png" });
writeFileSync("/opt/cursor/artifacts/aram_welcome_privacy.png", Buffer.from(shot.data, "base64"));

const began = await evaluate(`(() => {
  const button = [...document.querySelectorAll("button")].find((item) => item.textContent.includes("Begin"));
  if (!button) return "missing";
  button.click();
  return "clicked";
})()`);
if (began !== "clicked") die(`Could not begin the check-in (${began}).`);
await new Promise((resolve) => setTimeout(resolve, 600));
const afterBegin = await evaluate(`document.body.innerText`);
if (!afterBegin.includes("Assalaam-o-alaikum")) die("Noor did not open with Assalaam-o-alaikum.");

const typed = await evaluate(`(() => {
  const input = document.querySelector("input");
  if (!input) return "missing";
  input.focus();
  const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
  proto.set.call(input, ${JSON.stringify(canary)});
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return input.value;
})()`);
if (typed !== canary) die(`The text field was not available (${typed}).`);
const sent = await evaluate(`(() => {
  const button = [...document.querySelectorAll("button")].find((item) => item.textContent.trim() === "Send");
  if (!button) return "missing";
  if (button.disabled) return "disabled";
  button.click();
  return "sent";
})()`);
await new Promise((resolve) => setTimeout(resolve, Number(process.env.ARAM_AFTER_MS ?? "4000")));
const afterSend = await evaluate(`document.body.innerText`);
const shot2 = await page.send("Page.captureScreenshot", { format: "png" });
writeFileSync("/opt/cursor/artifacts/aram_check_in_downloading.png", Buffer.from(shot2.data, "base64"));

const headerResponse = await fetch(pageUrl, { headers: { accept: "text/html" } });
const csp = headerResponse.headers.get("content-security-policy") ?? "";
const connect = csp.split(";").map((part) => part.trim()).find((part) => part.startsWith("connect-src"));
if (!connect) die("The response had no connect-src.");
const sources = connect.replace("connect-src", "").trim().split(/\s+/);
const pageOrigin = new URL(pageUrl).origin;

function allowed(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  if (url.origin === pageOrigin) return true;
  for (const source of sources) {
    if (source === "'self'" || source === "'none'") continue;
    if (source.includes("*")) {
      const host = source.replace(/^https?:\/\//, "");
      if (host.startsWith("*.") && url.protocol === "https:" && url.hostname.endsWith(host.slice(1))) return true;
      continue;
    }
    if (url.origin === source) return true;
  }
  return false;
}

versionWs.close();
pageWs.close();
chrome.kill("SIGTERM");
await new Promise((resolve) => {
  chrome.once("exit", resolve);
  setTimeout(resolve, 4000);
});

const netlog = JSON.parse(readFileSync("/tmp/aram-netlog.json", "utf8"));
const pageHost = new URL(pageUrl).host;
for (const event of netlog.events ?? []) {
  const params = event.params ?? {};
  const url = typeof params.url === "string" ? params.url : "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) continue;
  const method = typeof params.method === "string" ? params.method : "GET";
  const postData = typeof params.post_data === "string" ? params.post_data : "";
  const associated = JSON.stringify({
    initiator: params.initiator ?? "",
    isolation: params.network_isolation_key ?? params.site_for_cookies ?? "",
  });
  const key = `net:${method}:${url}:${postData.slice(0, 80)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  requests.push({ url, method, postData, associated });
}

function pageAssociated(request) {
  if (request.associated?.includes(pageHost)) return true;
  try {
    return new URL(request.url).origin === pageOrigin;
  } catch {
    return false;
  }
}

const problems = [];
for (const request of requests) {
  const blob = `${request.method} ${request.url} ${request.postData} ${request.associated ?? ""}`;
  if (blob.toLowerCase().includes(canary.toLowerCase())) {
    problems.push(`canary left the device: ${request.method} ${request.url.split("?")[0]}`);
  }
  if (!pageAssociated(request)) continue;
  let origin = "";
  try {
    origin = new URL(request.url).origin;
  } catch {
    problems.push(`unreadable url: ${request.method}`);
    continue;
  }
  if (request.postData) problems.push(`request had a body: ${request.method} ${origin}`);
  if (request.method !== "GET" && request.method !== "HEAD") {
    problems.push(`non-read request: ${request.method} ${origin}`);
  }
  if (!allowed(request.url)) problems.push(`outside connect-src: ${request.method} ${origin}`);
}

const report = {
  began,
  typed,
  sent,
  sawGreeting: afterBegin.includes("Assalaam-o-alaikum"),
  sawCanaryOnScreen: afterSend.includes(canary),
  turnAdvanced: /Thank you for telling me\. What is troubling you most/.test(afterSend),
  requestCount: requests.length,
  hosts: [...new Set(requests.map((request) => { try { return new URL(request.url).host; } catch { return request.url; } }))],
  offDeviceReads: [
    ...new Set(
      requests.flatMap((request) => {
        if (!pageAssociated(request)) return [];
        try {
          const url = new URL(request.url);
          if (url.origin === pageOrigin) return [];
          return [`${request.method} ${url.origin}${url.pathname}`];
        } catch {
          return [];
        }
      }),
    ),
  ],
  problems,
  consoleTail: consoleMessages.slice(-12),
};
console.log(JSON.stringify(report, null, 2));
if (problems.length) die(`Egress check failed:\n${problems.join("\n")}`);
if (!afterSend.includes("Assalaam-o-alaikum")) die("The greeting disappeared.");
