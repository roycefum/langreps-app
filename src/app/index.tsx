import { Link, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LanguageForm } from "@/components/language-form";
import { ModeChip } from "@/components/mode-chip";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useMode } from "@/lib/mode-context";
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
  const { clearPairs, setSourceLanguage, setTargetLanguage } = usePairs();
  const { isLoaded: modeLoaded, mode, setMode } = useMode();

  // pairs-context is one shared "list currently being built," so it
  // persists across navigation by design (that's what lets My Lists'
  // tapping a saved list in My Lists loads it into List Details). But
  // entering a builder screen from Home should always start fresh —
  // otherwise backing out of a List Details session and opening a
  // different builder screen would silently keep showing that list.
  function startFreshList(route: "/list-details" | "/paste-text") {
    clearPairs();
    // A new list starts in the active language mode.
    if (mode) {
      setSourceLanguage(mode.sourceLanguage);
      setTargetLanguage(mode.targetLanguage);
    }
    router.push(route);
  }

  // The intro shows once per app launch until permanently dismissed ("Don't
  // show again" on the intro itself). The in-memory flag keeps this from
  // redirecting again the moment Home remounts after the intro is dismissed
  // for this launch — without it the intro would loop forever.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seenOnboarding = await getHasSeenOnboarding();
      if (cancelled) return;
      if (!seenOnboarding && !hasShownOnboardingThisLaunch()) {
        markOnboardingShownThisLaunch();
        router.replace("/onboarding");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // First run: pick the language mode, then land on Essentials — the
  // quickest way to a first quiz.
  async function handleChooseMode(source: string, target: string) {
    await setMode(source, target);
    router.push({ pathname: "/lists", params: { tab: "essentials" } });
  }

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

      {modeLoaded && !mode && (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>{t("setup_title")}</Text>
          <Text style={shared.hint}>{t("setup_hint")}</Text>
          <LanguageForm submitLabel={t("setup_continue")} onSubmit={handleChooseMode} />
        </View>
      )}

      {mode && <ModeChip />}

      {mode && (
        <View style={styles.buttonGroup}>
          <PressButton style={shared.primaryButton} onPress={() => startFreshList("/list-details")}>
            <Text style={shared.primaryButtonText}>{t("add_words_manually")}</Text>
          </PressButton>
          <PressButton style={shared.primaryButton} onPress={() => startFreshList("/paste-text")}>
            <Text style={shared.primaryButtonText}>{t("paste_vocab_list")}</Text>
          </PressButton>
          {/* Shown to everyone — it holds both the learner's own lists and the
              Essentials, which anyone can quiz; saving progress is what asks
              for an account. */}
          <Link href="/lists" asChild>
            <PressButton style={libraryButtonStyle}>
              <Text style={shared.primaryButtonText}>{t("lists")}</Text>
            </PressButton>
          </Link>
          {userId && (
            <Link href="/my-quizzes" asChild>
              <PressButton style={libraryButtonStyle}>
                <Text style={shared.primaryButtonText}>{t("my_quizzes")}</Text>
              </PressButton>
            </Link>
          )}
        </View>
      )}
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
  setupCard: {
    alignSelf: "stretch",
    gap: 12,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    padding: 16,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
});
