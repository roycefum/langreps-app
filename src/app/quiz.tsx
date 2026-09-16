import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { ProgressBar } from "@/components/progress-bar";
import { colors, shared } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";
import { useQuiz } from "@/lib/quiz-context";

export default function Quiz() {
  const router = useRouter();
  const { t } = useI18n();
  const { questions, currentIndex, phase, lastAnswer, wasCorrect, isComplete, submitAnswer, skipQuestion, nextQuestion } =
    useQuiz();
  const [answer, setAnswer] = useState("");
  const [showWordList, setShowWordList] = useState(false);

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
    <View style={shared.screen}>
      <BackButton href="/" />

      <ProgressBar progress={currentIndex / total} />

      <Text style={[shared.hint, styles.centerText]}>
        {t("question_n_of_total", { n: currentIndex + 1, total })}
      </Text>

      <View style={styles.body}>
        <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

        {phase === "question" ? (
          <>
            <TextInput
              style={[shared.input, styles.answerInput]}
              placeholder={t("your_answer_placeholder")}
              placeholderTextColor={colors.placeholder}
              value={answer}
              onChangeText={setAnswer}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={shared.primaryButton} onPress={handleSubmit}>
              <Text style={shared.primaryButtonText}>{t("submit")}</Text>
            </Pressable>
            <Pressable style={shared.backLink} onPress={skipQuestion}>
              <Text style={styles.skipButtonText}>{t("skip_question")}</Text>
            </Pressable>
            <Pressable style={shared.backLink} onPress={() => setShowWordList((v) => !v)}>
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
          <>
            <Text style={styles.centerText}>{t("your_answer_was", { answer: lastAnswer })}</Text>
            {wasCorrect ? (
              <Text style={[styles.correct, styles.centerText]}>{t("correct_feedback")}</Text>
            ) : (
              <Text style={[styles.incorrect, styles.centerText]}>
                {t("incorrect_feedback", { answer: currentQuestion.correct_answer })}
              </Text>
            )}
            <Pressable style={shared.primaryButton} onPress={handleNext}>
              <Text style={shared.primaryButtonText}>
                {currentIndex + 1 >= total ? t("finish_quiz") : t("next_question")}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
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
});
