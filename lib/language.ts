/**
 * Active language profile.
 *
 * English is the only profile wired up today. To bring in Pashto or Dari,
 * add another object that satisfies `LanguageProfile` and export it as
 * `language`. See the Pashto roadmap in the README before doing that:
 * speech-to-text language, right-to-left layout, a reviewed female voice,
 * and translated safety phrases all have to move together.
 */
export type LanguageProfile = {
  id: string;
  locale: string;
  direction: "ltr" | "rtl";
  label: string;
  stt: {
    model: string;
    language: string;
    prompt: string;
  };
  llm: {
    model: string;
  };
  tts: {
    model: string;
    voice: string;
    speed: number;
    instructions: string;
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
      summary: string;
    };
    errors: {
      missingKey: string;
      rateLimit: string;
      generic: string;
      misheard: string;
      emptyAudio: string;
      micDenied: string;
      micMissing: string;
      tooLong: string;
      tooQuiet: string;
      voiceUnavailable: string;
      tapToHear: string;
    };
  };
  safety: {
    selfHarmSpoken: string;
    selfHarmSummary: string;
    selfHarmClinician: string;
    medicalAdvice: string;
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
    model: "gpt-4o-mini-transcribe",
    language: "en",
    prompt:
      "A woman speaking quietly about her health: sleep, food, water, pain, pregnancy, monthly bleeding, fever, breathing.",
  },
  llm: {
    model: "gpt-4o-mini",
  },
  tts: {
    model: "gpt-4o-mini-tts",
    voice: "shimmer",
    speed: 0.94,
    instructions:
      "Speak as a gentle woman, softly and a little slowly. Warm, calm, and respectful. Never bright, never jokey, never alarmed. Use a quiet close voice, as if you are sitting beside her and do not want anyone else to overhear.",
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
    welcomeKicker: "For you, in confidence",
    welcomeTitle: "Speak softly. I will listen, one thing at a time.",
    welcomeBody:
      "Noor will walk with you through a short check-in. She is a computer voice, not a woman on the phone, and she is not a doctor. She cannot tell you what is wrong. At the end she can give you a few lines to show a clinician.",
    welcomePoints: [
      "No account, no cookies, and no record kept on a server.",
      "Your words live in this tab’s memory, and nowhere else.",
      "Erase everything, or close the tab, and they are gone.",
    ],
    topicsLabel: "She will ask, only one thing at a time, about",
    topics: [
      "how you feel today",
      "sleep",
      "food and water",
      "pain or other symptoms",
      "pregnancy, which you may skip",
      "monthly bleeding, which you may skip",
      "heavy bleeding, severe pain, fever, trouble breathing, or thoughts of hurting yourself",
    ],
    welcomeFoot:
      "English today. Pashto and Dari will come later. If someone is nearby, you may type instead of speaking.",
    youLabel: "You",
    summaryTitle: "For a clinician",
    summaryNote: "Not a diagnosis. Read it together, then erase it when you are done.",
    preparing: "Noor is preparing her first question.",
    footer: "Health-a-thon 2026 prototype. Not a medical device, and not a person on the line.",
    copy: "Copy for a doctor",
    copied: "Copied. It stays on your clipboard until you clear it. This app does not keep a copy.",
    hearAgain: "Hear that again",
    tryAgain: "Try again",
    typePlaceholder: "Or type here, if speaking is hard",
    steps: [
      { id: "mood", label: "Feeling" },
      { id: "sleep", label: "Sleep" },
      { id: "nourishment", label: "Food and water" },
      { id: "symptoms", label: "Symptoms" },
      { id: "pregnancy", label: "Pregnancy" },
      { id: "menstrual", label: "Monthly bleeding" },
      { id: "red_flags", label: "Urgent signs" },
      { id: "summary", label: "Summary" },
    ],
    status: {
      idle: "Tap the microphone, or type if you prefer.",
      listening: "Listening. Tap the microphone again when you finish.",
      transcribing: "Writing your words on this screen only.",
      thinking: "Noor is thinking.",
      speaking: "Noor is speaking.",
      summary: "You can add anything that was missed, or erase this when you are done.",
    },
    errors: {
      missingKey:
        "This check-in is not connected yet. The person who set it up needs to add an OpenAI key.",
      rateLimit: "Please wait a moment, then try again.",
      generic: "Something went quiet on the way. Please try again.",
      misheard: "I am sorry, I missed that. Please say it once more, in a few words.",
      emptyAudio: "I could not hear words. Please try again, or type.",
      micDenied:
        "The microphone is not available. You can type instead. That is just as good.",
      micMissing: "This browser cannot use the microphone. You can type instead.",
      tooLong: "That was a little long. Please say it more briefly, or type.",
      tooQuiet: "I did not catch any sound. Please try again, or type.",
      voiceUnavailable: "I could not speak just now. The words are still on the screen.",
      tapToHear: "Tap to hear Noor, if the sound did not play.",
    },
  },
  safety: {
    selfHarmSpoken:
      "Thank you for telling me. Please get help from a person right now. Call 102, or ask someone you trust to take you to a clinic. If you might hurt yourself, please do not stay alone. I cannot see you, and I cannot send help. I will stop the questions here. You matter.",
    selfHarmSummary:
      "She indicated thoughts of harming herself. She was asked to reach a person, a clinic, or an ambulance immediately. Details were not repeated here.",
    selfHarmClinician:
      "This is not a diagnosis. During a private check-in she indicated thoughts of harming herself. The assistant stopped the questions and advised her to get in-person help immediately. Graphic detail was deliberately left out. Please assess her safety in person.",
    medicalAdvice:
      "Please seek urgent care today, with a clinic, a midwife, or an ambulance on 102. I cannot tell you what is wrong.",
    urgentTitle: "Please reach a person now",
    urgentSelfHarmBody:
      "If you might hurt yourself, you should not be alone. This screen cannot send help, and it forgets these words when you leave or tap Erase everything.",
    urgentMedicalBody:
      "What you described should be seen by a clinician today. This screen cannot examine you, and it cannot say what is wrong.",
    ambulanceLabel: "Ambulance",
    ambulanceNumber: "102",
    helplineLabel: "Awaaz helpline",
    helplineNumber: "410",
    helplineNote:
      "Free, with women who answer in Dari and Pashto, from 7 in the morning until 7 in the evening. They can help you find health services. If 102 does not connect where you are, go to the nearest clinic with someone you trust.",
  },
};
