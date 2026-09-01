import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { usePairs } from "@/lib/pairs-context";
import { useQuiz } from "@/lib/quiz-context";

export default function QuizComplete() {
  const router = useRouter();
  const { questions, correctCount, resetQuiz } = useQuiz();
  const { clearPairs } = usePairs();

  function handleBackToHome() {
    resetQuiz();
    clearPairs();
    router.replace("/");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quiz Complete!</Text>
      <Text style={styles.score}>
        {correctCount} / {questions.length} correct
      </Text>
      <Pressable style={styles.button} onPress={handleBackToHome}>
        <Text style={styles.buttonText}>Back to Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  score: {
    fontSize: 20,
    opacity: 0.8,
  },
  button: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
