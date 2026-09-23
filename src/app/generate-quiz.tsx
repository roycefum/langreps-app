import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import { BackButton } from "@/components/back-button";
import { CefrLevelPicker } from "@/components/cefr-level-picker";
import { Dropdown } from "@/components/dropdown";
import { InsightCard, InsightSkeleton } from "@/components/insight-card";
import { LanguageSummary } from "@/components/language-picker";
import { ProgressBar } from "@/components/progress-bar";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LOCALE_NAMES, useI18n } from "@/lib/i18n";
import { usePairs, type VocabPair } from "@/lib/pairs-context";
import { useQuiz } from "@/lib/quiz-context";
import { getAdaptiveQuizzesEnabled, getLanguagePairSettings } from "@/lib/settings-storage";
import { chunk, dedupePairs, displayListName, sample } from "@/lib/text";
import { DEFAULT_CEFR_LEVEL, TENSES_BY_LANGUAGE, type CefrLevel, type Question } from "@/lib/types";

const BATCH_SIZE = 5;
const DEFAULT_QUIZ_LENGTH = 15;

type QuizInsight = {
  message: string | null;
  // Real "typed → correct" answers from the last quiz that the message is
  // based on, built server-side (not quoted by the AI).
  examples: string[];
  // One sentence telling the question writer what skill to exercise — sent
  // only with a "Target My Mistakes" quiz. Null when the AI sees no clear
  // pattern.
  focus: string | null;
  targetedPairIds: string[];
};

