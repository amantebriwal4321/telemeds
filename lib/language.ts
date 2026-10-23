/**
 * Active language profile.
 *
 * English is the only profile wired up today. To bring in Pashto or Dari,
 * add another object that satisfies `LanguageProfile` and export it as
 * `language`. Speech model, right-to-left layout, a reviewed offline female
 * voice, the system prompt, and the safety phrases all have to move together.
 * Model ids point at public weight files. They are not a place to send her words.
 */
export type LanguageProfile = {
  id: string;
  locale: string;
  direction: "ltr" | "rtl";
  label: string;
  stt: {
    model: string;
    dtype: string;
    device: "wasm" | "webgpu";
    language: string;
    task: "transcribe" | "translate";
  };
  llm: {
    model: string;
    dtype: string;
    device: "wasm" | "webgpu";
    maxNewTokens: number;
  };
  tts: {
    engine: "kokoro";
    model: string;
    dtype: string;
    voice: string;
    speed: number;
    rate: number;
    pitch: number;
    preferLocal: boolean;
    femaleNameHints: string[];
  };
  remedies: {
    general: string;
    rest: string;
    head: string;
    throat: string;
    stomach: string;
    fever: string;
  };
  ui: {
    product: string;
    voiceName: string;
    notDiscussed: string;
    erase: string;
    begin: string;
    send: string;
    skip: string;
    skipUtterance: string;
    finish: string;
    finishUtterance: string;
    cleared: string;
    greeting: string;
    askWellbeing: string;
    askConcern: string;
    askMore: string;
    thanks: string;
    skipThanks: string;
    clinicianLine: string;
    closing: string;
    welcomeKicker: string;
    welcomeTitle: string;
    welcomeBody: string;
    welcomePoints: string[];
    topicsLabel: string;
    topics: string[];
    welcomeFoot: string;
    youLabel: string;
    summaryTitle: string;
    summaryNote: string;
    preparing: string;
    onDeviceLine: string;
    privacyTitle: string;
    privacyStoredTitle: string;
    privacyStored: string[];
    privacyNotTitle: string;
    privacyNot: string[];
    privacyButton: string;
    footer: string;
    copy: string;
    copied: string;
    hearAgain: string;
    tryAgain: string;
    typePlaceholder: string;
    steps: Array<{ id: string; label: string }>;
    status: {
      idle: string;
      listening: string;
      transcribing: string;
      thinking: string;
      speaking: string;
      preparing: string;
      summary: string;
    };
    modelIdle: string;
  modelReady: string;
  modelFailedStatus: string;
  voiceIdle: string;
  voiceReady: string;
  voiceFailed: string;
  voiceDevice: string;
  speechIdle: string;
  errors: {
    modelFailed: string;
    generic: string;
    emptyAudio: string;
    micDenied: string;
    micMissing: string;
    micInsecure: string;
    speechFailed: string;
    tooLong: string;
    tooQuiet: string;
    voiceUnavailable: string;
  };
  };
  safety: {
    selfHarmSpoken: string;
    selfHarmSummary: string;
    selfHarmClinician: string;
    medicalAdvice: string;
    medicalUrgentSummary: string;
    firstAidScript: string;
    firstAidSummary: string;
    urgentTitle: string;
    urgentSelfHarmBody: string;
    urgentMedicalBody: string;
    ambulanceLabel: string;
    ambulanceNumber: string;
    helplineLabel: string;
    helplineNumber: string;
    helplineNote: string;
  };
};

