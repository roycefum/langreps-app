import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ListSettingsSummary } from "@/components/language-picker";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { usePairs } from "@/lib/pairs-context";
import { useQuiz } from "@/lib/quiz-context";
import { chunk } from "@/lib/text";
import type { Question } from "@/lib/types";

const BATCH_SIZE = 5;

export default function GenerateQuiz() {
  const router = useRouter();
  const { pairs, sourceLanguage, targetLanguage, cefrLevel } = usePairs();
  const { startQuiz } = useQuiz();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const chunks = chunk(pairs, BATCH_SIZE);
      const allQuestions: Question[] = [];
      for (const c of chunks) {
        const result = await apiRequest<Question[]>("/generate-questions", {
          method: "POST",
          body: {
            pairs: c,
            source_language: sourceLanguage,
            target_language: targetLanguage,
            batch_size: c.length,
            level: cefrLevel,
          },
        });
        allQuestions.push(...result);
      }
      // No quiz session created here — this is the anonymous, in-memory
      // flow. Session creation/resume is added once auth is wired up.
      startQuiz(allQuestions, null);
      router.push("/quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong generating your quiz.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <View style={[shared.screenCentered, styles.container]}>
      <Text style={[shared.title, styles.centerText]}>Generate Quiz</Text>

      {pairs.length < 3 ? (
        <Text style={[shared.hint, styles.centerText]}>
          You need at least 3 words to generate a quiz.
        </Text>
      ) : (
        <Text style={[shared.hint, styles.centerText]}>{pairs.length} words ready.</Text>
      )}

      <ListSettingsSummary />

      {error && <Text style={[shared.errorText, styles.centerText]}>{error}</Text>}

      {isGenerating ? (
        <View style={styles.generating}>
          <ActivityIndicator size="large" />
          <Text>Generating your quiz…</Text>
        </View>
      ) : (
        <Pressable
          style={[shared.primaryButton, pairs.length < 3 && shared.primaryButtonDisabled]}
          disabled={pairs.length < 3}
          onPress={handleGenerate}
        >
          <Text style={shared.primaryButtonText}>Generate Quiz</Text>
        </Pressable>
      )}

      <Link href="/" style={shared.backLink}>
        <Text>← Back to Home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "stretch",
  },
  centerText: {
    textAlign: "center",
  },
  generating: {
    alignItems: "center",
    gap: 12,
  },
});
