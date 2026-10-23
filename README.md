# Aram

Aram is a private voice check-in for Afghan women. A woman taps a microphone or types, and a gentle voice named Noor asks one question at a time, offers a simple comfort or basic first aid, and leaves a short summary she can show a clinician.

This is a Health-a-thon 2026 prototype. It is not a medical device, it does not diagnose, and it does not replace a midwife, a clinic, or emergency care.

English is the only language wired up today. Pashto and Dari stay behind the language profile until women clinicians have heard them.

Speech, the reply, and the voice all run in the browser on her device. The only network reads are public model files, the same files for every person. Her words and her voice are not in those downloads, and they are not sent to a server.

## Run it locally

You need Node.js 22 or newer. No API key.

```bash
npm install
npm run dev
```

`npm install` copies the on-device WebAssembly runtime into `public/onnx/`. Those files come from the installed `@huggingface/transformers` package. They are not her data, and they are not committed.

The npm scripts set `NEXT_TELEMETRY_DISABLED=1`. Do not enable Vercel Web Analytics, Speed Insights, or any other tracking.

Open the URL Next prints (usually `http://localhost:3000`). Use localhost or HTTPS. Browsers will not share the microphone on a plain `http://` address that is not localhost.

The microphone is the main path. Typing works the whole time, including when a microphone is blocked, and including while the language model is still downloading.

```bash
npm test
npm run lint
npm run build
```

`npm run check:browser` loads a production server in headless Chrome and fails if a canary phrase leaves the device. It expects the server at `http://127.0.0.1:3456/` (`ARAM_URL` overrides that). It does not claim a microphone or a GPU was used.

## Deploy

The app is a static Next.js App Router page. There is no model API key and no route that receives her audio or her text.

1. Import the repository. Framework preset: Next.js. No extra build settings.
2. Do not add an analytics or tracking integration.
3. Deploy over HTTPS so the HSTS header takes effect.

The first visit in a browser still downloads the public model files from Hugging Face unless you self-host them (below). That download is the weights, not a request that contains her story.

## How a check-in works

1. She taps **Begin**. The greeting is a fixed line, spoken at once: “Assalaam-o-alaikum. I am Noor…” Then one question: how she is feeling. The language-model weights and Noor's voice start downloading in the background. The screen says whether each one is not downloaded, downloading (with a percentage, or megabytes when the file server omits a length), ready, or failed.
2. She speaks or types. The microphone button stays on while those files download. A tap asks for permission. If she says no, the screen says permission was denied and she can type. Audio is decoded in the tab. Nothing is uploaded. If the speech model is still arriving, the screen says “Speech model: downloading” with progress, then transcribes on the device.
3. The dialogue in `lib/dialogue.ts` answers immediately with the next scripted line. It does not wait for the language model. If that model is already on the device, it may replace the scripted “Thank you for telling me” with its own short thank-you, and only if that comes back within 3 seconds and passes the safety filter. Otherwise the scripted line stands, with no error. Questions, home comforts, first aid, the clinician line, and the closing are written in the app.
4. Speech prefers Kokoro (`onnx-community/Kokoro-82M-v1.0-ONNX`, 8-bit, voice `af_heart`, a soft female English voice) once those public files are on the device. Until then, or if Kokoro fails, Noor uses an offline `speechSynthesis` voice already on the device. If there is no offline voice either, the words stay on the screen. A network voice is never used.
5. She can copy a summary for a clinician. Copying uses the clipboard, which this app does not clear. **Erase everything** drops the conversation from the tab.

Noor leads, one question at a time: how she is, what is troubling her in her own words, a simple comfort, and basic first aid if hands can help. She does not take a physician’s history. She does not probe pregnancy, menstrual health, sexual life, family honour, or an examination.

First aid, when she describes bleeding, choking, not breathing, collapse, or injury, follows a plain-language XABCDE order: eXsanguinating hemorrhage (press a clean cloth and keep holding), airway, breathing, circulation, disability, exposure. The spoken script and the summary name that order. Emergencies also get a gentle line: “Please seek a clinician when you can.”

