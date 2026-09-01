import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
    <View style={styles.container}>
      <Link href="/" style={styles.backLink}>
        <Text>← Back to Home</Text>
      </Link>

      <Text style={styles.progress}>
        Question {currentIndex + 1} of {total}
      </Text>

      <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

      {phase === "question" ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Your answer"
            value={answer}
            onChangeText={setAnswer}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Submit</Text>
          </Pressable>
          <Pressable style={styles.skipButton} onPress={skipQuestion}>
            <Text style={styles.skipButtonText}>Skip this question</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.answerLabel}>Your answer: {lastAnswer}</Text>
          {wasCorrect ? (
            <Text style={styles.correct}>That&apos;s correct!</Text>
          ) : (
            <Text style={styles.incorrect}>
              Sorry, that&apos;s incorrect. The answer was: {currentQuestion.correct_answer}
            </Text>
          )}
          <Pressable style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Next Question</Text>
          </Pressable>
        </>
      )}
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
  backLink: {
    position: "absolute",
    top: 24,
    left: 24,
  },
  progress: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
  questionText: {
    fontSize: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipButtonText: {
    opacity: 0.6,
  },
  answerLabel: {
    fontSize: 16,
    textAlign: "center",
  },
  correct: {
    color: "#27ae60",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  incorrect: {
    color: "#c0392b",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
