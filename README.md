# Aram

Aram is a privacy-first voice check-in for Afghan women. A woman taps a microphone, speaks, and a gentle voice named Noor asks one question at a time about how she is, then gives her a short summary she can show a clinician.

This is a Health-a-thon 2026 prototype. It is not a medical device, it does not diagnose, and it does not replace a midwife, a clinic, or emergency care.

English is the only language wired up today. Pashto and Dari are a deliberate next step, described at the end of this file.

## Run it locally

You need Node.js 22 or newer.

```bash
npm install
cp .env.example .env.local
```

Put your OpenAI key in `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

Then:

```bash
npm run dev
```

The npm scripts set `NEXT_TELEMETRY_DISABLED=1` so the Next.js CLI does not send its own usage ping.

Open the URL Next prints (usually `http://localhost:3000`). Use localhost or HTTPS. Browsers will not share the microphone on a plain `http://` address that is not localhost.

The microphone is the main path. Typing works the whole time, including when a microphone is blocked.

```bash
npm test
npm run lint
npm run build
```

## Deploy on Vercel

The app is a standard Next.js App Router project.

1. Import the repository into Vercel. Framework preset: Next.js. No extra build settings.
2. Add `OPENAI_API_KEY` as an environment variable for Production and Preview. Do not prefix it with `NEXT_PUBLIC`.
3. Do not enable Vercel Web Analytics, Speed Insights, or any other tracking.
4. Deploy. Vercel serves HTTPS, so the HSTS header takes effect there.

Keep recordings short. Vercel rejects request bodies over 4.5 MB, and Aram refuses audio over 3.5 MB before that.

## How a check-in works

1. She taps **Begin**. The server asks the model for a greeting and the first question. Her browser then requests speech in the `shimmer` voice.
2. She taps the microphone and speaks, or she types. Audio is sent once to `/api/transcribe` (`gpt-4o-mini-transcribe`) and held only in memory for that request.
3. The transcript, plus the questions already on screen, goes to `/api/chat` (`gpt-4o-mini`). The model returns one spoken reply and, at the end, a summary.
4. `/api/speak` turns that reply into audio (`gpt-4o-mini-tts`, voice `shimmer`, with a soft-voice instruction). If that model rejects the instruction, the route tries `tts-1` with the same voice.
5. When the topics are covered, she gets a summary she can copy and show a doctor. Copying uses the clipboard. Aram does not keep a copy.

Noor leads, in this order: wellbeing, sleep, food and water, pain or symptoms, pregnancy, menstrual health, then red-flag symptoms (heavy bleeding, severe pain, fever, trouble breathing, thoughts of self-harm). She asks one question at a time. Pregnancy and menstrual health can be skipped.

She never diagnoses and never recommends a medicine. If a red flag comes up, she says to get in-person care the same day. If the words suggest she may hurt herself, the questionnaire stops and a fixed, non-graphic message asks her to reach a person now. The screen also shows **102** (ambulance) and **410** (Awaaz, a free helpline with Dari and Pashto speakers, 7:00 to 19:00). Coverage of 102 varies; if it does not connect, she is told to go to the nearest clinic with someone she trusts. This screen cannot send help, and nobody is watching it.

## Privacy

The aim is the same as a private browser window: when she leaves, nothing of the conversation remains.

- No login, no database, no analytics, no cookies set by this app.
- The conversation is React state in the tab. It is not written to `localStorage`, `sessionStorage`, or IndexedDB.
- **Erase everything** clears that state immediately, stops the microphone, and stops playback.
- Closing or discarding the tab drops the memory. If the browser freezes the page and restores it later, the page clears itself.
- API routes do not write audio or text to disk. The upload is a buffer for that one request, then it is discarded.
- API responses send `Cache-Control: no-store`. Chat completions are requested with `store: false`.
- Logs do not include her words or audio. A failed OpenAI call records only an HTTP status code.
- Security headers on every response: Content-Security-Policy, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a microphone-only Permissions-Policy, and HSTS. Production also sends `upgrade-insecure-requests`.
- Each route has a small per-IP limit (transcription is stricter than text). The counter lives in the memory of that server instance. On Vercel that is a brake, not a global quota, because a new instance starts with an empty counter. There is no Redis, on purpose.
- Text messages are capped at 2,000 characters. History is capped at 24 turns. Speech playback is capped at 900 characters. Recording stops after 45 seconds.

Honest limit: Aram does not store the conversation, but OpenAI processes the audio and the text in order to answer. Review OpenAI’s current API data controls before a clinic relies on this. Do not tell a woman that a third party never saw her words.

## Language layer

`lib/language.ts` is the switch. It holds:

- speech-to-text model, language code, and a short vocabulary hint
- the chat model
- text-to-speech model, voice, speed, and speaking instructions
- the words on the screen
- the fixed urgent-care lines

`lib/prompt.ts` holds the system prompt for the active language. The browser cannot replace that prompt. Voice and language are also chosen on the server, not by the request, so a client cannot swap in a different voice or a different instruction.

Today the export is English, left to right, `stt.language` `en`, voice `shimmer`.

## Pashto roadmap

Do not flip the language by translating the prompt alone. Pashto (and Dari) should ship only after women clinicians have heard it.

1. Add a second `LanguageProfile` in `lib/language.ts` and export it as `language`. Set `locale` to `ps`, `direction` to `rtl`, and `stt.language` to `ps`. The document direction is already applied on `<html>`.
2. Dari is a separate profile. Whisper-style language codes usually use `fa` for Persian, which does not distinguish Afghan Dari from Iranian Persian. A linguist should decide the code and the vocabulary hint, not a default mapping.
3. Translate `ui` and `safety` in the profile, including the fixed self-harm message. Do not machine-translate the crisis line and ship it unheard.
4. Add a Pashto (and Dari) system prompt in `lib/prompt.ts`, reviewed for polite, indirect, non-shaming wording around pregnancy and bleeding. Keep one question at a time.
5. Replace the English lists in `lib/safety.ts`. The keyword backup will not see Pashto or Dari crisis language. That is a blocker, not a follow-up.
6. Text-to-speech is the hard part. OpenAI’s built-in voices, including `shimmer` and `nova`, are not Pashto speakers. `gpt-4o-mini-tts` may attempt the words and still sound wrong, male, or childish. Keep the voice id in the profile, and do not launch until women have approved a specific female voice for tone and privacy (quiet, not theatrical). The `/api/speak` route already reads the voice from the profile.
7. Self-host an Arabic-script font. This app uses system fonts on purpose, so the page does not call a font service. A Pashto build needs a font that covers the script and is served by Aram itself.
8. Re-check 102 and 410, and any other number, with a local clinician before they are spoken aloud.
9. Do not store a language preference on the device. Choosing Pashto should be a build-time or in-memory choice, same as the rest of the privacy rules.

## Project map

```
app/page.tsx                 the screen
app/api/transcribe/route.ts  audio to text, memory only
app/api/chat/route.ts        one check-in turn
app/api/speak/route.ts       text to a female voice
lib/language.ts              the language switch
lib/prompt.ts                server-owned instructions
lib/safety.ts                red-flag and self-harm guard
lib/ratelimit.ts             per-IP memory limit
next.config.ts               CSP, HSTS, no-referrer, no powered-by
```

The screen is a client component because the microphone and the conversation cannot live on the server. Server routes are the only place that sees `OPENAI_API_KEY`.