She never diagnoses and never names a medicine or a dose. If the words suggest she may hurt herself, the questions stop and a fixed, non-graphic message asks her to reach a person now, including **102** (ambulance) and **410** (Awaaz, a free helpline with Dari and Pashto speakers, 7:00 to 19:00). Coverage of 102 varies. This screen cannot send help, and nobody is watching it.

The last words of a closing are “Khuda hafiz.”

## What runs on the device

| Piece | Choice | Why |
| --- | --- | --- |
| Runtime | `@huggingface/transformers` in the browser, WebAssembly, `dtype: q8` | One stack for speech and text. WebGPU is not on every phone, and a failed WebGPU load can pull a much larger fp32 file. WebLLM was set aside because it has no reliable CPU fallback. |
| Speech to text | `onnx-community/whisper-tiny` (multilingual) | About 40 MB of quantized weights. Loaded only if she uses the microphone. The language code stays in `lib/language.ts`, so Pashto or Dari can be pointed at later. English-only Whisper was not used, because that would block those languages. |
| Language model | `onnx-community/SmolLM2-135M-Instruct-ONNX` | About 140 MB quantized. Larger instruct models that were measured (Qwen 0.5B and similar) were several hundred megabytes. 135M is weak. It is not asked to practice medicine. |
| Voice | Kokoro 82M, voice `af_heart`, WebAssembly, about 90 MB, lazy | A small neural female voice, the same files for every person. Playback uses the Web Audio API. If it is not ready, an offline `speechSynthesis` voice is used, then text only. Remote voices are not used. |
| Weights | Hugging Face, then the browser Cache API (`transformers-cache`, and Kokoro's voice cache) | GET of public files only. The service worker used to hold the response until the whole file was cached, which hid progress and froze the check-in. It now returns the bytes immediately and does not intercept model hosts. |

The WebAssembly files (`ort-wasm-simd-threaded.jsep.wasm`, about 21 MB, and its loader) are served by this app from `/onnx/`. `wasm-unsafe-eval` in the content security policy lets the browser compile that WebAssembly. It does not allow JavaScript `eval`.

Threads stay at 1 and the ONNX proxy is off, so the page does not need cross-origin isolation.

### Self-hosting the weights

To stop the browser talking to Hugging Face at all:

1. Put the model repositories under `public/models/`, keeping the repo id as the path. The files the runtime asks for include `config.json`, tokenizer files, and the `*_quantized.onnx` weights for `onnx-community/SmolLM2-135M-Instruct-ONNX`, `onnx-community/Kokoro-82M-v1.0-ONNX` (and its `voices/af_heart.bin`), and, if you want the microphone, `onnx-community/whisper-tiny`.
2. In `lib/model-source.ts`, set `preferLocalFiles` to `true`.
3. Remove the Hugging Face origins from `MODEL_ORIGINS` and from the host list in `public/sw.js`. The content security policy is built from `MODEL_ORIGINS`.

`localModelPath` is `/models/`. With `preferLocalFiles`, remote model loads are turned off.

## Privacy

The conversation is the memory of the tab. When she leaves, or taps **Erase everything**, that memory is cleared. The cached model files stay, because they are not her story.

- No login, no database, no analytics, no cookies set by this app.
- The conversation is not written to `localStorage`, `sessionStorage`, or IndexedDB. Closing the tab drops it. If the browser restores a frozen page, the page clears itself.
- **Erase everything** also stops the microphone and stops playback.
- A **Privacy** panel on the screen lists what stays on the device and what does not happen.
- Security headers on every response: Content-Security-Policy, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a microphone-only Permissions-Policy, and HSTS. `connect-src` is `'self'` plus the public model-file hosts (and `https://*.aws.cdn.hf.co`, because Hugging Face redirects weight downloads to that CDN). Production also sends `upgrade-insecure-requests`.
- `font-src` and `script-src` do not name a third party. The page uses system fonts. There is no analytics script.
- A fetch guard in the page allows GET and HEAD only, with no body, and only to this origin or a model-file host. After she types or is transcribed, that phrase cannot appear in a later URL. `sendBeacon` is turned off. In production, `WebSocket` and `EventSource` are turned off. The guard is not installed in a way that would break the dev server’s refresh socket.
- Text is capped at 2,000 characters. A reply is capped at 1,200. Speech playback is capped at 900. Recording stops after 45 seconds. Audio over 3.5 MB is refused in the tab.

Two ways her words can leave the app, both started by her: **Copy for a doctor** writes the summary to the clipboard, and the `tel:` links place a call if she taps them.

## What was verified

On 23 October 2026, against `next start` (the same static build Vercel serves), in headless Chrome:

- `npm test` (41 tests), `npm run lint`, and `npm run build` passed. There is no `/api` route.
- The Privacy panel was visible. **Begin** opened with “Assalaam-o-alaikum”. The **Speak** button was enabled immediately, while the language model was still downloading.
- A full check-in was typed. “I have a headache” was answered at once with the next question (“What is troubling you most…”). “It started this morning” was answered with a home comfort. **End and summarize** closed with “Khuda hafiz” and a clinician summary. The screen did not stay on “Noor is thinking”.
- The status line showed the language model and the voice downloading (megabytes, because the file server omitted Content-Length) and, on this fast link, reaching **ready**.
- Chrome’s network log did not contain those sentences. The only page-associated reads off the device were GETs for public SmolLM2 and Kokoro files on `huggingface.co` and `us.aws.cdn.hf.co`.

Not verified here: a real microphone or a permission prompt on a phone, hearing Kokoro or any speaker (headless Chrome blocked `AudioContext` because the test’s click is not a user gesture; a real tap on **Begin** or **Send** resumes it), a GPU, WebGPU, a completed Whisper transcription, and a woman’s review of the voice. The headless browser also contacts Google hosts of its own for component updates. Those requests were not the app and did not contain her words.

## Known limits

- A 135M model gives weaker, slower answers than a large hosted model. The check-in does not wait for it. Expect the scripted sentences. A thank-you from the model is optional, and only after the weights are already on the device.
- The first visit may download about 140 MB for that optional model, about 90 MB for Kokoro, about 40 MB more if she uses the microphone, and about 21 MB of WebAssembly from this app. The conversation proceeds during the download. The status line shows the progress.
- Offline use starts after those files have been cached once. Erase does not delete them.
- Kokoro’s `af_heart` voice is the one Noor prefers. It was not listened to in this environment. Until it has downloaded, speech falls back to whatever offline voice the phone has, which varies, and then to text. Some phones have no offline voice at all.
- `unsafe-inline` remains in `script-src` because the Next.js runtime still emits an inline bootstrap. See the threat model.
- This is not a medical device. The first-aid script is a short reminder, not training.

## Threat model

**Network egress.** Her words could leave in a fetch body, a URL, a beacon, or a socket. Mitigations: no server route accepts them; the content security policy names only this origin and the model-file hosts; the page fetch guard refuses bodies, non-GET/HEAD, other hosts, and noted phrases; production disables `sendBeacon`, `WebSocket`, and `EventSource`. `npm test` covers the guard. `npm run check:browser` fails if a canary shows up in Chrome’s netlog. A worker that called `fetch` on its own would still be limited by the content security policy. The guard does not see a request that replaced `fetch` before the page installed it.

**Cross-site scripting.** An injected script could read the conversation from memory and try to send it. Mitigations: no third-party scripts or fonts; `object-src 'none'`; frames denied; referrer stripped. The remaining hole is `unsafe-inline`, which Next still needs for its bootstrap. The connect-src list and the fetch guard are the backstop if a script does run. They are not a substitute for keeping dependencies small.

**Supply chain.** A poisoned npm package, a swapped WebAssembly file, or a swapped weight file could change what the page does or what it says. Mitigations: the WebAssembly files are copied from the installed package at `npm install` and served by this origin, not from a public script CDN. Weights come from Hugging Face unless you self-host them and then delete those hosts from the policy. Lock the lockfile, read dependency updates, and prefer the self-hosted layout for a clinic build. There is no signature check of the weight bytes in this prototype.

**Prompt injection.** She, or someone coaching her, could tell the model to ignore its instructions, diagnose, or reveal hidden text. Mitigations: the model is not in charge. Phase, remedies, first aid, and the crisis stop are code. The model is asked only for a thank-you, and that sentence is kept only when it is short, contains “thank you”, and does not look like an instruction, a diagnosis, a dose, or a crisis script.

**A long game against the supply chain.** A later “helpful” dependency, a font, an analytics snippet, a model-host change, or a build plugin could reopen a path for her words. Mitigations that exist today: the privacy test walks the app source and fails on storage APIs, analytics, the removed API routes, and a remote model client; the content security policy is unit-tested; the browser check uses a fresh profile so a cached model cannot hide a new upload. Someone still has to treat a new host, a new script, or a new model URL as a review item, not a drive-by change. Self-hosting the weights and dropping the remote origins shrinks that list to this origin.

## Language layer

`lib/language.ts` is the switch. It holds the speech model, the language model, the on-device voice settings, the words on the screen, the home-comfort sentences, and the fixed urgent lines.

`lib/prompt.ts` is the written behaviour for the active language: greeting, closing, XABCDE, no diagnosis, no prying history, one question at a time. The running check-in follows that spec in `lib/dialogue.ts`. The small model does not receive the whole spec, because a model this size will recite it.

Today the export is English, left to right, speech language `en`.

## Pashto roadmap

Do not flip the language by translating the prompt alone. Pashto (and Dari) should ship only after women clinicians have heard it.

1. Add a second `LanguageProfile` in `lib/language.ts` and export it as `language`. Set `locale` to `ps`, `direction` to `rtl`, and `stt.language` to `ps`. The document direction is already applied on `<html>`.
2. Dari is a separate profile. Whisper-style language codes usually use `fa` for Persian, which does not distinguish Afghan Dari from Iranian Persian. A linguist should decide the code, not a default mapping.
3. Translate `ui`, `remedies`, and `safety` in the profile, including the fixed self-harm message. Do not machine-translate the crisis line and ship it unheard.
4. Add a Pashto (and Dari) behaviour spec in `lib/prompt.ts`, and mirror it in the dialogue strings. Keep one question at a time. Keep the model on a short thank-you, or skip it, until a reviewed model exists.
5. Replace the English lists in `lib/safety.ts`. The keyword backup will not see Pashto or Dari crisis language. That is a blocker, not a follow-up.
6. Voice is the hard part. The app will only speak with an offline voice already on the device. Many devices have no Pashto voice. Do not add a network voice to fill the gap. Ship text until women have approved an offline female voice for tone and privacy.
7. Self-host an Arabic-script font if the system font is not enough. Serve it from this app. Do not call a font service.
8. Re-check 102 and 410, and any other number, with a local clinician before they are spoken aloud.
9. Do not store a language preference on the device. Choosing Pashto should be a build-time or in-memory choice.

## Project map

```
app/page.tsx            the screen
components/intake.tsx   the check-in, in the tab
lib/language.ts         the language switch
lib/prompt.ts           the behaviour spec
lib/dialogue.ts         questions, comforts, first aid, closing
lib/on-device.ts        in-browser speech-to-text and the small model
lib/speech.ts           offline voice only
lib/egress.ts           block anything but a model-file download
lib/csp.ts              content security policy
lib/model-source.ts     where public weights may come from
public/sw.js            cache the app shell and the public weights
scripts/check-browser.mjs   headless check that her words do not leave
```