export default function GenerateQuiz() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { pairs, sourceLanguage, targetLanguage, listType, savedListId, listName } = usePairs();
  const { userId } = useAuth();
  const { startQuiz } = useQuiz();
  const [countText, setCountText] = useState(String(Math.min(pairs.length, DEFAULT_QUIZ_LENGTH)));
  // Defaults from Settings' per-language pair settings (device-local), but
  // changing it here only affects this one quiz — it's never written back
  // to the stored default.
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
  const [insightLoading, setInsightLoading] = useState(false);
  // Questions written so far, out of the total this quiz needs — drives the
  // real progress shown while generating.
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const tenseOptions = TENSES_BY_LANGUAGE[targetLanguage] ?? [];
  const tenseLabels = [t("mixed_tense"), ...tenseOptions.map((tense) => tense.label)];
  const selectedTenseLabel =
    tenseOptions.find((tense) => tense.value === verbTense)?.label ?? t("mixed_tense");

  useEffect(() => {
    getLanguagePairSettings(sourceLanguage, targetLanguage).then((settings) =>
      setCefrLevel(settings.cefrLevel)
    );
  }, [sourceLanguage, targetLanguage]);

  // Fetched fresh each time this screen opens, using the default quiz length
  // — not tied to later edits to countText, so typing in the count field
  // doesn't fire repeat Gemini calls. Only runs at all when adaptive
  // quizzes are enabled in Settings, and only shows anything once the
  // backend confirms the list's last completed quiz had enough wrong
  // answers to analyze (see MIN_WRONG_ANSWERS_FOR_INSIGHT in api/main.py).
  useEffect(() => {
    if (!userId || !savedListId) return;
    let cancelled = false;
    (async () => {
      const adaptiveEnabled = await getAdaptiveQuizzesEnabled();
      if (!adaptiveEnabled || cancelled) return;
      setInsightLoading(true);
      try {
        const initialCount = Math.max(1, Math.min(pairs.length, DEFAULT_QUIZ_LENGTH));
        const result = await apiRequest<{
          available: boolean;
          message: string | null;
          examples: string[];
          focus: string | null;
          targeted_pair_ids: string[];
        }>(
          `/lists/${savedListId}/quiz-insight?count=${initialCount}&language=${LOCALE_NAMES[locale]}`
        );
        if (!cancelled && result.available) {
          setInsight({
            message: result.message,
            examples: result.examples,
            focus: result.focus,
            targetedPairIds: result.targeted_pair_ids,
          });
        }
      } catch {
        // best-effort — insight is a nice-to-have, never blocks quiz generation
      } finally {
        if (!cancelled) setInsightLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, savedListId, pairs.length]);

  const requestedCount = Math.max(1, Math.min(parseInt(countText, 10) || 1, pairs.length));

  async function handleGenerate(mode: "similar" | "targeted" = "similar") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
      // No-op on platforms/devices without haptic support (e.g. web).
    });
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
        // A plain random spread — deliberately no weighting toward past
        // mistakes; only Target My Mistakes does that. Fetched from the
        // server (not sampled here) so the pairs carry their database ids,
        // which quiz attempts are recorded against.
        const result = await apiRequest<{
          pairs: { id: string; source_term: string; target_term: string }[];
        }>(`/lists/${savedListId}/quiz-pairs?count=${requestedCount}`);
        selectedPairs = result.pairs.map((p) => ({
          id: p.id,
          "source word": p.source_term,
          "target word": p.target_term,
        }));
      } else {
        // Unsaved/ad-hoc list — same plain random spread, sampled locally.
        selectedPairs = sample(dedupePairs(pairs), requestedCount);
      }

      const chunks = chunk(selectedPairs, BATCH_SIZE);
      const allQuestions: Question[] = [];
      setProgress({ done: 0, total: selectedPairs.length });
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
            // Distinguishes "verb-shaped pair, tested as an ordinary word"
            // (a Vocab list) from "verb-shaped pair, conjugate it" (a Verb
            // list) — verb_tense alone can't tell these apart, since it's
            // null for both a Vocab list and a Verb list set to "Mixed".
            list_type: listType.toLowerCase(),
            // Only Target My Mistakes writes questions around the pattern —
            // ordinary quizzes are a plain random spread.
            focus: mode === "targeted" ? insight?.focus ?? null : null,
          },
        });
        allQuestions.push(...result);
        setProgress({ done: allQuestions.length, total: selectedPairs.length });
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

      startQuiz(allQuestions, sessionId, sourceLanguage, targetLanguage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
        // No-op on platforms/devices without haptic support (e.g. web).
      });
      router.push("/quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_generating_quiz"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
        // No-op on platforms/devices without haptic support (e.g. web).
      });
    } finally {
      setIsGenerating(false);
    }
  }

  const generatingBlock = (
    <View style={styles.generating}>
      <Text>
        {progress.total > 0
          ? t("generating_progress", { done: progress.done, total: progress.total })
          : t("generating_quiz")}
      </Text>
      <View style={styles.generatingBar}>
        <ProgressBar progress={progress.total > 0 ? progress.done / progress.total : 0} height={20} />
      </View>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={shared.screen}>
      <BackButton href="back" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.centeredContent, styles.container]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
      <Text style={[shared.title, styles.centerText]}>
        {insight?.message ? t("feedback_title") : t("generate_quiz_title")}
      </Text>
      <Text style={[styles.centerText, styles.listNameHeading]}>
        {listName ? displayListName(listName) : t("unsaved_list")}
      </Text>

      {pairs.length < 3 ? (
        <Text style={[shared.hint, styles.centerText]}>{t("min_words_warning")}</Text>
      ) : (
        <Text style={[shared.hint, styles.centerText]}>
          {t("words_in_list", { n: pairs.length })}
        </Text>
      )}

      {insightLoading && !insight?.message && <InsightSkeleton />}

      {insight?.message && <InsightCard message={insight.message} examples={insight.examples} />}

      {pairs.length >= 3 && (
        <Animated.View style={styles.optionsRow} layout={LinearTransition}>
          <View style={styles.countField}>
            <Text style={shared.fieldLabel}>{t("how_many_questions")}</Text>
            <TextInput
              style={[shared.input, styles.countInput]}
              value={countText}
              onChangeText={setCountText}
              keyboardType="number-pad"
            />
          </View>
          {listType === "Verb" && tenseOptions.length > 0 && (
            <View style={styles.tenseField}>
              <Text style={shared.fieldLabel}>{t("tense_label")}</Text>
              <Dropdown
                value={selectedTenseLabel}
                onChange={(label) => {
                  if (label === t("mixed_tense")) {
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
        </Animated.View>
      )}

      <Animated.View layout={LinearTransition}>
        <LanguageSummary />
      </Animated.View>
      <Animated.View layout={LinearTransition}>
        <CefrLevelPicker value={cefrLevel} onChange={setCefrLevel} />
      </Animated.View>

      {listType === "Vocab" && (
        <Animated.View style={styles.countRow} layout={LinearTransition}>
          <Text style={shared.fieldLabel}>
            {t("flip_toggle_label", { target: targetLanguage, source: sourceLanguage })}
          </Text>
          <Switch
            value={flip}
            onValueChange={(v) => {
              Haptics.selectionAsync().catch(() => {});
              setFlip(v);
            }}
          />
        </Animated.View>
      )}

      {error && <Text style={[shared.errorText, styles.centerText]}>{error}</Text>}

      <Animated.View style={styles.actions} layout={LinearTransition}>
      {isGenerating ? (
        generatingBlock
      ) : insight?.message ? (
        <>
          <PressButton
            style={[
              shared.primaryButton,
              shared.generateQuizButton,
              pairs.length < 3 && shared.primaryButtonDisabled,
            ]}
            disabled={pairs.length < 3}
            onPress={() => handleGenerate("targeted")}
          >
            <Text style={shared.primaryButtonText}>{t("target_my_mistakes")}</Text>
          </PressButton>
          <PressButton
            style={[shared.secondaryButton, pairs.length < 3 && shared.primaryButtonDisabled]}
            disabled={pairs.length < 3}
            onPress={() => handleGenerate("similar")}
          >
            <Text style={shared.secondaryButtonText}>{t("generate_similar_quiz")}</Text>
          </PressButton>
        </>
      ) : (
        <PressButton
          style={[
            shared.primaryButton,
            shared.generateQuizButton,
            pairs.length < 3 && shared.primaryButtonDisabled,
          ]}
          disabled={pairs.length < 3}
          onPress={() => handleGenerate("similar")}
        >
          <Text style={shared.primaryButtonText}>{t("generate_quiz_title")}</Text>
        </PressButton>
      )}
      </Animated.View>
      </ScrollView>
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  // flexGrow (not flex) so short content stays vertically centered but a
  // taller screen — e.g. with the insight card showing — can scroll.
  centeredContent: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 16,
  },
  container: {
    alignItems: "stretch",
  },
  centerText: {
    textAlign: "center",
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  countField: {
    gap: 4,
  },
  tenseField: {
    flex: 1,
    gap: 4,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  countInput: {
    minHeight: 52,
    width: 64,
    textAlign: "center",
  },
  generating: {
    alignItems: "center",
    gap: 12,
  },
  generatingBar: {
    alignSelf: "stretch",
  },
  actions: {
    gap: 16,
  },
  listNameHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.generateQuiz,
  },
});
