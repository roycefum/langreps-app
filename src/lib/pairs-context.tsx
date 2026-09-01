import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE } from "./types";

export type VocabPair = { "source word": string; "target word": string };

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
