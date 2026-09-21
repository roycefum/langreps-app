import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { DEFAULT_LIST_TYPE, DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE, type ListType } from "./types";

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
  list_type: string;
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
  // Chosen at save time (see pairs-review.tsx) — "verb" unlocks the tense
  // selector on Generate Quiz. Defaults to "vocab" for a list that hasn't
  // been saved yet.
  listType: ListType;
  setListType: (type: ListType) => void;
  savedListId: string | null;
  // Shown on Generate Quiz so it's never ambiguous which list a quiz is
  // being generated from — null means "not saved / no name yet".
  listName: string | null;
  setSavedList: (id: string, name: string) => void;
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
  const [listType, setListType] = useState<ListType>(DEFAULT_LIST_TYPE);
  const [savedListId, setSavedListId] = useState<string | null>(null);
  const [listName, setListName] = useState<string | null>(null);

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
    setListName(null);
    setListType(DEFAULT_LIST_TYPE);
  }, []);

  // Sets savedListId and listName together — they should never be set
  // independently, or Generate Quiz could show a stale name for the
  // current savedListId (or vice versa).
  const setSavedList = useCallback((id: string, name: string) => {
    setSavedListId(id);
    setListName(name);
  }, []);

  // Loads a previously saved list (from My Lists) as the list currently
  // being built — replaces pairs/languages/savedListId/listName together
  // so Generate Quiz can create a real quiz session against it, and always
  // show which list it's generating from.
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
    setListName(list.name);
    setListType(list.list_type === "verb" ? "Verb" : DEFAULT_LIST_TYPE);
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
        listType,
        setListType,
        savedListId,
        listName,
        setSavedList,
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
