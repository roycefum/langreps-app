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

// Whether a saved list belongs to the active mode. With no mode yet there is
// nothing to scope to, so everything counts.
export function inMode(
  mode: LanguagePairSettings | null,
  list: { source_language: string; target_language: string }
): boolean {
  return (
    !mode || (list.source_language === mode.sourceLanguage && list.target_language === mode.targetLanguage)
  );
}

// The app is always in exactly one language mode — from the learner's
// native language to the one they're learning. Essentials, My Lists, Saved
// Quizzes and the list builders all follow it, so nothing needs its own
// language filter. Stored on the device (it works signed out) and mirrored
// to the account profile so a new phone picks it up.
export function ModeProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
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
    if (!userId || !isLoaded) return;
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
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs per sign-in (or first load), not on every mode change: setMode
    // already syncs those.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isLoaded]);

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
