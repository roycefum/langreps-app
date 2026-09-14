import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePairs } from "@/lib/pairs-context";
import { useQuiz } from "@/lib/quiz-context";

// Shown when there's not yet enough missed-word history for a real AI
// pattern (see MIN_WRONG_ATTEMPTS_FOR_INSIGHT/MIN_DISTINCT_MISSED_WORDS_FOR_INSIGHT
// in api/main.py) — a quiz should never end with no feedback at all, so
// this fills in with a plain score-based message instead.
function cannedFeedback(correct: number, total: number): string {
  if (total === 0) return "";
  const pct = correct / total;
  if (pct === 1) return "Perfect score! This list is looking solid.";
  if (pct >= 0.8) return "Great work — you know this list well.";
  if (pct >= 0.5) return "Keep at it — repetition is what makes this stick.";
  return "This one's tough. A few more passes and it'll click.";
}

export default function QuizComplete() {
  const router = useRouter();
  const { questions, correctCount, resetQuiz } = useQuiz();
  const { clearPairs, savedListId } = usePairs();
  const { userId } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fallback = cannedFeedback(correctCount, questions.length);

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
      <Text style={styles.title}>Quiz Complete!</Text>
      <Text style={styles.score}>
        {correctCount} / {questions.length} correct
      </Text>
      <Text style={styles.feedback}>{feedback ?? " "}</Text>
      <Pressable style={shared.primaryButton} onPress={handleBackToHome}>
        <Text style={shared.primaryButtonText}>Back to Home</Text>
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
    fontWeight: "600",
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 16,
    minHeight: 20,
  },
});