export const language: LanguageProfile = {
  id: "en",
  locale: "en",
  direction: "ltr",
  label: "English",
  stt: {
    model: "onnx-community/whisper-tiny",
    dtype: "q8",
    device: "wasm",
    language: "en",
    task: "transcribe",
  },
  llm: {
    model: "onnx-community/SmolLM2-135M-Instruct-ONNX",
    dtype: "q8",
    device: "wasm",
    maxNewTokens: 40,
  },
  tts: {
    engine: "kokoro",
    model: "onnx-community/Kokoro-82M-v1.0-ONNX",
    dtype: "q8",
    voice: "af_heart",
    speed: 0.92,
    rate: 0.9,
    pitch: 1.08,
    preferLocal: true,
    femaleNameHints: [
      "female",
      "woman",
      "samantha",
      "victoria",
      "zira",
      "susan",
      "karen",
      "moira",
      "fiona",
      "tessa",
      "serena",
      "kate",
      "linda",
    ],
  },
  remedies: {
    general: "A quiet rest, a warm cover, and small sips of clean water are a gentle comfort.",
    rest: "Rest in a quiet place, and take small sips of clean water if you can.",
    head: "Rest in a quiet, dim room, and take small sips of clean water. I cannot give a medicine for this.",
    throat:
      "A warm drink can soothe the throat. If you are an adult and honey suits you, a little honey in that drink is a simple comfort. I cannot give a medicine for this.",
    stomach:
      "Small sips of clean water, and rest, are a gentle comfort for an upset stomach. I cannot give a medicine for this.",
    fever: "Rest, small sips of water, and a light cover are a gentle comfort when the body feels hot.",
  },
  ui: {
    product: "Aram",
    voiceName: "Noor",
    notDiscussed: "Not discussed",
    erase: "Erase everything",
    begin: "Begin, when you are ready",
    send: "Send",
    skip: "Skip this",
    skipUtterance: "I would rather skip this.",
    finish: "End and summarize",
    finishUtterance: "I would like to stop and have the summary for a doctor.",
    cleared: "This tab is clear.",
    greeting:
      "Assalaam-o-alaikum. I am Noor, a voice in this private screen, not a person and not a doctor. You may skip anything.",
    askWellbeing: "If you are willing, how are you feeling today?",
    askConcern: "What is troubling you most, if you would like to say?",
    askMore: "Is there anything else you want me to hear?",
    thanks: "Thank you for telling me.",
    skipThanks: "Thank you. We can leave that.",
    clinicianLine: "Please seek a clinician when you can.",
    closing:
      "Thank you for trusting me with this. You may show the lines on the screen to a clinician if you wish. Khuda hafiz.",
    welcomeKicker: "For you, in confidence",
    welcomeTitle: "Speak softly. I will listen, one thing at a time.",
    welcomeBody:
      "Noor will walk with you through a short check-in. She is a computer voice on this device, not a woman on the phone, and she is not a doctor. She can offer a simple comfort or basic first aid. She cannot tell you what is wrong.",
    welcomePoints: [
      "No account, no cookies, and no server that receives your voice or your words.",
      "Your words live in this tab’s memory, and nowhere else.",
      "The first visit may download public model files: about 140 megabytes for an optional reply model, about 90 megabytes for Noor's voice, and about 40 more if you use the microphone. They are the same files for every person. Your words are not in that download. The conversation does not wait for them.",
      "Erase everything, or close the tab, and the conversation is gone.",
    ],
    topicsLabel: "She will ask, only one thing at a time, about",
    topics: [
      "how you are feeling",
      "what is troubling you, in your own words",
      "a simple comfort at home, if you want one",
      "basic first aid if there is bleeding, trouble breathing, or a collapse",
    ],
    welcomeFoot:
      "English today. Pashto and Dari will come later, after women have heard the voice. She will not press you about private matters, and she will not examine you. If someone is nearby, you may type instead of speaking.",
    youLabel: "You",
    summaryTitle: "For a clinician",
    summaryNote: "Not a diagnosis. Read it together, then erase it when you are done.",
    preparing: "Noor is coming onto this device. Only public model files are downloading. Your words stay here.",
    onDeviceLine: "On this device · nothing is sent away",
    modelIdle: "Language model: not downloaded",
    modelReady: "Language model: ready",
    modelFailedStatus: "Language model: failed",
    voiceIdle: "Voice: not downloaded",
    voiceReady: "Voice: ready",
    voiceFailed: "Voice: failed",
    voiceDevice: "Voice: this device",
    speechIdle: "Speech model: not downloaded",
    privacyTitle: "Privacy",
    privacyStoredTitle: "What stays on this device",
    privacyStored: [
      "The words of this conversation, in this tab’s memory only, until you tap Erase everything or leave.",
      "Public model files for the optional language model, the voice, and speech-to-text, the same files for every person, in the browser cache. They do not contain your words.",
    ],
    privacyNotTitle: "What does not happen",
    privacyNot: [
      "Your voice and your words are not sent to a server, a clinic, or a model company.",
      "No account, no cookies, and no saved conversation in browser storage.",
      "No analytics, and no outside fonts or scripts.",
      "Noor speaks with a voice model on this device (a soft female voice). If that model is still downloading, she uses an offline voice already on the device, and if there is none, the words stay on the screen. A network voice is not used.",
      "Erase everything drops the conversation at once. The cached model files remain, because they are not your story.",
      "If you tap Copy for a doctor, the words go to the clipboard, which this app does not clear for you.",
    ],
    privacyButton: "Privacy",
    footer: "Health-a-thon 2026 prototype. On this device. Not a medical device, and not a person on the line.",
    copy: "Copy for a doctor",
    copied: "Copied. It stays on your clipboard until you clear it. This app does not keep a copy.",
    hearAgain: "Hear that again",
    tryAgain: "Try again",
    typePlaceholder: "Or type here, if speaking is hard",
    steps: [
      { id: "wellbeing", label: "Feeling" },
      { id: "concern", label: "Trouble" },
      { id: "care", label: "Comfort" },
      { id: "first_aid", label: "First aid" },
      { id: "summary", label: "Summary" },
    ],
    status: {
      idle: "Tap the microphone, or type if you prefer.",
      listening: "Listening. Tap the microphone again when you finish.",
      transcribing: "Writing your words on this screen only.",
      thinking: "Noor is thinking, on this device.",
      speaking: "Noor is speaking.",
      preparing: "Noor is coming onto this device. Only public model files are downloading. Your words stay here.",
      summary: "You can add anything that was missed, or erase this when you are done.",
    },
    errors: {
      modelFailed: "Noor answered with her prepared words. Nothing was sent away.",
      generic: "Something went quiet on this device. Please try again.",
      emptyAudio: "I could not hear words. Please try again, or type.",
      micDenied: "Microphone permission was denied. You can type instead. That is just as good.",
      micMissing: "This browser cannot use the microphone. You can type instead.",
      tooLong: "That was a little long. Please say it more briefly, or type.",
      tooQuiet: "I did not catch any sound. Please try again, or type.",
      micInsecure: "The microphone needs a secure page. You can type instead. That is just as good.",
      speechFailed: "The speech model did not finish on this device. You can type instead. Nothing was sent away.",
      voiceUnavailable:
        "The words are on the screen. Nothing was sent away to speak them.",
    },
  },
  safety: {
    selfHarmSpoken:
      "Thank you for telling me. Please get help from a person right now. Call 102, or ask someone you trust to take you to a clinic. If you might hurt yourself, please do not stay alone. I cannot see you, and I cannot send help. I will stop the questions here. You matter. Khuda hafiz.",
    selfHarmSummary:
      "She indicated thoughts of harming herself. She was asked to reach a person, a clinic, or an ambulance immediately. Details were not repeated here.",
    selfHarmClinician:
      "This is not a diagnosis. During a private check-in she indicated thoughts of harming herself. The assistant stopped the questions and advised her to get in-person help immediately. Graphic detail was deliberately left out. Please assess her safety in person.",
    medicalAdvice:
      "Please seek a clinician when you can. If you are very unwell, a clinic, a midwife, or an ambulance on 102 can help today. I cannot tell you what is wrong.",
    medicalUrgentSummary:
      "She described an urgent concern. She was asked to seek a clinician when she can. This is not a diagnosis.",
    firstAidScript:
      "If blood is pouring, press a clean cloth on it and keep holding. Do that before anything else. If the throat is blocked, cough if you can, and call someone near you. Look to see if the chest is rising. If breathing has stopped, shout for help at once. Keep her warm, and keep pressing if the bleeding is heavy. If she is confused or will not wake, stay beside her and do not shake her. Uncover only enough to see a wound, then cover her so she does not get cold. Please seek a clinician when you can.",
    firstAidSummary:
      "Basic first aid was spoken in the XABCDE order, in plain words: bleeding, airway, breathing, circulation, disability, and exposure. She was asked to seek a clinician.",
    urgentTitle: "Please reach a person now",
    urgentSelfHarmBody:
      "If you might hurt yourself, you should not be alone. This screen cannot send help, and it forgets these words when you leave or tap Erase everything.",
    urgentMedicalBody:
      "What you described should be seen by a clinician when you can, and today if you are very unwell. This screen cannot examine you, and it cannot say what is wrong.",
    ambulanceLabel: "Ambulance",
    ambulanceNumber: "102",
    helplineLabel: "Awaaz helpline",
    helplineNumber: "410",
    helplineNote:
      "Free, with women who answer in Dari and Pashto, from 7 in the morning until 7 in the evening. They can help you find health services. If 102 does not connect where you are, go to the nearest clinic with someone you trust.",
  },
};
