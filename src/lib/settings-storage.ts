import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { DEFAULT_CEFR_LEVEL, type CefrLevel } from "./types";

const AUTO_DELETE_OLD_QUIZZES_KEY = "langreps_auto_delete_old_quizzes";
const ADAPTIVE_QUIZZES_ENABLED_KEY = "langreps_adaptive_quizzes_enabled";
const HAS_SEEN_ONBOARDING_KEY = "langreps_has_seen_onboarding";
const LANGUAGE_PAIRS_KEY = "langreps_language_pairs";

// Same web guard as auth-storage.ts — expo-secure-store throws (not
// no-ops) on web, and this is a device-local setting anyway (explicitly
// not account-level — see [[project-langreps-frontend]] memory), so
// there's nothing to persist there regardless.
const isWeb = Platform.OS === "web";

// Off by default — deleting a user's quiz history is destructive, so it
// should be an explicit opt-in rather than a surprise.
export async function getAutoDeleteOldQuizzes(): Promise<boolean> {
  if (isWeb) return false;
  const stored = await SecureStore.getItemAsync(AUTO_DELETE_OLD_QUIZZES_KEY);
  return stored === "true";
}

export async function setAutoDeleteOldQuizzes(enabled: boolean): Promise<void> {
  if (isWeb) return;
  await SecureStore.setItemAsync(AUTO_DELETE_OLD_QUIZZES_KEY, String(enabled));
}

// On by default — most users benefit from the pattern-based feedback and
// targeted-practice option, but it's a real Gemini call per Generate Quiz
// visit once a list has enough history, so it can be turned off.
export async function getAdaptiveQuizzesEnabled(): Promise<boolean> {
  if (isWeb) return true;
  const stored = await SecureStore.getItemAsync(ADAPTIVE_QUIZZES_ENABLED_KEY);
  return stored !== "false";
}

export async function setAdaptiveQuizzesEnabled(enabled: boolean): Promise<void> {
  if (isWeb) return;
  await SecureStore.setItemAsync(ADAPTIVE_QUIZZES_ENABLED_KEY, String(enabled));
}

// Off by default (i.e. "not dismissed yet") — the intro screens show on
// every app launch until the user explicitly taps "Don't show again" on
// them; only that persists this. Skipping or finishing the intro without
// ticking it just dismisses it for this launch. Web has no persistence for
// this (see isWeb guard above), so it would show every time on web —
// acceptable since web isn't a real distribution target for this app.
export async function getHasSeenOnboarding(): Promise<boolean> {
  if (isWeb) return true;
  const stored = await SecureStore.getItemAsync(HAS_SEEN_ONBOARDING_KEY);
  return stored === "true";
}

export async function setHasSeenOnboarding(seen: boolean): Promise<void> {
  if (isWeb) return;
  await SecureStore.setItemAsync(HAS_SEEN_ONBOARDING_KEY, String(seen));
}

// In-memory only, deliberately NOT persisted — resets on every app launch,
// which is exactly the "once per launch" behavior wanted. Without it, an
// intro that no longer marks itself permanently seen when dismissed would
// be redirected to again the moment Home remounts, forever: Home would see
// "not permanently dismissed," bounce back to the intro, and the user
// could never reach Home at all.
let onboardingShownThisLaunch = false;

export function hasShownOnboardingThisLaunch(): boolean {
  return onboardingShownThisLaunch;
}

export function markOnboardingShownThisLaunch(): void {
  onboardingShownThisLaunch = true;
}

// ============================================================
// LANGUAGE PAIRS — per-language settings for a polyglot studying more
// than one pair at once. CEFR default and accent leniency genuinely vary
// by language (a B1 in French isn't the same starting point as an A2 in
// Spanish), unlike adaptive-quizzes/auto-delete above, which are plain
// app-wide feature toggles — so those two live per pair, not globally.
// ============================================================

export type LanguagePairSettings = {
  sourceLanguage: string;
  targetLanguage: string;
  cefrLevel: CefrLevel;
  // Off by default — grading strips accents (café/cafe both count as
  // correct), which is friendlier for new learners who haven't learned to
  // type accented characters yet. Turning this on makes grading exact.
  requireAccents: boolean;
};

async function readLanguagePairs(): Promise<LanguagePairSettings[]> {
  if (isWeb) return [];
  const stored = await SecureStore.getItemAsync(LANGUAGE_PAIRS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as LanguagePairSettings[];
  } catch {
    return [];
  }
}

async function writeLanguagePairs(pairs: LanguagePairSettings[]): Promise<void> {
  if (isWeb) return;
  await SecureStore.setItemAsync(LANGUAGE_PAIRS_KEY, JSON.stringify(pairs));
}

export async function getLanguagePairs(): Promise<LanguagePairSettings[]> {
  return readLanguagePairs();
}

// Called specifically when a NEW account is created (see auth-context.tsx's
// signup()) — language pairs are device-local, not account-bound, by
// design (see the comment above), which means they otherwise leak across
// accounts on the same device: creating a brand-new account would
// immediately show whatever pairs an earlier account, or anonymous use,
// left behind. Deliberately NOT called on logout/login — that would wipe
// a real user's own preferences every time they're logged out (e.g. by a
// 401) and back in as themselves, which is the common case this must not
// break.
export async function clearLanguagePairs(): Promise<void> {
  await writeLanguagePairs([]);
}

export async function addLanguagePair(sourceLanguage: string, targetLanguage: string): Promise<void> {
  const pairs = await readLanguagePairs();
  if (pairs.some((p) => p.sourceLanguage === sourceLanguage && p.targetLanguage === targetLanguage)) {
    return;
  }
  pairs.push({ sourceLanguage, targetLanguage, cefrLevel: DEFAULT_CEFR_LEVEL, requireAccents: false });
  await writeLanguagePairs(pairs);
}

export async function removeLanguagePair(sourceLanguage: string, targetLanguage: string): Promise<void> {
  const pairs = await readLanguagePairs();
  await writeLanguagePairs(
    pairs.filter((p) => !(p.sourceLanguage === sourceLanguage && p.targetLanguage === targetLanguage))
  );
}

export async function updateLanguagePairSettings(
  sourceLanguage: string,
  targetLanguage: string,
  updates: Partial<Pick<LanguagePairSettings, "cefrLevel" | "requireAccents">>
): Promise<void> {
  const pairs = await readLanguagePairs();
  const next = pairs.map((p) =>
    p.sourceLanguage === sourceLanguage && p.targetLanguage === targetLanguage ? { ...p, ...updates } : p
  );
  await writeLanguagePairs(next);
}

// Looked up at quiz-generation time — falls back to the plain defaults if
// this exact pair was never added in Settings (e.g. an ad-hoc list whose
// language pair isn't one of the user's tracked languages).
export async function getLanguagePairSettings(
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ cefrLevel: CefrLevel; requireAccents: boolean }> {
  const pairs = await readLanguagePairs();
  const match = pairs.find((p) => p.sourceLanguage === sourceLanguage && p.targetLanguage === targetLanguage);
  return match
    ? { cefrLevel: match.cefrLevel, requireAccents: match.requireAccents }
    : { cefrLevel: DEFAULT_CEFR_LEVEL, requireAccents: false };
}
