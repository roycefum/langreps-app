import { Link, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { CefrLevelPicker } from "@/components/cefr-level-picker";
import { Dropdown } from "@/components/dropdown";
import { shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LOCALE_FLAGS, LOCALES, LOCALE_LABELS, useI18n, type Locale } from "@/lib/i18n";
import {
  getAdaptiveQuizzesEnabled,
  getAutoDeleteOldQuizzes,
  getDefaultCefrLevel,
  getRequireAccents,
  setAdaptiveQuizzesEnabled,
  setAutoDeleteOldQuizzes,
  setDefaultCefrLevel,
  setRequireAccents,
} from "@/lib/settings-storage";
import {
  DEFAULT_CEFR_LEVEL,
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  LANGUAGES,
  type CefrLevel,
} from "@/lib/types";

function localeOptionLabel(locale: Locale): string {
  return `${LOCALE_FLAGS[locale]}  ${LOCALE_LABELS[locale]}`;
}

const LOCALE_OPTIONS = LOCALES.map(localeOptionLabel);

export default function Settings() {
  const { locale, setLocale, t } = useI18n();
  const { userId } = useAuth();
  const [level, setLevel] = useState<CefrLevel>(DEFAULT_CEFR_LEVEL);
  const [autoDelete, setAutoDelete] = useState(false);
  const [adaptiveQuizzes, setAdaptiveQuizzes] = useState(true);
  const [requireAccents, setRequireAccentsState] = useState(false);
  // Null until the profile fetch resolves — the pickers stay hidden until
  // then rather than flashing a default pair that might not match what's
  // actually saved server-side.
  const [learningSource, setLearningSource] = useState<string | null>(null);
  const [learningTarget, setLearningTarget] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    getDefaultCefrLevel().then(setLevel);
    getAutoDeleteOldQuizzes().then(setAutoDelete);
    getAdaptiveQuizzesEnabled().then(setAdaptiveQuizzes);
    getRequireAccents().then(setRequireAccentsState);
  }, []);

  useEffect(() => {
    if (!userId) return;
    apiRequest<{ learning_source_language: string | null; learning_target_language: string | null }>(
      "/me/profile"
    )
      .then((profile) => {
        setLearningSource(profile.learning_source_language ?? DEFAULT_SOURCE_LANGUAGE);
        setLearningTarget(profile.learning_target_language ?? DEFAULT_TARGET_LANGUAGE);
      })
      .catch(() => {
        // best-effort — the pickers just stay hidden if this fails
      });
  }, [userId]);

  // Saving triggers first-time sample-list generation server-side (see
  // PATCH /me/profile) — only the very first save ever does this, later
  // changes to the pair are just a preference update.
  async function saveLearningPair(source: string, target: string) {
    setIsSavingProfile(true);
    setProfileMessage(null);
    setProfileError(null);
    try {
      const result = await apiRequest<{ generated_sample_lists: boolean }>("/me/profile", {
        method: "PATCH",
        body: { source_language: source, target_language: target },
      });
      if (result.generated_sample_lists) {
        setProfileMessage(t("starter_lists_ready_message"));
      }
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : t("error_generic"));
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleLearningSourceChange(value: string) {
    setLearningSource(value);
    if (learningTarget) saveLearningPair(value, learningTarget);
  }

  function handleLearningTargetChange(value: string) {
    setLearningTarget(value);
    if (learningSource) saveLearningPair(learningSource, value);
  }

  async function handleChange(newLevel: CefrLevel) {
    setLevel(newLevel);
    await setDefaultCefrLevel(newLevel);
  }

  async function handleAutoDeleteChange(enabled: boolean) {
    setAutoDelete(enabled);
    await setAutoDeleteOldQuizzes(enabled);
  }

  async function handleAdaptiveQuizzesChange(enabled: boolean) {
    setAdaptiveQuizzes(enabled);
    await setAdaptiveQuizzesEnabled(enabled);
  }

  async function handleRequireAccentsChange(enabled: boolean) {
    setRequireAccentsState(enabled);
    await setRequireAccents(enabled);
  }

  function handleLocaleChange(label: string) {
    const next = LOCALES.find((l) => localeOptionLabel(l) === label);
    if (next) setLocale(next);
  }

  return (
    <View style={shared.screen}>
      {/* Blocks the native edge-swipe-back gesture too, not just the
          custom arrow below — same reasoning as BackButton's disabled
          prop: guarantee generation finishes before this screen can be
          left, not just usually finish in time. */}
      <Stack.Screen options={{ gestureEnabled: !isSavingProfile }} />
      <BackButton href="/" disabled={isSavingProfile} />
      <Text style={shared.title}>{t("settings_title")}</Text>

      <View style={styles.settingBlock}>
        <Text style={styles.settingTitle}>{t("app_language_title")}</Text>
        <Dropdown value={localeOptionLabel(locale)} onChange={handleLocaleChange} options={LOCALE_OPTIONS} />
      </View>

      {userId && learningSource && learningTarget && (
        <View style={styles.settingBlock}>
          <Text style={styles.settingTitle}>{t("learning_pair_title")}</Text>
          <Text style={shared.hint}>{t("learning_pair_hint")}</Text>
          <View style={styles.pairRow}>
            <View style={styles.pairField}>
              <Text style={shared.hint}>{t("from_label")}</Text>
              <Dropdown
                value={learningSource}
                onChange={handleLearningSourceChange}
                options={LANGUAGES}
                disabled={isSavingProfile}
              />
            </View>
            <View style={styles.pairField}>
              <Text style={shared.hint}>{t("to_label")}</Text>
              <Dropdown
                value={learningTarget}
                onChange={handleLearningTargetChange}
                options={LANGUAGES}
                disabled={isSavingProfile}
              />
            </View>
          </View>
          {isSavingProfile && <Text style={shared.hint}>{t("generating_starter_lists")}</Text>}
          {profileMessage && <Text style={shared.hint}>{profileMessage}</Text>}
          {profileError && <Text style={shared.errorText}>{profileError}</Text>}
        </View>
      )}

      <View style={styles.settingBlock}>
        <Text style={styles.settingTitle}>{t("default_level_title")}</Text>
        <Text style={shared.hint}>{t("default_level_hint")}</Text>
        <CefrLevelPicker value={level} onChange={handleChange} />
      </View>

      <View style={[shared.row, styles.settingBlock]}>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{t("adaptive_quizzes_title")}</Text>
          <Text style={shared.hint}>{t("adaptive_quizzes_desc")}</Text>
        </View>
        <Switch value={adaptiveQuizzes} onValueChange={handleAdaptiveQuizzesChange} />
      </View>

      <View style={[shared.row, styles.settingBlock]}>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{t("require_accents_title")}</Text>
          <Text style={shared.hint}>{t("require_accents_desc")}</Text>
        </View>
        <Switch value={requireAccents} onValueChange={handleRequireAccentsChange} />
      </View>

      <View style={[shared.row, styles.settingBlock]}>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{t("auto_delete_title")}</Text>
          <Text style={shared.hint}>{t("auto_delete_desc")}</Text>
        </View>
        <Switch value={autoDelete} onValueChange={handleAutoDeleteChange} />
      </View>

      <Link href="/onboarding" style={[shared.backLink, shared.linkText]}>
        {t("about_langreps_link")}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  settingBlock: {
    gap: 6,
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  pairRow: {
    flexDirection: "row",
    gap: 8,
  },
  pairField: {
    flex: 1,
    gap: 4,
  },
});
