import { Link, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { usePairs } from "@/lib/pairs-context";
import {
  getHasSeenOnboarding,
  hasShownOnboardingThisLaunch,
  markOnboardingShownThisLaunch,
} from "@/lib/settings-storage";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const { userId, email, isLoading, logout } = useAuth();
  const { clearPairs } = usePairs();

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

  // Onboarding must always win for a first-time user, and the Settings
  // redirect below must never fire before it. These used to be two
  // independent effects — one reading local device storage, the other
  // hitting the network — and whichever resolved LAST called
  // router.replace on top of the other, so the outcome was a coin flip.
  // The network check had a cancellation guard for this exact race but
  // the onboarding check didn't, so a fast /me/profile response could
  // silently skip onboarding entirely (more likely on Android, where a
  // first-time secure-storage read can be slower than the network).
  // Running them in one sequence, gated on the onboarding check
  // finishing first, makes the order deterministic instead of racy.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seenOnboarding = await getHasSeenOnboarding();
      if (cancelled) return;
      // Shown once per app launch until permanently dismissed ("Don't show
      // again" on the intro itself). The in-memory flag is what keeps this
      // from redirecting again the moment Home remounts after the intro is
      // dismissed for this launch — without it the intro would loop
      // forever. Falling through (instead of returning) once it's been
      // shown this launch is deliberate: a first-time logged-in user still
      // needs to reach the Settings redirect below afterward.
      if (!seenOnboarding && !hasShownOnboardingThisLaunch()) {
        markOnboardingShownThisLaunch();
        router.replace("/onboarding");
        return;
      }

      // Forces a first-ever-logged-in user (or one who closed the app
      // before finishing) straight to Settings to pick a learning pair —
      // checked on every login, not just right after signup, since they
      // might not have gotten to it the first time. Anonymous users have
      // no server-side profile at all, so this only runs once actually
      // logged in.
      if (isLoading || !userId) return;
      try {
        const profile = await apiRequest<{ learning_target_language: string | null }>(
          "/me/profile"
        );
        if (!cancelled && !profile.learning_target_language) {
          router.replace("/settings");
        }
      } catch {
        // best-effort — a failed check just means no redirect this time
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, isLoading, router]);

  return (
    <View style={[shared.screenCentered, styles.container]}>
      {/* Always visible regardless of auth state — settings are
          device-local, not account-bound. Pulled out of the auth block
          into its own corner so it reads as a real navigation control,
          not just another line of small text. */}
      <Link href="/settings" style={styles.settingsButton}>
        <Text style={styles.settingsIcon}>⚙</Text>
      </Link>

      <Text style={styles.title}>{t("app_name")}</Text>
      <Text style={styles.subtitle}>{t("home_subtitle")}</Text>

      {!isLoading && (
        <View style={styles.authRow}>
          {userId ? (
            <>
              {/* Signed-in status and its one directly related action (log
                  out) share a row, first — everything else here is
                  secondary to "who am I and how do I leave." */}
              <View style={styles.signedInRow}>
                <Text style={shared.hint}>
                  {t("signed_in_as", { email: "" })}
                  <Text style={styles.emailBold}>{email}</Text>
                </Text>
                <Pressable onPress={logout} hitSlop={8}>
                  <Text style={styles.authLink}>{t("log_out")}</Text>
                </Pressable>
              </View>
              {__DEV__ && (
                <Link href="/test-data" style={styles.authLink}>
                  Test data
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/login" asChild>
                <PressButton style={loginButtonStyle}>
                  <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
                    {t("log_in_sign_up")}
                  </Text>
                </PressButton>
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
            <Link href="/my-lists" asChild>
              <PressButton style={libraryButtonStyle}>
                <Text style={shared.primaryButtonText}>{t("my_lists")}</Text>
              </PressButton>
            </Link>
            <Link href="/my-quizzes" asChild>
              <PressButton style={libraryButtonStyle}>
                <Text style={shared.primaryButtonText}>{t("my_quizzes")}</Text>
              </PressButton>
            </Link>
          </>
        )}
      </View>
    </View>
  );
}

// Flattened because Link asChild's Slot rejects an array of styles on its child.
const libraryButtonStyle = StyleSheet.flatten([shared.primaryButton, shared.generateQuizButton]);
const loginButtonStyle = StyleSheet.flatten([
  shared.secondaryButton,
  { backgroundColor: colors.accent, borderBottomColor: colors.accentShadow, alignSelf: "stretch" as const },
]);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 24,
  },
  settingsButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 6,
  },
  settingsIcon: {
    fontSize: 28,
    color: colors.tertiary,
  },
  title: {
    fontSize: 44,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  authRow: {
    alignItems: "center",
    gap: 6,
    alignSelf: "stretch",
  },
  signedInRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
});
