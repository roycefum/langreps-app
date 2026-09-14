import { apiRequest } from "./api";
import type { VocabPair } from "./pairs-context";

type DetectionResult = { source_language: string; target_language: string };

// Best-effort — a detection failure should never block adding the parsed
// words, it just means the language picker stays at whatever it already
// was. Only worth calling when starting a list from empty (see call
// sites) — appending to an existing list should never silently overwrite
// a language pair the user already established.
export async function detectLanguages(pairs: VocabPair[]): Promise<DetectionResult | null> {
  if (pairs.length === 0) return null;
  try {
    return await apiRequest<DetectionResult>("/detect-language", {
      method: "POST",
      body: { pairs: pairs.slice(0, 5) },
    });
  } catch {
    return null;
  }
}
