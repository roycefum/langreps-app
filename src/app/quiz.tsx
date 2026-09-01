import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ProgressBar } from "@/components/progress-bar";
import { colors, shared } from "@/constants/styles";
import { useQuiz } from "@/lib/quiz-context";

export default function Quiz() {
  const router = useRouter();
  const { questions, currentIndex, phase, lastAnswer, wasCorrect, isComplete, submitAnswer, skipQuestion, nextQuestion } =
    useQuiz();
  const [answer, setAnswer] = useState("");

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
              <Text style={shared.primaryButtonText}>Next Question</Text>
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
});
