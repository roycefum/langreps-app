export type QuizHistoryEntry = {
  session_id: string;
  completed_at: string;
  correct: number;
  total: number;
};

// Five phrasings per trend bucket so the message doesn't feel like the same
// canned line every time — picked at random on each screen load, not tied
// to any particular history entry. These are translation keys (see
// trend_* rows in localization/ui_strings.csv) — callers pass the result
// through t() to get the actual displayed text.
const IMPROVING_A_LOT = [
  "trend_improving_a_lot_1",
  "trend_improving_a_lot_2",
  "trend_improving_a_lot_3",
  "trend_improving_a_lot_4",
  "trend_improving_a_lot_5",
];

const IMPROVING = [
  "trend_improving_1",
  "trend_improving_2",
  "trend_improving_3",
  "trend_improving_4",
  "trend_improving_5",
];

const STEADY = [
  "trend_steady_1",
  "trend_steady_2",
  "trend_steady_3",
  "trend_steady_4",
  "trend_steady_5",
];

const DECLINING = [
  "trend_declining_1",
  "trend_declining_2",
  "trend_declining_3",
  "trend_declining_4",
  "trend_declining_5",
];

const DECLINING_A_LOT = [
  "trend_declining_a_lot_1",
  "trend_declining_a_lot_2",
  "trend_declining_a_lot_3",
  "trend_declining_a_lot_4",
  "trend_declining_a_lot_5",
];

function pickRandom(options: string[]): string {
  return options[Math.floor(Math.random() * options.length)];
}

// Compares the average of the earliest two scores against the average of
// the latest two — a simple enough signal to compute client-side, with no
// need for a separate AI call just to describe a trend. Returns a
// translation key, not display text — pass it through t() before showing.
export function getTrendFeedback(history: QuizHistoryEntry[]): string | null {
  if (history.length < 3) return null;

  const scores = history.map((h) => (h.total > 0 ? h.correct / h.total : 0));
  const earliest = scores.slice(0, 2);
  const latest = scores.slice(-2);
  const earliestAvg = earliest.reduce((sum, s) => sum + s, 0) / earliest.length;
  const latestAvg = latest.reduce((sum, s) => sum + s, 0) / latest.length;
  const diff = (latestAvg - earliestAvg) * 100;

  if (diff >= 15) return pickRandom(IMPROVING_A_LOT);
  if (diff >= 5) return pickRandom(IMPROVING);
  if (diff > -5) return pickRandom(STEADY);
  if (diff > -15) return pickRandom(DECLINING);
  return pickRandom(DECLINING_A_LOT);
}
