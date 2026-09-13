import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { DEFAULT_CEFR_LEVEL, type CefrLevel } from "./types";

const DEFAULT_CEFR_LEVEL_KEY = "langreps_default_cefr_level";
const AUTO_DELETE_OLD_QUIZZES_KEY = "langreps_auto_delete_old_quizzes";
const ADAPTIVE_QUIZZES_ENABLED_KEY = "langreps_adaptive_quizzes_enabled";
const HAS_SEEN_ONBOARDING_KEY = "langreps_has_seen_onboarding";

// Same web guard as auth-storage.ts — expo-secure-store throws (not
// no-ops) on web, and this is a device-local setting anyway (explicitly
// not account-level — see [[project-langreps-frontend]] memory), so
// there's nothing to persist there regardless.
const isWeb = Platform.OS === "web";

export async function getDefaultCefrLevel(): Promise<CefrLevel> {
  if (isWeb) return DEFAULT_CEFR_LEVEL;
  const stored = await SecureStore.getItemAsync(DEFAULT_CEFR_LEVEL_KEY);
  return (stored as CefrLevel | null) ?? DEFAULT_CEFR_LEVEL;
}

export async function setDefaultCefrLevel(level: CefrLevel): Promise<void> {
  if (isWeb) return;
  await SecureStore.setItemAsync(DEFAULT_CEFR_LEVEL_KEY, level);
}

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

// Off by default (i.e. "not seen yet") — gates the one-time onboarding
// screen shown on first launch. Web has no persistence for this (see
// isWeb guard above), so it would show every time on web — acceptable
// since web isn't a real distribution target for this app.
export async function getHasSeenOnboarding(): Promise<boolean> {
  if (isWeb) return true;
  const stored = await SecureStore.getItemAsync(HAS_SEEN_ONBOARDING_KEY);
  return stored === "true";
}

export async function setHasSeenOnboarding(seen: boolean): Promise<void> {
  if (isWeb) return;
  await SecureStore.setItemAsync(HAS_SEEN_ONBOARDING_KEY, String(seen));
}
