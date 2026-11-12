// Mirrors core/helpers.py's remove_accents() on the backend — strips
// diacritics so quiz answer matching is accent-lenient (e.g. "facil" ~= "fácil").
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function removeAccents(text: string): string {
  return text.normalize("NFD").replace(COMBINING_DIACRITICS, "");
}

// Phone keyboards turn a typed ' into a curly ’ (or ʼ), so French elisions
// like l'ami would otherwise never match the stored straight-apostrophe form.
export function normalizeApostrophes(text: string): string {
  return text.replace(/[\u2018\u2019\u02BC]/g, "'");
}

// Leading articles per language. A learner may save a noun with its article
// ("un citoyen") to see the gender when reviewing, but quizzes only test the
// bare word, so the article is dropped when a quiz is built and when an
// answer is checked. Longest first, so "une" wins over "un".
const ARTICLES: Record<string, string[]> = {
  English: ["the", "an", "a"],
  Spanish: ["unos", "unas", "los", "las", "una", "un", "el", "la"],
  French: ["de la", "de l'", "les", "des", "une", "un", "le", "la", "du", "l'"],
};

// Removes one leading article from a word, but only when something follows
// it, so a lone "le" is left alone. Tries every given language's articles.
export function stripLeadingArticle(text: string, languages: string[]): string {
  const trimmed = text.trim();
  const lower = normalizeApostrophes(trimmed).toLowerCase();
  const articles = [...new Set(languages.flatMap((l) => ARTICLES[l] ?? []))].sort(
    (a, b) => b.length - a.length
  );
  for (const article of articles) {
    if (!lower.startsWith(article)) continue;
    const rest = trimmed.slice(article.length);
    // An elided article (l', de l') attaches directly to the word; the rest
    // need a space after them (so "arbre" is not "a" + "rbre").
    const attached = article.endsWith("'");
    if (attached ? rest.trim() : /^\s+\S/.test(rest)) return rest.trim();
  }
  return trimmed;
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
