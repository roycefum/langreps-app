import { setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";

// Maps this app's LANGUAGES list (types.ts) to BCP-47 codes for the
// device's own TTS engine. LANGUAGES is a UI convenience, not a hard
// constraint (the backend accepts any string), so an unmapped language
// just falls back to the device's default voice rather than throwing.
const SPEECH_LANGUAGE_CODES: Record<string, string> = {
  English: "en-US",
  Spanish: "es-ES",
  French: "fr-FR",
};

// By default AVSpeechSynthesizer plays through iOS's ambient audio
// session, which silently respects the hardware mute switch — no error,
// it just doesn't make sound. A language app is exactly the kind of thing
// people use with the phone muted around others, so pronunciation needs
// to play regardless. Configuring this once, up front, rather than before
// every speak() call — cheap idempotent native call either way, but no
// need to repeat it on every tap.
setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
  // Best-effort — if this fails for some reason, speech still works, it
  // just won't override the mute switch.
});

// Stops any in-flight utterance before starting the next one — otherwise
// rapidly tapping several speaker icons queues them up instead of
// replacing, which reads as broken rather than just slow.
export function speakWord(text: string, language: string) {
  if (!text.trim()) return;
  Speech.stop();
  Speech.speak(text, {
    language: SPEECH_LANGUAGE_CODES[language],
    // Makes the synthesizer share the app's own audio session (the one
    // just configured above with playsInSilentMode) instead of managing
    // its own private session, which is what let the mute switch silence
    // it in the first place.
    useApplicationAudioSession: true,
  });
}
