import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shared } from "@/constants/styles";
import { useAuth } from "@/lib/auth-context";
import { getHasSeenOnboarding } from "@/lib/settings-storage";

export default function Home() {
  const router = useRouter();
  const { userId, email, isLoading, logout, deleteAccount } = useAuth();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    getHasSeenOnboarding().then((seen) => {
      if (!seen) router.replace("/onboarding");
    });
  }, [router]);

  function confirmDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your account and all your saved lists. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleteError(null);
            try {
              await deleteAccount();
            } catch (e) {
              setDeleteError(e instanceof Error ? e.message : "Something went wrong.");
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[shared.screenCentered, styles.container]}>
      <Text style={styles.title}>LangReps</Text>
      <Text style={styles.subtitle}>
        Build a vocab list, then let AI generate an adaptive quiz for it.
      </Text>

      {/* Device-local, not account-bound, so shown regardless of auth state. */}
      <Link href="/settings" style={styles.authLink}>
        Settings
      </Link>

      {!isLoading && (
        <View style={styles.authRow}>
          {userId ? (
            <>
              <Text style={shared.hint}>Signed in as {email}</Text>
              <Pressable onPress={logout}>
                <Text style={styles.authLink}>Log Out</Text>
              </Pressable>
              <Pressable onPress={confirmDeleteAccount}>
                <Text style={styles.deleteLink}>Delete Account</Text>
              </Pressable>
              {deleteError && <Text style={shared.errorText}>{deleteError}</Text>}
            </>
          ) : (
            <Link href="/login" style={[styles.authLink, shared.linkText]}>
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
        {userId && (
          <>
            <Link href="/my-lists" style={[shared.primaryButton, shared.generateQuizButton]}>
              <Text style={shared.primaryButtonText}>My Lists</Text>
            </Link>
            <Link href="/my-quizzes" style={[shared.primaryButton, shared.generateQuizButton]}>
              <Text style={shared.primaryButtonText}>My Quizzes</Text>
            </Link>
          </>
        )}
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
    color: colors.tertiary,
    fontWeight: "600",
  },
  deleteLink: {
    color: colors.error,
    fontWeight: "600",
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
});
