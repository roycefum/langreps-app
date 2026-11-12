import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiRequest } from "./api";
import { useAuth } from "./auth-context";
import {
  addLanguagePair,
  getActivePairKey,
  getLanguagePairs,
  setActivePairKey,
  type LanguagePairSettings,
} from "./settings-storage";

type ModeState = {
  // False until the first read of device storage finishes, so screens don't
  // flash the "pick a language" setup before the saved mode loads.
  isLoaded: boolean;
  // Every pair the learner has set up on this device.
  modes: LanguagePairSettings[];
  // The one the whole app is currently set to (null until one is chosen).
  mode: LanguagePairSettings | null;
  // Adds the pair if it is new, makes it the active mode, and (signed in)
  // remembers it on the account.
  setMode: (sourceLanguage: string, targetLanguage: string) => Promise<void>;
  // Re-reads storage — for screens that edit pairs directly (Settings).
  refresh: () => Promise<void>;
};

const ModeContext = createContext<ModeState | null>(null);

const pairKey = (source: string, target: string) => `${source}|${target}`;

// Whether a saved list belongs to the active mode. A list's direction is just
// which language comes first in it (French first when copying from a French
// textbook), so English → French and French → English lists both belong to
// an English / French mode. With no mode yet there is nothing to scope to,
// so everything counts.
export function inMode(
  mode: LanguagePairSettings | null,
  list: { source_language: string; target_language: string }
): boolean {
  if (!mode) return true;
  const { sourceLanguage: a, targetLanguage: b } = mode;
  return (
    (list.source_language === a && list.target_language === b) ||
    (list.source_language === b && list.target_language === a)
  );
}

// Which way a quiz on a list is asked. A list's own direction is only which
// column is written first, but a quiz always asks for the language being
// learned: a French → English list in English / French mode is quizzed as
// English → French (the words swap sides, the list itself is untouched).
export function quizDirection(
  mode: LanguagePairSettings | null,
  sourceLanguage: string,
  targetLanguage: string
): { sourceLanguage: string; targetLanguage: string; reversed: boolean } {
  const reversed = !!mode && sourceLanguage === mode.targetLanguage && targetLanguage === mode.sourceLanguage;
  return reversed
    ? { sourceLanguage: targetLanguage, targetLanguage: sourceLanguage, reversed }
    : { sourceLanguage, targetLanguage, reversed };
}

// The app is always in exactly one language mode — from the learner's
// native language to the one they're learning. Essentials, My Lists, Saved
// Quizzes and the list builders all follow it, so nothing needs its own
// language filter. Stored on the device (it works signed out) and mirrored
// to the account profile so a new phone picks it up.
export function ModeProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [isStorageLoaded, setIsLoaded] = useState(false);
  // The account whose saved pair has been checked on this device (see the
  // sign-in sync below), so a fresh login doesn't flash "pick a language"
  // while the account's own pair is still on its way.
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  const [modes, setModes] = useState<LanguagePairSettings[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [pairs, key] = await Promise.all([getLanguagePairs(), getActivePairKey()]);
    setModes(pairs);
    setActiveKey(key);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mode = useMemo(
    () => modes.find((m) => pairKey(m.sourceLanguage, m.targetLanguage) === activeKey) ?? modes[0] ?? null,
    [modes, activeKey]
  );

  const setMode = useCallback(
    async (sourceLanguage: string, targetLanguage: string) => {
      await addLanguagePair(sourceLanguage, targetLanguage);
      await setActivePairKey(pairKey(sourceLanguage, targetLanguage));
      await refresh();
      if (userId) {
        apiRequest("/me/profile", {
          method: "PATCH",
          body: { source_language: sourceLanguage, target_language: targetLanguage },
        }).catch(() => {
          // best-effort — the device keeps working; it syncs on the next change
        });
      }
    },
    [userId, refresh]
  );

  // Signing in links the device and the account: a new phone adopts the
  // account's saved pair, and a mode chosen while signed out (before
  // signing up) is saved to the account.
  useEffect(() => {
    if (!userId || !isStorageLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await apiRequest<{
          learning_source_language: string | null;
          learning_target_language: string | null;
        }>("/me/profile");
        if (cancelled) return;
        if (!profile.learning_target_language) {
          if (mode) {
            await apiRequest("/me/profile", {
              method: "PATCH",
              body: { source_language: mode.sourceLanguage, target_language: mode.targetLanguage },
            });
          }
        } else if (modes.length === 0 && profile.learning_source_language) {
          await addLanguagePair(profile.learning_source_language, profile.learning_target_language);
          await setActivePairKey(pairKey(profile.learning_source_language, profile.learning_target_language));
          await refresh();
        }
      } catch {
        // best-effort — a failed sync just means nothing changes this time
      } finally {
        if (!cancelled) setSyncedUserId(userId);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs per sign-in (or first load), not on every mode change: setMode
    // already syncs those.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isStorageLoaded]);

  const isLoaded = isStorageLoaded && (!userId || modes.length > 0 || syncedUserId === userId);

  const value = useMemo(
    () => ({ isLoaded, modes, mode, setMode, refresh }),
    [isLoaded, modes, mode, setMode, refresh]
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return ctx;
}
