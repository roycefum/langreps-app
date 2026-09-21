// Mirrors core/helpers.py's remove_accents() on the backend — strips
// diacritics so quiz answer matching is accent-lenient (e.g. "facil" ~= "fácil").
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function removeAccents(text: string): string {
  return text.normalize("NFD").replace(COMBINING_DIACRITICS, "");
}

// Sample lists are saved with a "(Source → Target)" language-pair suffix
// baked into the underlying name (see my-lists.tsx's sampleLists) so two
// entries with the same category but a different language pair can't
// collide via save-list's update-by-name semantics. That suffix is
// redundant anywhere the language pair is already shown separately —
// strip it for display only; the raw name (with suffix) is still what's
// sent to/from the API. Scoped specifically to a "(Word → Word)" shape
// (not any trailing parenthetical) so a user's own custom list name
// containing parentheses is never mangled.
export function displayListName(name: string): string {
  return name.replace(/ \([A-Za-zÀ-ÿ]+ → [A-Za-zÀ-ÿ]+\)$/, "");
}

// Flips which side of each pair is "known" vs "learning" — used when a
// user tells LanguageOrderConfirm the app's initial column-order guess was
// backwards (e.g. a textbook list puts the foreign/learning word first).
export function swapPairLanguages<T extends { "source word": string; "target word": string }>(
  pairs: T[]
): T[] {
  return pairs.map((p) => ({
    ...p,
    "source word": p["target word"],
    "target word": p["source word"],
  }));
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Collapses pairs that share the same target word (case/whitespace
// insensitive) down to one representative — mirrors the backend's
// _dedupe_pairs_by_target(), for ad-hoc/unsaved lists that never go
// through that endpoint. Without this, a quiz could ask the same target
// word more than once even when plenty of other words are available.
export function dedupePairs<T extends { "target word": string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const item of items) {
    const key = item["target word"].trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

// Plain (unweighted) random sample without replacement, for ad-hoc/unsaved
// lists. Saved lists get the same plain spread from the backend's
// select_quiz_pairs_for_list().
export function sample<T>(items: T[], count: number): T[] {
  if (count >= items.length) return items;
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
