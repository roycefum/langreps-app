// Mirrors core/helpers.py's remove_accents() on the backend — strips
// diacritics so quiz answer matching is accent-lenient (e.g. "facil" ~= "fácil").
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function removeAccents(text: string): string {
  return text.normalize("NFD").replace(COMBINING_DIACRITICS, "");
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Plain (unweighted) random sample without replacement, for ad-hoc/unsaved
// lists — there's no attempt history to weight by, unlike the backend's
// select_quiz_pairs_for_list() used for saved lists.
export function sample<T>(items: T[], count: number): T[] {
  if (count >= items.length) return items;
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
