import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shared } from "@/constants/styles";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { userId, email, isLoading, logout } = useAuth();

  return (
    <View style={[shared.screenCentered, styles.container]}>
      <Text style={styles.title}>LangReps</Text>
      <Text style={styles.subtitle}>
        Build a vocab list, then let AI generate an adaptive quiz for it.
      </Text>

      {!isLoading && (
        <View style={styles.authRow}>
          {userId ? (
            <>
              <Text style={shared.hint}>Signed in as {email}</Text>
              <Pressable onPress={logout}>
                <Text style={styles.authLink}>Log Out</Text>
              </Pressable>
            </>
          ) : (
            <Link href="/login" style={styles.authLink}>
              Log In / Sign Up
            </Link>
          )}
        </View>
      )}

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
  authRow: {
    alignItems: "center",
    gap: 4,
  },
  authLink: {
    color: colors.primary,
    fontWeight: "600",
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
});
