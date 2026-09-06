export type QuizHistoryEntry = {
  session_id: string;
  completed_at: string;
  correct: number;
  total: number;
};

// Five phrasings per trend bucket so the message doesn't feel like the same
// canned line every time — picked at random on each screen load, not tied
// to any particular history entry.
const IMPROVING_A_LOT = [
  "Great progress! Your scores are climbing fast — keep it up.",
  "You're on a roll — your recent scores are way up from where you started.",
  "Big jump in your scores lately. Whatever you're doing, keep doing it.",
  "Your accuracy has shot up recently — this list is really clicking.",
  "Strong improvement here — you've clearly been putting in the reps.",
];

const IMPROVING = [
  "You're improving steadily on this list.",
  "Nice — your scores are trending upward little by little.",
  "Steady gains here. Keep at it and it'll keep paying off.",
  "You're getting a bit better each time you quiz this list.",
  "Solid upward trend — the practice is paying off.",
];

const STEADY = [
  "Your scores are holding steady. Try focusing on the words you keep missing.",
  "You're consistent on this list — a few more reps on the tricky words could push you higher.",
  "Not much movement lately. Worth a look at which specific words trip you up.",
  "Holding steady for now — try mixing in the word list reveal less to really test recall.",
  "Your scores are level. A quick review of your weaker words might get things moving again.",
];

const DECLINING = [
  "Your scores dipped a bit recently — might be worth a quick refresher.",
  "A small dip lately. Nothing major, just revisit this list when you get a chance.",
  "Scores have slipped slightly — could be worth slowing down on your next attempt.",
  "A bit of a dip recently. Happens — a short review session should help.",
  "Your recent scores are a little lower than before — maybe a refresher is due.",
];

const DECLINING_A_LOT = [
  "Your scores dropped noticeably. Consider going back through this list before your next quiz.",
  "A bigger drop than usual — this list might need a real refresher before your next attempt.",
  "Scores have fallen off quite a bit. Worth reviewing the list from scratch.",
  "That's a steep dip — might help to slow down and review before quizzing again.",
  "A significant drop here. Don't worry, just revisit the list before jumping back in.",
];

function pickRandom(options: string[]): string {
  return options[Math.floor(Math.random() * options.length)];
}

// Compares the average of the earliest two scores against the average of
// the latest two — a simple enough signal to compute client-side, with no
// need for a separate AI call just to describe a trend.
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
