import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { shared } from "@/constants/styles";

export default function Home() {
  return (
    <View style={[shared.screenCentered, styles.container]}>
      <Text style={styles.title}>LangReps</Text>
      <Text style={styles.subtitle}>
        Build a vocab list, then let AI generate an adaptive quiz for it.
      </Text>

      <View style={styles.buttonGroup}>
        <Link href="/add-words" style={shared.primaryButton}>
          <Text style={shared.primaryButtonText}>Add Words Manually</Text>
        </Link>
        <Link href="/paste-text" style={shared.primaryButton}>
          <Text style={shared.primaryButtonText}>Paste Vocab List</Text>
        </Link>
        <Link href="/upload-file" style={shared.primaryButton}>
          <Text style={shared.primaryButtonText}>Upload a File</Text>
        </Link>
        <Link href="/upload-picture" style={shared.primaryButton}>
          <Text style={shared.primaryButtonText}>Share a Picture</Text>
        </Link>
        <Link href="/generate-quiz" style={shared.primaryButton}>
          <Text style={shared.primaryButtonText}>Generate Quiz</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
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
});
