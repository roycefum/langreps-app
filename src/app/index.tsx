import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LanguageForm } from "@/components/language-form";
import { ModeChip } from "@/components/mode-chip";
import { PressButton } from "@/components/press-button";
import { WobbleTitle } from "@/components/wobble-title";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { inMode, useMode } from "@/lib/mode-context";
import {
  getContinuedAsGuest,
  getHasSeenOnboarding,
  hasShownOnboardingThisLaunch,
  markOnboardingShownThisLaunch,
} from "@/lib/settings-storage";
import { useStartNewList } from "@/lib/use-new-list";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const { userId, email, isLoading, logout } = useAuth();
  const { isLoaded: modeLoaded, mode, setMode } = useMode();

  const startFreshList = useStartNewList();

  // Whether there are saved quizzes to come back to: a guest never has any
  // and a new account has none until a first quiz.
  // The last answer is remembered across visits to Home (keyed by account and
  // language mode), so coming back from another screen shows the right state
  // at once instead of re-checking from "none".
  const quizzesKey = `${userId ?? ""}|${mode?.sourceLanguage}|${mode?.targetLanguage}`;
  const [hasQuizzes, setHasQuizzesState] = useState(knownHasQuizzes.get(quizzesKey) ?? false);
  const setHasQuizzes = useCallback(
    (found: boolean) => {
      knownHasQuizzes.set(quizzesKey, found);
      setHasQuizzesState(found);
    },
    [quizzesKey]
  );
  useEffect(() => {
    setHasQuizzesState(knownHasQuizzes.get(quizzesKey) ?? false);
  }, [quizzesKey]);
  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setHasQuizzes(false);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          const [lists, active, completed] = await Promise.all([
            apiRequest<{ lists: { id: string; source_language: string; target_language: string }[] }>("/lists"),
            apiRequest<{ sessions: { list_id: string }[] }>("/quiz-sessions"),
            apiRequest<{ sessions: { list_id: string }[] }>("/quiz-sessions/completed"),
          ]);
          const modeListIds = new Set(lists.lists.filter((l) => inMode(mode, l)).map((l) => l.id));
          const found = [...active.sessions, ...completed.sessions].some((s) => modeListIds.has(s.list_id));
          if (!cancelled) setHasQuizzes(found);
        } catch {
          // can't tell — leave the button as it was
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [userId, mode, setHasQuizzes])
  );

  // Hides Home until the checks below settle, so it never flashes before a
  // redirect to the intro or the welcome screen.
  const [ready, setReady] = useState(false);

  // First launch flow: the intro, then the welcome screen (log in / sign up
  // or continue without an account), then Home. The intro shows once per app
  // launch until permanently dismissed ("Don't show again" on the intro
  // itself). The in-memory flag keeps this from redirecting again the moment
  // Home remounts after the intro is dismissed for this launch — without it
  // the intro would loop forever.
  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;
    (async () => {
      const seenOnboarding = await getHasSeenOnboarding();
      if (cancelled) return;
      if (!seenOnboarding && !hasShownOnboardingThisLaunch()) {
        markOnboardingShownThisLaunch();
        router.replace("/onboarding");
        return;
      }
      if (!userId && !(await getContinuedAsGuest())) {
        if (!cancelled) router.replace("/welcome");
        return;
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, isLoading, router]);

  // First run: pick the language mode, then land on Essentials — the
  // quickest way to a first quiz.
  async function handleChooseMode(source: string, target: string) {
    await setMode(source, target);
    router.push({ pathname: "/lists", params: { tab: "essentials" } });
  }

  if (!ready) return <View style={shared.screenCentered} />;

  // First run, after the welcome screen: just the language setup.
  if (modeLoaded && !mode) {
    return (
      <View style={[shared.screenCentered, styles.container]}>
        <WobbleTitle>{t("app_name")}</WobbleTitle>
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>{t("setup_title")}</Text>
          <Text style={shared.hint}>{t("setup_hint")}</Text>
          <LanguageForm submitLabel={t("setup_continue")} onSubmit={handleChooseMode} />
        </View>
      </View>
    );
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

      {/* A guest's way in, tucked into the corner opposite settings so Home
          stays just the actions. */}
      {!isLoading && !userId && (
        <Link href="/login" style={styles.loginLink}>
          <Text style={styles.loginLinkText}>{t("log_in_sign_up")}</Text>
        </Link>
      )}

      <WobbleTitle>{t("app_name")}</WobbleTitle>
      <Text style={styles.subtitle}>{t("home_subtitle")}</Text>

      {mode && <ModeChip />}

      {mode && (
        <View style={styles.buttonGroup}>
          <PressButton style={shared.primaryButton} onPress={startFreshList}>
            <Text style={styles.homeButtonText}>{t("add_words_manually")}</Text>
          </PressButton>
          {/* Shown to everyone — it holds both the learner's own lists and the
              Essentials, which anyone can quiz; saving progress is what asks
              for an account. */}
          <Link href="/lists" asChild>
            <PressButton style={libraryButtonStyle}>
              <Text style={styles.homeButtonText}>{t("lists")}</Text>
            </PressButton>
          </Link>
          {/* One button that always works: "Take a Quiz" (straight to the
              Essentials) until there are saved quizzes to come back to, then
              "Quizzes". Never grayed out, so it can't pop in late. */}
          {hasQuizzes ? (
            <Link href="/my-quizzes" asChild>
              <PressButton style={quizzesButtonStyle}>
                <Text style={styles.homeButtonText}>{t("my_quizzes")}</Text>
              </PressButton>
            </Link>
          ) : (
            <Link href={{ pathname: "/lists", params: { tab: "essentials" } }} asChild>
              <PressButton style={quizzesButtonStyle}>
                <Text style={styles.homeButtonText}>{t("take_a_quiz_button")}</Text>
              </PressButton>
            </Link>
          )}
        </View>
      )}

      {/* Signed-in status sits below the actions, out of the way. A guest
          sees nothing here and signs up from the corner link or Settings. */}
      {!isLoading && userId && (
        <View style={styles.authRow}>
          {/* Signed-in status and its one directly related action (log out)
              share a row. */}
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
        </View>
      )}
    </View>
  );
}

// Flattened because Link asChild's Slot rejects an array of styles on its child.
const libraryButtonStyle = StyleSheet.flatten([shared.primaryButton, shared.generateQuizButton]);
// Whether each account + language mode had saved quizzes the last time Home checked.
const knownHasQuizzes = new Map<string, boolean>();

const quizzesButtonStyle = StyleSheet.flatten([
  shared.primaryButton,
  { backgroundColor: colors.tertiary, borderBottomColor: colors.tertiaryShadow },
]);

const styles = StyleSheet.create({
  homeButtonText: {
    ...shared.primaryButtonText,
    fontSize: 22,
  },
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
  loginLink: {
    position: "absolute",
    top: 10,
    left: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.accent,
    overflow: "hidden",
  },
  loginLinkText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  settingsIcon: {
    fontSize: 28,
    color: colors.tertiary,
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
