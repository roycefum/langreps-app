import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { usePairs } from "@/lib/pairs-context";
import { getHasSeenOnboarding } from "@/lib/settings-storage";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const { userId, email, isLoading, logout, deleteAccount } = useAuth();
  const { clearPairs } = usePairs();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // pairs-context is one shared "list currently being built," so it
  // persists across navigation by design (that's what lets My Lists'
  // tapping a saved list in My Lists loads it into List Details). But
  // entering a builder screen from Home should always start fresh —
  // otherwise backing out of a List Details session and opening a
  // different builder screen would silently keep showing that list.
  function startFreshList(route: "/list-details" | "/paste-text" | "/upload-file") {
    clearPairs();
    router.push(route);
  }

  useEffect(() => {
    getHasSeenOnboarding().then((seen) => {
      if (!seen) router.replace("/onboarding");
    });
  }, [router]);

  // Forces a first-ever-logged-in user (or one who closed the app before
  // finishing) straight to Settings to pick a learning pair — checked on
  // every login, not just right after signup, since they might not have
  // gotten to it the first time. Anonymous users have no server-side
  // profile at all, so this only runs once actually logged in.
  useEffect(() => {
    if (isLoading || !userId) return;
    let cancelled = false;
    apiRequest<{ learning_target_language: string | null }>("/me/profile")
      .then((profile) => {
        if (!cancelled && !profile.learning_target_language) {
          router.replace("/settings");
        }
      })
      .catch(() => {
        // best-effort — a failed check just means no redirect this time
      });
    return () => {
      cancelled = true;
    };
  }, [userId, isLoading, router]);

  function confirmDeleteAccount() {
    Alert.alert(
      t("delete_account"),
      t("delete_account_confirm"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            setDeleteError(null);
            try {
              await deleteAccount();
            } catch (e) {
              setDeleteError(e instanceof Error ? e.message : t("error_generic"));
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[shared.screenCentered, styles.container]}>
      <Text style={styles.title}>{t("app_name")}</Text>
      <Text style={styles.subtitle}>{t("home_subtitle")}</Text>

      {/* Device-local, not account-bound, so shown regardless of auth state. */}
      <Link href="/settings" style={styles.authLink}>
        {t("settings_link")}
      </Link>

      {!isLoading && (
        <View style={styles.authRow}>
          {userId ? (
            <>
              <Text style={shared.hint}>
                {t("signed_in_as", { email: "" })}
                <Text style={styles.emailBold}>{email}</Text>
              </Text>
              <Pressable onPress={logout}>
                <Text style={styles.authLink}>{t("log_out")}</Text>
              </Pressable>
              <Pressable onPress={confirmDeleteAccount}>
                <Text style={styles.deleteLink}>{t("delete_account")}</Text>
              </Pressable>
              {deleteError && <Text style={shared.errorText}>{deleteError}</Text>}
              {__DEV__ && (
                <Link href="/test-data" style={styles.authLink}>
                  Test data
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/login" style={[styles.authLink, shared.linkText]}>
                {t("log_in_sign_up")}
              </Link>
              <Text style={[shared.hint, styles.centerText]}>{t("signup_incentive_hint")}</Text>
            </>
          )}
        </View>
      )}

      <View style={styles.buttonGroup}>
        <PressButton style={shared.primaryButton} onPress={() => startFreshList("/list-details")}>
          <Text style={shared.primaryButtonText}>{t("add_words_manually")}</Text>
        </PressButton>
        <PressButton style={shared.primaryButton} onPress={() => startFreshList("/paste-text")}>
          <Text style={shared.primaryButtonText}>{t("paste_vocab_list")}</Text>
        </PressButton>
        <PressButton style={shared.primaryButton} onPress={() => startFreshList("/upload-file")}>
          <Text style={shared.primaryButtonText}>{t("upload_a_file")}</Text>
        </PressButton>
        {userId && (
          <>
            <Link href="/my-lists" style={[shared.primaryButton, shared.generateQuizButton]}>
              <Text style={shared.primaryButtonText}>{t("my_lists")}</Text>
            </Link>
            <Link href="/my-quizzes" style={[shared.primaryButton, shared.generateQuizButton]}>
              <Text style={shared.primaryButtonText}>{t("my_quizzes")}</Text>
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
  emailBold: {
    fontWeight: "700",
    color: colors.text,
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
