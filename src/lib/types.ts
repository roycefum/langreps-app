export type Question = {
  question_text: string;
  correct_answer: string;
  skill_category: string;
};

export const DEFAULT_SOURCE_LANGUAGE = "English";
export const DEFAULT_TARGET_LANGUAGE = "Spanish";

// Matches core/cefr.py's CEFR_LEVEL_GUIDANCE keys and DEFAULT_CEFR_LEVEL.
// No profile system exists yet to supply a per-user default, so this is a
// flat default for now — once profiles exist, the default should come from
// a saved user preference instead.
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];
export const DEFAULT_CEFR_LEVEL: CefrLevel = "A1";
