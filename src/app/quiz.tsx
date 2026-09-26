import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import Animated, { FadeIn, FadeInRight } from "react-native-reanimated";

import { AnswerFeedback } from "@/components/answer-feedback";
import { BackButton } from "@/components/back-button";
import { ProgressBar } from "@/components/progress-bar";
import { SpeakButton } from "@/components/speak-button";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";
import { usePairs } from "@/lib/pairs-context";
import { useQuiz } from "@/lib/quiz-context";
import { removeAccents } from "@/lib/text";
import { TENSES_BY_LANGUAGE } from "@/lib/types";

export default function Quiz() {
  const router = useRouter();
  const { t } = useI18n();
  const { targetLanguage } = usePairs();
  const {
    questions,
    currentIndex,
    phase,
    lastAnswer,
    wasCorrect,
    isComplete,
    submitAnswer,
    skipQuestion,
    nextQuestion,
  } = useQuiz();
  const [answer, setAnswer] = useState("");
  const [showWordList, setShowWordList] = useState(false);
  const answerInputRef = useRef<TextInput>(null);

  // Every possible answer in this quiz, for the optional "stuck?" reveal —
  // an occasionally-ambiguous question can still be figured out by
  // elimination against the actual word list, and there's no way to game
  // yourself out of actually learning the words.
  const wordList = useMemo(
    () => [...new Set(questions.map((q) => q.correct_answer))].sort((a, b) => a.localeCompare(b)),
    [questions]
  );

  useEffect(() => {
    if (isComplete) {
      router.replace("/quiz-complete");
    }
  }, [isComplete, router]);

  if (isComplete || questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentIndex];
  const total = questions.length;
  const currentTenseLabel = currentQuestion.tense
    ? TENSES_BY_LANGUAGE[targetLanguage]?.find((tense) => tense.value === currentQuestion.tense)?.label
    : null;

  function handleSubmit() {
    submitAnswer(answer);
  }

  async function handleNext() {
    setAnswer("");
    setShowWordList(false);
    await nextQuestion();
  }

  return (
    // Tap-anywhere-to-dismiss, same pattern as login.tsx and
    // generate-quiz.tsx — Keyboard.dismiss() alone hides the keyboard view
    // but doesn't reliably blur the focused TextInput on every device, so
    // it could pop back. Wrapping the whole screen catches that generally,
    // and the "stuck?" button also blurs the input directly (see below).
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    {/* Padding-mode avoidance lifts the whole screen above the keyboard so
        Submit is never covered; the question sits near the top for the same
        reason (see styles.body). */}
    <KeyboardAvoidingView style={shared.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackButton href="/" />

      <ProgressBar progress={currentIndex / total} />

      <Text style={[shared.hint, styles.centerText]}>
        {t("question_n_of_total", { n: currentIndex + 1, total })}
      </Text>

      {/* Keyed by question so each new question slides in fresh. */}
      <Animated.View key={currentIndex} style={styles.body} entering={FadeInRight.duration(260)}>
        {/* Verb quizzes are a single tense the learner is told up front —
            the sentence itself carries no time clue for it. Null for
            vocab/flip questions, so nothing renders there. */}
        {currentTenseLabel && <Text style={styles.tenseLabel}>{currentTenseLabel}</Text>}
        <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

        {phase === "question" ? (
          <>
            <TextInput
              ref={answerInputRef}
              style={[shared.input, styles.answerInput]}
              placeholder={t("your_answer_placeholder")}
              placeholderTextColor={colors.placeholder}
              value={answer}
              onChangeText={setAnswer}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />
            <PressButton style={shared.primaryButton} onPress={handleSubmit}>
              <Text style={shared.primaryButtonText}>{t("submit")}</Text>
            </PressButton>
            <Pressable style={shared.backLink} onPress={skipQuestion}>
              <Text style={styles.skipButtonText}>{t("skip_question")}</Text>
            </Pressable>
            <Pressable style={shared.backLink} onPress={() => {
                // Drop the keyboard so the list isn't hidden behind it.
                // Keyboard.dismiss() alone hides the keyboard view but
                // doesn't reliably blur the input on every device/OS —
                // blur it directly too so it can't silently pop back.
                if (!showWordList) {
                  answerInputRef.current?.blur();
                  Keyboard.dismiss();
                }
                setShowWordList((v) => !v);
              }}>
              <Text style={styles.skipButtonText}>
                {showWordList ? t("hide_word_list") : t("stuck_see_word_list")}
              </Text>
            </Pressable>
            {showWordList && (
              <ScrollView style={styles.wordList}>
                <Text style={styles.centerText}>{wordList.join(", ")}</Text>
              </ScrollView>
            )}
          </>
        ) : (
          <Animated.View style={styles.feedbackBlock} entering={FadeIn.duration(200)}>
            <AnswerFeedback correct={wasCorrect}>
              <Text style={[styles.yourAnswer, styles.centerText]}>
                {t("your_answer_was", { answer: lastAnswer })}
              </Text>
              {wasCorrect ? (
                <>
                  <Text style={[styles.correct, styles.centerText]}>✓ {t("correct_feedback")}</Text>
                  {/* Graded correct, but what was typed still differs from the
                      real spelling (ignoring case) — which can only be
                      because accents are being ignored. Counted as right,
                      but the real spelling is shown with just the accented
                      letters picked out, so the accent isn't silently never
                      learned. No sentence explaining it — the highlight
                      does the talking. */}
                  {lastAnswer.trim().toLowerCase() !== currentQuestion.correct_answer.trim().toLowerCase() && (
                    <Text style={[styles.accentAnswer, styles.centerText]}>
                      {[...currentQuestion.correct_answer.normalize("NFC")].map((char, i) => (
                        <Text key={i} style={removeAccents(char) !== char ? styles.accentLetter : undefined}>
                          {char}
                        </Text>
                      ))}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[styles.incorrect, styles.centerText]}>
                  {t("incorrect_feedback", { answer: currentQuestion.correct_answer })}
                </Text>
              )}
            </AnswerFeedback>
            {/* Assumes the correct answer is in targetLanguage — not
                accounted for the "flip" reversed-direction mode, which
                isn't tracked past Generate Quiz. Worst case a flipped quiz
                pronounces with the wrong accent, not a crash. */}
            <View style={styles.pronounceRow}>
              <SpeakButton text={currentQuestion.correct_answer} language={targetLanguage} />
            </View>
            <PressButton style={shared.primaryButton} onPress={handleNext}>
              <Text style={shared.primaryButtonText}>
                {currentIndex + 1 >= total ? t("finish_quiz") : t("next_question")}
              </Text>
            </PressButton>
          </Animated.View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 32,
    gap: 16,
  },
  centerText: {
    textAlign: "center",
  },
  tenseLabel: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.accentShadow,
  },
  questionText: {
    fontSize: 24,
    textAlign: "center",
  },
  answerInput: {
    fontSize: 24,
    textAlign: "center",
    paddingVertical: 14,
  },
  skipButtonText: {
    opacity: 0.6,
  },
  // Bigger and bolder than the rest of the feedback block — this is
  // exactly where a dropped or wrong accent needs to actually be visible,
  // and the previous size (inherited default text, ~14px) was too small
  // to tell "jugabamos" from "jugábamos" at a glance.
  yourAnswer: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
  },
  correct: {
    color: colors.success,
    fontSize: 19,
    fontWeight: "800",
  },
  incorrect: {
    color: colors.error,
    fontSize: 19,
    fontWeight: "800",
  },
  // Shown under a correct answer when accents were ignored in grading — the
  // real spelling gets the same large, bold treatment as the rest of the
  // feedback, with only the accented letters colored and underlined.
  accentAnswer: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    marginTop: 4,
  },
  accentLetter: {
    color: colors.accentShadow,
    textDecorationLine: "underline",
  },
  wordList: {
    maxHeight: 100,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    padding: 12,
  },
  feedbackBlock: {
    gap: 16,
  },
  pronounceRow: {
    alignItems: "center",
  },
});
