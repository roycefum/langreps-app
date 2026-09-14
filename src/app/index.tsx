import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, shared } from "@/constants/styles";
import { useAuth } from "@/lib/auth-context";
import { usePairs } from "@/lib/pairs-context";
import { getHasSeenOnboarding } from "@/lib/settings-storage";

export default function Home() {
  const router = useRouter();
  const { userId, email, isLoading, logout, deleteAccount } = useAuth();
  const { clearPairs } = usePairs();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // pairs-context is one shared "list currently being built," so it
  // persists across navigation by design (that's what lets My Lists'
  // "Edit" preload a list into Add Words). But entering a builder screen
  // from Home should always start fresh — otherwise backing out of an
  // Edit session and opening a different builder screen would silently
  // keep showing the list you were editing.
  function startFreshList(route: "/add-words" | "/paste-text" | "/upload-file") {
    clearPairs();
    router.push(route);
  }

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
        Build a vocab list, then generate an adaptive quiz for it.
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
            <>
              <Link href="/login" style={[styles.authLink, shared.linkText]}>
                Log In / Sign Up
              </Link>
              <Text style={[shared.hint, styles.centerText]}>
                Sign up to save your lists and track your progress over time
              </Text>
            </>
          )}
        </View>
      )}

      <View style={styles.buttonGroup}>
        <Pressable style={shared.primaryButton} onPress={() => startFreshList("/add-words")}>
          <Text style={shared.primaryButtonText}>Add Words Manually</Text>
        </Pressable>
        <Pressable style={shared.primaryButton} onPress={() => startFreshList("/paste-text")}>
          <Text style={shared.primaryButtonText}>Paste Vocab List</Text>
        </Pressable>
        <Pressable style={shared.primaryButton} onPress={() => startFreshList("/upload-file")}>
          <Text style={shared.primaryButtonText}>Upload a File</Text>
        </Pressable>
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
  centerText: {
    textAlign: "center",
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
