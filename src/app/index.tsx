import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LangReps</Text>
      <Text style={styles.subtitle}>
        Build a vocab list, then let AI generate an adaptive quiz for it.
      </Text>

      <View style={styles.buttonGroup}>
        <Link href="/add-words" style={styles.button}>
          <Text style={styles.buttonText}>Add Words Manually</Text>
        </Link>
        <Link href="/generate-quiz" style={styles.button}>
          <Text style={styles.buttonText}>Generate Quiz</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
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
});
