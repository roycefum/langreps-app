import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";

type Attempt = {
  question_text: string;
  user_answer: string;
  correct_answer: string;
  was_correct: boolean;
};

export default function QuizResults() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await apiRequest<{ attempts: Attempt[] }>(
          `/quiz-sessions/${sessionId}/attempts`
        );
        if (!cancelled) setAttempts(result.attempts);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Something went wrong loading results.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/quiz-complete" />
      <Text style={shared.title}>Full Results</Text>

      {error && <Text style={shared.errorText}>{error}</Text>}
      {isLoading && <Text style={shared.hint}>Loading…</Text>}

      {!isLoading && attempts.length === 0 && !error && (
        <Text style={shared.hint}>No recorded answers for this quiz.</Text>
      )}

      {attempts.map((attempt, i) => (
        <View
          key={i}
          style={[
            styles.row,
            attempt.was_correct ? styles.rowCorrect : styles.rowIncorrect,
          ]}
        >
          <Text style={styles.question}>{attempt.question_text}</Text>
          <View style={styles.answerLine}>
            <Text style={shared.hint}>Your answer: </Text>
            <Text style={[styles.answerText, attempt.was_correct ? styles.correctText : styles.incorrectText]}>
              {attempt.user_answer || "(blank)"}
            </Text>
          </View>
          {!attempt.was_correct && (
            <View style={styles.answerLine}>
              <Text style={shared.hint}>Correct answer: </Text>
              <Text style={[styles.answerText, styles.correctText]}>{attempt.correct_answer}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 32,
  },
  row: {
    borderRadius: 10,
    borderLeftWidth: 4,
    padding: 12,
    gap: 4,
    backgroundColor: colors.secondaryBackground,
  },
  rowCorrect: {
    borderLeftColor: colors.success,
  },
  rowIncorrect: {
    borderLeftColor: colors.error,
  },
  question: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  answerLine: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  answerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  correctText: {
    color: colors.success,
  },
  incorrectText: {
    color: colors.error,
  },
});
