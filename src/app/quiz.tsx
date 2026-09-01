import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
    <View style={shared.screenCentered}>
      <Link href="/" style={styles.backLink}>
        <Text>← Back to Home</Text>
      </Link>

      <Text style={[shared.hint, styles.centerText]}>
        Question {currentIndex + 1} of {total}
      </Text>

      <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

      {phase === "question" ? (
        <>
          <TextInput
            style={shared.input}
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
  );
}

const styles = StyleSheet.create({
  backLink: {
    position: "absolute",
    top: 24,
    left: 24,
  },
  centerText: {
    textAlign: "center",
  },
  questionText: {
    fontSize: 20,
    textAlign: "center",
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
