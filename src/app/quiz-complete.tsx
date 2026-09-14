import { Link, useRouter } from "expo-router";
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
// this fills in with a substantive score-based message instead of a bare
// one-liner, including a concrete next-step suggestion.
function cannedFeedback(correct: number, total: number): string {
  if (total === 0) return "";
  const pct = correct / total;
  if (pct >= 0.9) {
    return "You show mastery of the material and a good understanding of the concepts. You recall these words well and have successfully added them to your vocabulary. Keep up the good work — we suggest upping the CEFR level or training on a new list.";
  }
  if (pct >= 0.7) {
    return "You have a solid grasp of this list — most of these words are sticking. A few are still slipping through, so one more pass at this level should lock them in before you move up or take on a new list.";
  }
  if (pct >= 0.4) {
    return "You're recognizing some of these words, but a good chunk aren't sticking yet. That's normal at this stage — stick with this list at the same level for now rather than adding new words.";
  }
  return "This list is still tripping you up more than not — that's useful information, not a setback. Try lowering the CEFR level or running a shorter, more focused quiz on just this list before moving on.";
}

export default function QuizComplete() {
  const router = useRouter();
  const { questions, correctCount, resetQuiz, sessionId } = useQuiz();
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
      {sessionId && (
        <Link href={{ pathname: "/quiz-results", params: { sessionId } }} style={shared.linkText}>
          See Full Results
        </Link>
      )}
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
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
    minHeight: 20,
  },
});
