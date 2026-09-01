import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { apiRequest } from "@/lib/api";
import { usePairs } from "@/lib/pairs-context";
import { useQuiz } from "@/lib/quiz-context";
import { chunk } from "@/lib/text";
import { DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE, type Question } from "@/lib/types";

const BATCH_SIZE = 5;

export default function GenerateQuiz() {
  const router = useRouter();
  const { pairs } = usePairs();
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
            source_language: DEFAULT_SOURCE_LANGUAGE,
            target_language: DEFAULT_TARGET_LANGUAGE,
            batch_size: c.length,
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
    <View style={styles.container}>
      <Text style={styles.title}>Generate Quiz</Text>

      {pairs.length < 3 ? (
        <Text style={styles.info}>You need at least 3 words to generate a quiz.</Text>
      ) : (
        <Text style={styles.info}>{pairs.length} words ready.</Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {isGenerating ? (
        <View style={styles.generating}>
          <ActivityIndicator size="large" />
          <Text>Generating your quiz…</Text>
        </View>
      ) : (
        <Pressable
          style={[styles.button, pairs.length < 3 && styles.buttonDisabled]}
          disabled={pairs.length < 3}
          onPress={handleGenerate}
        >
          <Text style={styles.buttonText}>Generate Quiz</Text>
        </Pressable>
      )}

      <Link href="/" style={styles.backLink}>
        <Text>← Back to Home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  info: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  error: {
    color: "#c0392b",
    textAlign: "center",
  },
  generating: {
    alignItems: "center",
    gap: 12,
  },
  button: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  backLink: {
    alignSelf: "center",
    paddingVertical: 8,
  },
});
