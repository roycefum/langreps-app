import { Link, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { Confetti } from "@/components/confetti";
import { InsightCard } from "@/components/insight-card";
import { PressButton } from "@/components/press-button";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LOCALE_NAMES, useI18n } from "@/lib/i18n";
import { usePairs } from "@/lib/pairs-context";
import { useQuiz } from "@/lib/quiz-context";

// Shown when the quiz that just finished doesn't have enough wrong answers
// for a real AI pattern (see MIN_WRONG_ANSWERS_FOR_INSIGHT in
// api/main.py) — a quiz should never end with no feedback at all, so
// this fills in with a substantive score-based message instead of a bare
// one-liner, including a concrete next-step suggestion. Returns a
// translation key, not display text — pass it through t() before showing.
function cannedFeedbackKey(correct: number, total: number): string {
  if (total === 0) return "";
  const pct = correct / total;
  if (pct >= 0.9) return "canned_feedback_mastery";
  if (pct >= 0.7) return "canned_feedback_solid";
  if (pct >= 0.4) return "canned_feedback_building";
  return "canned_feedback_struggling";
}

// Counts 0 → target over ~900ms so the score lands rather than just appears.
function useCountUp(target: number, durationMs = 900): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(0);
  const skip = reduceMotion || target === 0;
  useEffect(() => {
    if (skip) return;
    const start = Date.now();
    let frame: number;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, skip]);
  return skip ? target : value;
}

export default function QuizComplete() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { questions, correctCount, resetQuiz, sessionId } = useQuiz();
  const { clearPairs, savedListId } = usePairs();
  const { userId } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  // Real "typed → correct" answers behind the tailored message — empty for the
  // generic score-based fallback.
  const [examples, setExamples] = useState<string[]>([]);
  const shownCorrect = useCountUp(correctCount);
  // A small burst for a strong result only (90%+).
  const celebrate = questions.length > 0 && correctCount / questions.length >= 0.9;

  useEffect(() => {
    if (celebrate) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [celebrate]);

  useEffect(() => {
    let cancelled = false;
    const fallbackKey = cannedFeedbackKey(correctCount, questions.length);
    const fallback = fallbackKey ? t(fallbackKey) : "";

    if (!userId || !savedListId) {
      setFeedback(fallback);
      return;
    }

    (async () => {
      try {
        const result = await apiRequest<{
          available: boolean;
          message: string | null;
          examples: string[];
        }>(`/lists/${savedListId}/quiz-insight?count=1&language=${LOCALE_NAMES[locale]}`);
        if (cancelled) return;
        if (result.available && result.message) {
          setFeedback(result.message);
          setExamples(result.examples);
        } else {
          setFeedback(fallback);
        }
      } catch {
        if (!cancelled) setFeedback(fallback);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, savedListId, correctCount, questions.length]);

  function handleBackToHome() {
    resetQuiz();
    clearPairs();
    router.replace("/");
  }

  return (
    <View style={[shared.screenCentered, styles.container]}>
      {celebrate && <Confetti />}
      <Text style={styles.title}>{t("quiz_complete_title")}</Text>
      <Text style={styles.score}>
        {t("score_correct", { n: shownCorrect, total: questions.length })}
      </Text>
      {feedback ? <InsightCard message={feedback} examples={examples} /> : null}
      {sessionId && (
        <Link href={{ pathname: "/quiz-results", params: { sessionId } }} style={shared.linkText}>
          {t("see_full_results")}
        </Link>
      )}
      <PressButton style={shared.primaryButton} onPress={handleBackToHome}>
        <Text style={shared.primaryButtonText}>{t("back_to_home")}</Text>
      </PressButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  score: {
    fontSize: 20,
    opacity: 0.8,
  },
});
