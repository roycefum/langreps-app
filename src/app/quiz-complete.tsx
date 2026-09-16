import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { usePairs } from "@/lib/pairs-context";
import { useQuiz } from "@/lib/quiz-context";

// Shown when there's not yet enough missed-word history for a real AI
// pattern (see MIN_WRONG_ATTEMPTS_FOR_INSIGHT/MIN_DISTINCT_MISSED_WORDS_FOR_INSIGHT
// in api/main.py) — a quiz should never end with no feedback at all, so
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

export default function QuizComplete() {
  const router = useRouter();
  const { t } = useI18n();
  const { questions, correctCount, resetQuiz, sessionId } = useQuiz();
  const { clearPairs, savedListId } = usePairs();
  const { userId } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);

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
        const result = await apiRequest<{ available: boolean; message: string | null }>(
          `/lists/${savedListId}/quiz-insight?count=1`
        );
        if (cancelled) return;
        setFeedback(result.available && result.message ? result.message : fallback);
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
      <Text style={styles.title}>{t("quiz_complete_title")}</Text>
      <Text style={styles.score}>
        {t("score_correct", { n: correctCount, total: questions.length })}
      </Text>
      <Text style={styles.feedback}>{feedback ?? " "}</Text>
      {sessionId && (
        <Link href={{ pathname: "/quiz-results", params: { sessionId } }} style={shared.linkText}>
          {t("see_full_results")}
        </Link>
      )}
      <Pressable style={shared.primaryButton} onPress={handleBackToHome}>
        <Text style={shared.primaryButtonText}>{t("back_to_home")}</Text>
      </Pressable>
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
  feedback: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
    minHeight: 20,
  },
});
