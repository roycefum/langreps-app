import { useRouter } from "expo-router";
import { useCallback } from "react";

import { useMode } from "./mode-context";
import { usePairs } from "./pairs-context";

// Opens the list builder on a blank list. pairs-context is one shared "list
// currently being built," so it persists across navigation by design (that's
// what lets tapping a saved list in My Lists load it into List Details). But
// entering the builder to make a new list should always start fresh —
// otherwise backing out of a List Details session and opening the builder
// again would silently keep showing that list.
export function useStartNewList() {
  const router = useRouter();
  const { clearPairs, setSourceLanguage, setTargetLanguage } = usePairs();
  const { mode } = useMode();

  return useCallback(() => {
    clearPairs();
    // A new list starts in the active language mode.
    if (mode) {
      setSourceLanguage(mode.sourceLanguage);
      setTargetLanguage(mode.targetLanguage);
    }
    router.push("/list-details");
  }, [clearPairs, setSourceLanguage, setTargetLanguage, mode, router]);
}
