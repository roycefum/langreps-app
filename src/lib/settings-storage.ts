import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { DEFAULT_CEFR_LEVEL, type CefrLevel } from "./types";

const DEFAULT_CEFR_LEVEL_KEY = "langreps_default_cefr_level";

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
