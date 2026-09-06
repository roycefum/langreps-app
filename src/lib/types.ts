export type Question = {
  question_text: string;
  correct_answer: string;
  skill_category: string;
  // Which vocab pair this question was generated from — null for pairs
  // with no id (ad-hoc/unsaved lists). Used to record attempts against a
  // specific word for adaptive requizzing.
  vocab_pair_id: string | null;
};

// Curated list for the language picker dropdowns — the backend accepts
// any string (it's just interpolated into the Gemini prompt), so this is
// purely a UI convenience, not a hard constraint. Scoped to the near-term
// plan (English/Spanish/French) rather than a large speculative list —
// easy to extend later.
export const LANGUAGES = ["English", "Spanish", "French"] as const;

export const DEFAULT_SOURCE_LANGUAGE = "English";
export const DEFAULT_TARGET_LANGUAGE = "Spanish";

// Matches core/cefr.py's CEFR_LEVEL_GUIDANCE keys and DEFAULT_CEFR_LEVEL.
// No profile system exists yet to supply a per-user default, so this is a
// flat default for now — once profiles exist, the default should come from
// a saved user preference instead.
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];
export const DEFAULT_CEFR_LEVEL: CefrLevel = "A1";

// Chosen when a list is saved (see pairs-review.tsx) — "Verb" unlocks a
// tense selector on Generate Quiz; other types (e.g. Adjectives) can be
// added later without touching the conjugation-testing logic itself,
// which already fires automatically per-pair regardless of list type.
// Lowercased before being sent as SaveListRequest.list_type on the backend.
export const LIST_TYPES = ["Vocab", "Verb"] as const;
export type ListType = (typeof LIST_TYPES)[number];
export const DEFAULT_LIST_TYPE: ListType = "Vocab";

// Mirrors core/tenses.py's TENSES_BY_LANGUAGE — duplicated here rather than
// fetched, same pattern as CEFR_LEVELS above. Only shown on Generate Quiz
// for a "verb" list, and only for languages with an entry here (English,
// Spanish, French for now).
export const TENSES_BY_LANGUAGE: Record<string, { value: string; label: string }[]> = {
  Spanish: [
    { value: "present", label: "Present (presente)" },
    { value: "preterite", label: "Preterite (pretérito)" },
    { value: "imperfect", label: "Imperfect (imperfecto)" },
    { value: "future", label: "Future (futuro)" },
    { value: "conditional", label: "Conditional (condicional)" },
    { value: "present_subjunctive", label: "Present Subjunctive (presente de subjuntivo)" },
    { value: "present_perfect", label: "Present Perfect (pretérito perfecto)" },
  ],
  English: [
    { value: "present_simple", label: "Present Simple" },
    { value: "past_simple", label: "Past Simple" },
    { value: "future_simple", label: "Future Simple" },
    { value: "present_continuous", label: "Present Continuous" },
    { value: "past_continuous", label: "Past Continuous" },
    { value: "present_perfect", label: "Present Perfect" },
  ],
  French: [
    { value: "present", label: "Present (présent)" },
    { value: "passe_compose", label: "Present Perfect (passé composé)" },
    { value: "imperfect", label: "Imperfect (imparfait)" },
    { value: "future", label: "Future (futur simple)" },
    { value: "conditional", label: "Conditional (conditionnel)" },
    { value: "present_subjunctive", label: "Present Subjunctive (subjonctif présent)" },
    { value: "pluperfect", label: "Pluperfect (plus-que-parfait)" },
  ],
};
