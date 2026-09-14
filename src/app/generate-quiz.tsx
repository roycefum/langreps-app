import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { BackButton } from "@/components/back-button";
import { CefrLevelPicker } from "@/components/cefr-level-picker";
import { Dropdown } from "@/components/dropdown";
import { LanguageSummary } from "@/components/language-picker";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePairs, type VocabPair } from "@/lib/pairs-context";
import { useQuiz } from "@/lib/quiz-context";
import { getAdaptiveQuizzesEnabled, getDefaultCefrLevel } from "@/lib/settings-storage";
import { chunk, dedupePairs, displayListName, sample } from "@/lib/text";
import { DEFAULT_CEFR_LEVEL, TENSES_BY_LANGUAGE, type CefrLevel, type Question } from "@/lib/types";

const MIXED_TENSE_LABEL = "Mixed";

const BATCH_SIZE = 5;
const DEFAULT_QUIZ_LENGTH = 15;

type QuizInsight = {
  message: string | null;
  targetedPairIds: string[];
};

export default function GenerateQuiz() {
  const router = useRouter();
  const { pairs, sourceLanguage, targetLanguage, listType, savedListId, listName } = usePairs();
  const { userId } = useAuth();
  const { startQuiz } = useQuiz();
  const [countText, setCountText] = useState(String(Math.min(pairs.length, DEFAULT_QUIZ_LENGTH)));
  // Defaults from Settings (device-local), but changing it here only
  // affects this one quiz — it's never written back to the stored default.
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>(DEFAULT_CEFR_LEVEL);
  // Only meaningful for a "Verb" list — defaults to that language's present
  // tense (the first entry in TENSES_BY_LANGUAGE) rather than "Mixed", since
  // present tense is the most useful starting point for most learners.
  const [verbTense, setVerbTense] = useState<string | null>(
    () => TENSES_BY_LANGUAGE[targetLanguage]?.[0]?.value ?? null
  );
  // Vocab-only reversed-direction mode — shows the target word and asks for
  // its source-language translation. Not offered for verb lists.
  const [flip, setFlip] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<QuizInsight | null>(null);

  const tenseOptions = TENSES_BY_LANGUAGE[targetLanguage] ?? [];
  const tenseLabels = [MIXED_TENSE_LABEL, ...tenseOptions.map((t) => t.label)];
  const selectedTenseLabel =
    tenseOptions.find((t) => t.value === verbTense)?.label ?? MIXED_TENSE_LABEL;

  useEffect(() => {
    getDefaultCefrLevel().then(setCefrLevel);
  }, []);

  // Fetched once per list, using the default quiz length — not tied to
  // later edits to countText, so typing in the count field doesn't fire
  // repeat Gemini calls. Only runs at all when adaptive quizzes are
  // enabled in Settings, and only shows anything once the backend confirms
  // there's enough wrong-answer history for a real pattern (see
  // MIN_WRONG_ATTEMPTS_FOR_INSIGHT/MIN_DISTINCT_MISSED_WORDS_FOR_INSIGHT
  // in api/main.py).
  useEffect(() => {
    if (!userId || !savedListId) return;
    let cancelled = false;
    (async () => {
      const adaptiveEnabled = await getAdaptiveQuizzesEnabled();
      if (!adaptiveEnabled || cancelled) return;
      try {
        const initialCount = Math.max(1, Math.min(pairs.length, DEFAULT_QUIZ_LENGTH));
        const result = await apiRequest<{
          available: boolean;
          message: string | null;
          targeted_pair_ids: string[];
        }>(`/lists/${savedListId}/quiz-insight?count=${initialCount}`);
        if (!cancelled && result.available) {
          setInsight({ message: result.message, targetedPairIds: result.targeted_pair_ids });
        }
      } catch {
        // best-effort — insight is a nice-to-have, never blocks quiz generation
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, savedListId, pairs.length]);

  const requestedCount = Math.max(1, Math.min(parseInt(countText, 10) || 1, pairs.length));

  async function handleGenerate(mode: "similar" | "targeted" = "similar") {
    setIsGenerating(true);
    setError(null);
    try {
      let selectedPairs: VocabPair[];
      if (mode === "targeted" && insight) {
        // Reuses the pair ids from the insight call already made when this
        // screen loaded — no second Gemini call needed. If the requested
        // count was raised since then, or fewer targeted pairs exist than
        // requested, fill the rest from the remainder of the list.
        const targetedIds = new Set(insight.targetedPairIds);
        const targeted = pairs.filter((p) => p.id && targetedIds.has(p.id));
        if (targeted.length >= requestedCount) {
          selectedPairs = targeted.slice(0, requestedCount);
        } else {
          const remaining = dedupePairs(pairs.filter((p) => !p.id || !targetedIds.has(p.id)));
          selectedPairs = [
            ...targeted,
            ...sample(remaining, requestedCount - targeted.length),
          ];
        }
      } else if (userId && savedListId) {
        // Weighted toward previously-wrong pairs — see
        // select_quiz_pairs_for_list()'s docstring for the formula. This is
        // what makes requizzing the same list "get smarter" over time even
        // without picking "Target My Mistakes" specifically.
        const result = await apiRequest<{
          pairs: { id: string; source_term: string; target_term: string }[];
        }>(`/lists/${savedListId}/quiz-pairs?count=${requestedCount}`);
        selectedPairs = result.pairs.map((p) => ({
          id: p.id,
          "source word": p.source_term,
          "target word": p.target_term,
        }));
      } else {
        // Unsaved/ad-hoc list — no attempt history to weight by.
        selectedPairs = sample(dedupePairs(pairs), requestedCount);
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
            verb_tense: listType === "Verb" ? verbTense : null,
            flip: listType === "Vocab" && flip,
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
          body: {
            list_id: savedListId,
            questions: allQuestions,
            verb_tense: listType === "Verb" ? verbTense : null,
          },
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={[shared.screenCentered, styles.container]}>
      <BackButton href="/" />
      <Text style={[shared.title, styles.centerText]}>Generate Quiz</Text>
      <Text style={[styles.centerText, styles.listNameHeading]}>
        {listName ? displayListName(listName) : "Unsaved list"}
      </Text>

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

      <LanguageSummary />
      <CefrLevelPicker value={cefrLevel} onChange={setCefrLevel} />

      {listType === "Vocab" && (
        <View style={styles.countRow}>
          <Text style={shared.hint}>
            Flip: translate {targetLanguage} → {sourceLanguage}
          </Text>
          <Switch value={flip} onValueChange={setFlip} />
        </View>
      )}

      {listType === "Verb" && tenseOptions.length > 0 && (
        <View style={styles.countRow}>
          <Text style={shared.hint}>Tense</Text>
          <Dropdown
            value={selectedTenseLabel}
            onChange={(label) => {
              if (label === MIXED_TENSE_LABEL) {
                setVerbTense(null);
                return;
              }
              const match = tenseOptions.find((t) => t.label === label);
              setVerbTense(match ? match.value : null);
            }}
            options={tenseLabels}
          />
        </View>
      )}

      {error && <Text style={[shared.errorText, styles.centerText]}>{error}</Text>}

      {insight?.message && !isGenerating && (
        <Text style={[shared.hint, styles.centerText, styles.insightMessage]}>
          {insight.message}
        </Text>
      )}

      {isGenerating ? (
        <View style={styles.generating}>
          <ActivityIndicator size="large" />
          <Text>Generating your quiz…</Text>
        </View>
      ) : insight?.message ? (
        <>
          <Pressable
            style={[
              shared.primaryButton,
              shared.generateQuizButton,
              pairs.length < 3 && shared.primaryButtonDisabled,
            ]}
            disabled={pairs.length < 3}
            onPress={() => handleGenerate("targeted")}
          >
            <Text style={shared.primaryButtonText}>Target My Mistakes</Text>
          </Pressable>
          <Pressable
            style={[shared.secondaryButton, pairs.length < 3 && shared.primaryButtonDisabled]}
            disabled={pairs.length < 3}
            onPress={() => handleGenerate("similar")}
          >
            <Text style={shared.secondaryButtonText}>Generate Similar Quiz</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          style={[
            shared.primaryButton,
            shared.generateQuizButton,
            pairs.length < 3 && shared.primaryButtonDisabled,
          ]}
          disabled={pairs.length < 3}
          onPress={() => handleGenerate("similar")}
        >
          <Text style={shared.primaryButtonText}>Generate Quiz</Text>
        </Pressable>
      )}
    </View>
    </TouchableWithoutFeedback>
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
  listNameHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.generateQuiz,
  },
  insightMessage: {
    fontWeight: "600",
    fontStyle: "italic",
  },
});
