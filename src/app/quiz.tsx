import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ProgressBar } from "@/components/progress-bar";
import { colors, shared } from "@/constants/styles";
import { useQuiz } from "@/lib/quiz-context";

export default function Quiz() {
  const router = useRouter();
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
      <Link href="/" style={styles.backLink}>
        <Text>← Back to Home</Text>
      </Link>

      <ProgressBar progress={currentIndex / total} />

      <Text style={[shared.hint, styles.centerText]}>
        Question {currentIndex + 1} of {total}
      </Text>

      <View style={styles.body}>
        <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

        {phase === "question" ? (
          <>
            <TextInput
              style={[shared.input, styles.answerInput]}
              placeholder="Your answer"
              value={answer}
              onChangeText={setAnswer}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={shared.primaryButton} onPress={handleSubmit}>
              <Text style={shared.primaryButtonText}>Submit</Text>
            </Pressable>
            <Pressable style={shared.backLink} onPress={skipQuestion}>
              <Text style={styles.skipButtonText}>Skip this question</Text>
            </Pressable>
            <Pressable style={shared.backLink} onPress={() => setShowWordList((v) => !v)}>
              <Text style={styles.skipButtonText}>
                {showWordList ? "Hide word list" : "Stuck? See the word list"}
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
            <Text style={styles.centerText}>Your answer: {lastAnswer}</Text>
            {wasCorrect ? (
              <Text style={[styles.correct, styles.centerText]}>That&apos;s correct!</Text>
            ) : (
              <Text style={[styles.incorrect, styles.centerText]}>
                Sorry, that&apos;s incorrect. The answer was: {currentQuestion.correct_answer}
              </Text>
            )}
            <Pressable style={shared.primaryButton} onPress={handleNext}>
              <Text style={shared.primaryButtonText}>
                {currentIndex + 1 >= total ? "Finish Quiz" : "Next Question"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: {
    alignSelf: "center",
    paddingVertical: 8,
  },
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
