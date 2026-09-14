import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shared } from "@/constants/styles";

// The very first thing a new user sees, before the onboarding slides —
// plain branding, not another explainer. Slides handle "how it works";
// this just says what app they're in and moves them forward.
export default function Welcome() {
  const router = useRouter();

  return (
    <View style={[shared.screenCentered, styles.container]}>
      <View style={styles.brand}>
        <Text style={styles.title}>LangReps</Text>
        <Text style={styles.tagline}>Language reps that stick.</Text>
      </View>

      <Pressable
        style={[shared.primaryButton, shared.generateQuizButton, styles.button]}
        onPress={() => router.replace("/onboarding")}
      >
        <Text style={shared.primaryButtonText}>Get Started</Text>
      </Pressable>

      <Text style={styles.copyright}>© 2026 MarApps Development</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    alignItems: "center",
    gap: 8,
    marginBottom: 48,
  },
  title: {
    fontSize: 44,
    fontWeight: "700",
    color: colors.text,
  },
  tagline: {
    fontSize: 15,
    color: colors.text,
    opacity: 0.65,
  },
  button: {
    alignSelf: "stretch",
  },
  copyright: {
    position: "absolute",
    bottom: 20,
    right: 24,
    fontSize: 11,
    color: colors.text,
    opacity: 0.45,
  },
});
