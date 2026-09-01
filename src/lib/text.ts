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
