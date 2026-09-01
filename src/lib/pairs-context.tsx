import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type VocabPair = { "source word": string; "target word": string };

type PairsState = {
  pairs: VocabPair[];
  addPair: (sourceWord: string, targetWord: string) => void;
  removePair: (index: number) => void;
  undoLast: () => void;
  clearPairs: () => void;
  setPairs: (pairs: VocabPair[]) => void;
};

const PairsContext = createContext<PairsState | null>(null);

// Holds the vocab list currently being built, shared across all four
// builder screens (manual/paste/file/photo) before Save or Generate Quiz —
// mirrors the Streamlit prototype's st.session_state.vocab_pairs.
export function PairsProvider({ children }: { children: ReactNode }) {
  const [pairs, setPairsState] = useState<VocabPair[]>([]);

  const addPair = useCallback((sourceWord: string, targetWord: string) => {
    setPairsState((prev) => [...prev, { "source word": sourceWord, "target word": targetWord }]);
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
      value={{ pairs, addPair, removePair, undoLast, clearPairs, setPairs: setPairsState }}
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
