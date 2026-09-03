import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { DEFAULT_CEFR_LEVEL, DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE, type CefrLevel } from "./types";

// `id` is present when a pair came from a saved list (needed to record
// quiz attempts against it and to weight adaptive requiz selection), and
// absent for freshly-typed/pasted/ad-hoc pairs that were never saved.
export type VocabPair = { id?: string; "source word": string; "target word": string };

// Matches GET /lists/{id}'s response shape — pairs come back keyed
// source_term/target_term (the vocab_pairs table's own column names),
// unlike the app's internal "source word"/"target word" convention.
export type SavedList = {
  id: string;
  name: string;
  source_language: string;
  target_language: string;
  pairs: { id: string; source_term: string; target_term: string }[];
};

type PairsState = {
  pairs: VocabPair[];
  addPair: (sourceWord: string, targetWord: string) => void;
  addPairs: (newPairs: VocabPair[]) => void;
  removePair: (index: number) => void;
  undoLast: () => void;
  clearPairs: () => void;
  setPairs: (pairs: VocabPair[]) => void;
  sourceLanguage: string;
  targetLanguage: string;
  setSourceLanguage: (language: string) => void;
  setTargetLanguage: (language: string) => void;
  cefrLevel: CefrLevel;
  setCefrLevel: (level: CefrLevel) => void;
  savedListId: string | null;
  setSavedListId: (id: string | null) => void;
  loadList: (list: SavedList) => void;
};

const PairsContext = createContext<PairsState | null>(null);

// Holds the vocab list currently being built, shared across all four
// builder screens (manual/paste/file/photo) before Save or Generate Quiz —
// mirrors the Streamlit prototype's st.session_state.vocab_pairs. Also
// holds the source/target language for that list, since "source word" is
// only meaningful in the context of a specific language pair (e.g. a
// pasted/uploaded list with reversed column order silently produces
// backwards quiz answers if the language pair doesn't match its data).
export function PairsProvider({ children }: { children: ReactNode }) {
  const [pairs, setPairsState] = useState<VocabPair[]>([]);
  const [sourceLanguage, setSourceLanguage] = useState(DEFAULT_SOURCE_LANGUAGE);
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_TARGET_LANGUAGE);
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>(DEFAULT_CEFR_LEVEL);
  const [savedListId, setSavedListId] = useState<string | null>(null);

  const addPair = useCallback((sourceWord: string, targetWord: string) => {
    setPairsState((prev) => [...prev, { "source word": sourceWord, "target word": targetWord }]);
  }, []);

  // Used by the paste/file/photo builder screens, which each produce a
  // whole batch of pairs from one parse/extraction call rather than one at
  // a time like manual entry.
  const addPairs = useCallback((newPairs: VocabPair[]) => {
    setPairsState((prev) => [...prev, ...newPairs]);
  }, []);

  const removePair = useCallback((index: number) => {
    setPairsState((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const undoLast = useCallback(() => {
    setPairsState((prev) => prev.slice(0, -1));
  }, []);

  const clearPairs = useCallback(() => {
    setPairsState([]);
    setSavedListId(null);
  }, []);

  // Loads a previously saved list (from My Lists) as the list currently
  // being built — replaces pairs/languages/savedListId together so
  // Generate Quiz can create a real quiz session against it. CEFR level
  // isn't stored per-list server-side, so it's left as whatever's
  // currently picked rather than reset.
  const loadList = useCallback((list: SavedList) => {
    setPairsState(
      list.pairs.map((p) => ({
        id: p.id,
        "source word": p.source_term,
        "target word": p.target_term,
      }))
    );
    setSourceLanguage(list.source_language);
    setTargetLanguage(list.target_language);
    setSavedListId(list.id);
  }, []);

  return (
    <PairsContext.Provider
      value={{
        pairs,
        addPair,
        addPairs,
        removePair,
        undoLast,
        clearPairs,
        setPairs: setPairsState,
        sourceLanguage,
        targetLanguage,
        setSourceLanguage,
        setTargetLanguage,
        cefrLevel,
        setCefrLevel,
        savedListId,
        setSavedListId,
        loadList,
      }}
    >
      {children}
    </PairsContext.Provider>
  );
}

export function usePairs() {
  const ctx = useContext(PairsContext);
  if (!ctx) {
    throw new Error("usePairs must be used within a PairsProvider");
  }
  return ctx;
}
