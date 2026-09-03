import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CefrLevelPicker } from "@/components/cefr-level-picker";
import { LanguageSummary } from "@/components/language-picker";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePairs, type VocabPair } from "@/lib/pairs-context";
import { useQuiz } from "@/lib/quiz-context";
import { getDefaultCefrLevel } from "@/lib/settings-storage";
import { chunk, sample } from "@/lib/text";
import { DEFAULT_CEFR_LEVEL, type CefrLevel, type Question } from "@/lib/types";

const BATCH_SIZE = 5;
const DEFAULT_QUIZ_LENGTH = 15;

export default function GenerateQuiz() {
  const router = useRouter();
  const { pairs, sourceLanguage, targetLanguage, savedListId, listName } = usePairs();
  const { userId } = useAuth();
  const { startQuiz } = useQuiz();
  const [countText, setCountText] = useState(String(Math.min(pairs.length, DEFAULT_QUIZ_LENGTH)));
  // Defaults from Settings (device-local), but changing it here only
  // affects this one quiz — it's never written back to the stored default.
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>(DEFAULT_CEFR_LEVEL);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDefaultCefrLevel().then(setCefrLevel);
  }, []);

  const requestedCount = Math.max(1, Math.min(parseInt(countText, 10) || 1, pairs.length));

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      // If this list is saved, let the backend pick which pairs to quiz —
      // weighted toward ones this user has gotten wrong before, so
      // requizzing the same list leans more toward weak words over time.
      // An unsaved/ad-hoc list has no attempt history to weight by, so it's
      // just a plain random sample.
      let selectedPairs: VocabPair[];
      if (userId && savedListId) {
        const result = await apiRequest<{
          pairs: { id: string; source_term: string; target_term: string }[];
        }>(`/lists/${savedListId}/quiz-pairs?count=${requestedCount}`);
        selectedPairs = result.pairs.map((p) => ({
          id: p.id,
          "source word": p.source_term,
          "target word": p.target_term,
        }));
      } else {
        selectedPairs = sample(pairs, requestedCount);
      }

      const chunks = chunk(selectedPairs, BATCH_SIZE);
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

      // A quiz session only makes sense for a saved list (quiz_sessions.list_id
      // isn't nullable server-side) — building an unsaved, ad-hoc list stays
      // purely ephemeral even while logged in.
      let sessionId: string | null = null;
      if (userId && savedListId) {
        const session = await apiRequest<{ session_id: string }>("/quiz-sessions", {
          method: "POST",
          body: { list_id: savedListId, questions: allQuestions },
        });
        sessionId = session.session_id;
      }

      startQuiz(allQuestions, sessionId);
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
        <>
          <Text style={[shared.hint, styles.centerText]}>{pairs.length} words in this list.</Text>
          <View style={styles.countRow}>
            <Text style={shared.hint}>How many questions?</Text>
            <TextInput
              style={[shared.input, styles.countInput]}
              value={countText}
              onChangeText={setCountText}
              keyboardType="number-pad"
            />
          </View>
        </>
      )}

      <Text style={[shared.hint, styles.centerText, styles.listNameText]}>
        Generating from: {listName ?? "Unsaved list"}
      </Text>
      <LanguageSummary />
      <CefrLevelPicker value={cefrLevel} onChange={setCefrLevel} />

      {error && <Text style={[shared.errorText, styles.centerText]}>{error}</Text>}

      {isGenerating ? (
        <View style={styles.generating}>
          <ActivityIndicator size="large" />
          <Text>Generating your quiz…</Text>
        </View>
      ) : (
        <Pressable
          style={[
            shared.primaryButton,
            shared.generateQuizButton,
            pairs.length < 3 && shared.primaryButtonDisabled,
          ]}
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
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  countInput: {
    width: 64,
    textAlign: "center",
  },
  generating: {
    alignItems: "center",
    gap: 12,
  },
  listNameText: {
    fontWeight: "600",
  },
});
