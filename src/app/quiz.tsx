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

export default function Quiz() {
  const router = useRouter();
  const { t } = useI18n();
  const { targetLanguage } = usePairs();
  const { questions, currentIndex, phase, lastAnswer, wasCorrect, isComplete, submitAnswer, skipQuestion, nextQuestion } =
    useQuiz();
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
              <Text style={styles.centerText}>{t("your_answer_was", { answer: lastAnswer })}</Text>
              {wasCorrect ? (
                <Text style={[styles.correct, styles.centerText]}>✓ {t("correct_feedback")}</Text>
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
  questionText: {
    fontSize: 20,
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
  correct: {
    color: colors.success,
    fontSize: 16,
    fontWeight: "600",
  },
  incorrect: {
    color: colors.error,
    fontSize: 16,
    fontWeight: "600",
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
