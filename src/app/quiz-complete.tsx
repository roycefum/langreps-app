import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { shared } from "@/constants/styles";
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
    <View style={[shared.screenCentered, styles.container]}>
      <Text style={styles.title}>Quiz Complete!</Text>
      <Text style={styles.score}>
        {correctCount} / {questions.length} correct
      </Text>
      <Pressable style={shared.primaryButton} onPress={handleBackToHome}>
        <Text style={shared.primaryButtonText}>Back to Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  score: {
    fontSize: 20,
    opacity: 0.8,
  },
});
