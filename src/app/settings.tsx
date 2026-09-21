import { Link, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { CefrLevelPicker } from "@/components/cefr-level-picker";
import { Dropdown } from "@/components/dropdown";
import { colors, shared } from "@/constants/styles";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import {
  addLanguagePair,
  getAdaptiveQuizzesEnabled,
  getAutoDeleteOldQuizzes,
  getLanguagePairs,
  removeLanguagePair,
  setAdaptiveQuizzesEnabled,
  setAutoDeleteOldQuizzes,
  updateLanguagePairSettings,
  type LanguagePairSettings,
} from "@/lib/settings-storage";
import { DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE, LANGUAGES, type CefrLevel } from "@/lib/types";

export default function Settings() {
  const { t } = useI18n();
  const { userId } = useAuth();
  const [autoDelete, setAutoDelete] = useState(false);
  const [adaptiveQuizzes, setAdaptiveQuizzes] = useState(true);
  const [languagePairs, setLanguagePairsState] = useState<LanguagePairSettings[]>([]);
  const [newPairSource, setNewPairSource] = useState<string>(DEFAULT_SOURCE_LANGUAGE);
  const [newPairTarget, setNewPairTarget] = useState<string>(DEFAULT_TARGET_LANGUAGE);
  // isSavingProfile only covers the FIRST language pair ever added — that's
  // the one that syncs server-side and can trigger sample-list generation
  // (see handleAddLanguage). Every pair after that is a purely local
  // add, which is effectively instant.
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    getAutoDeleteOldQuizzes().then(setAutoDelete);
    getAdaptiveQuizzesEnabled().then(setAdaptiveQuizzes);
    getLanguagePairs().then(setLanguagePairsState);
  }, []);

  async function refreshLanguagePairs() {
    setLanguagePairsState(await getLanguagePairs());
  }

  // The very first pair a user ever adds also syncs to the server (PATCH
  // /me/profile) — that's what lifts the forced first-login redirect to
  // this screen and triggers one-time sample-list generation for that
  // pair (see index.tsx and core/sample_list_generator.py on the
  // backend). Every pair after the first is purely local: CEFR level and
  // accent leniency are device preferences, not account data.
  async function handleAddLanguage() {
    if (newPairSource === newPairTarget) return;
    const isFirstEver = languagePairs.length === 0;
    await addLanguagePair(newPairSource, newPairTarget);
    await refreshLanguagePairs();

    if (userId && isFirstEver) {
      setIsSavingProfile(true);
      setProfileMessage(null);
      setProfileError(null);
      try {
        const result = await apiRequest<{ generated_sample_lists: boolean }>("/me/profile", {
          method: "PATCH",
          body: { source_language: newPairSource, target_language: newPairTarget },
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
  }

  function confirmRemoveLanguage(pair: LanguagePairSettings) {
    Alert.alert(
      t("remove_language_confirm_title"),
      t("remove_language_confirm_message", { source: pair.sourceLanguage, target: pair.targetLanguage }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            await removeLanguagePair(pair.sourceLanguage, pair.targetLanguage);
            await refreshLanguagePairs();
          },
        },
      ]
    );
  }

  async function handlePairCefrChange(pair: LanguagePairSettings, level: CefrLevel) {
    await updateLanguagePairSettings(pair.sourceLanguage, pair.targetLanguage, { cefrLevel: level });
    await refreshLanguagePairs();
  }

  async function handlePairAccentsChange(pair: LanguagePairSettings, enabled: boolean) {
    await updateLanguagePairSettings(pair.sourceLanguage, pair.targetLanguage, { requireAccents: enabled });
    await refreshLanguagePairs();
  }

  async function handleAutoDeleteChange(enabled: boolean) {
    setAutoDelete(enabled);
    await setAutoDeleteOldQuizzes(enabled);
  }

  async function handleAdaptiveQuizzesChange(enabled: boolean) {
    setAdaptiveQuizzes(enabled);
    await setAdaptiveQuizzesEnabled(enabled);
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
        <Text style={styles.settingTitle}>{t("learning_pair_title")}</Text>
        <Text style={shared.hint}>{t("learning_pair_hint")}</Text>

        {languagePairs.length === 0 && <Text style={shared.hint}>{t("no_languages_added")}</Text>}

        {languagePairs.map((pair) => (
          <View key={`${pair.sourceLanguage}-${pair.targetLanguage}`} style={styles.languageCard}>
            <View style={styles.languageCardHeader}>
              <Text style={styles.languagePairLabel}>
                {pair.sourceLanguage} → {pair.targetLanguage}
              </Text>
              <Pressable onPress={() => confirmRemoveLanguage(pair)} hitSlop={8}>
                <Text style={styles.removeIcon}>✕</Text>
              </Pressable>
            </View>
            <CefrLevelPicker value={pair.cefrLevel} onChange={(level) => handlePairCefrChange(pair, level)} />
            <View style={[shared.row, styles.accentsRow]}>
              <View style={styles.accentsLabel}>
                <Text style={shared.hint}>{t("require_accents_title")}</Text>
                <Text style={styles.accentsDesc}>{t("require_accents_desc")}</Text>
              </View>
              <Switch
                value={pair.requireAccents}
                onValueChange={(enabled) => handlePairAccentsChange(pair, enabled)}
              />
            </View>
          </View>
        ))}

        {userId && (
          <View style={styles.addLanguageRow}>
            <View style={styles.pairField}>
              <Text style={shared.hint}>{t("from_label")}</Text>
              <Dropdown
                value={newPairSource}
                onChange={setNewPairSource}
                options={LANGUAGES}
                disabled={isSavingProfile}
              />
            </View>
            <View style={styles.pairField}>
              <Text style={shared.hint}>{t("to_label")}</Text>
              <Dropdown
                value={newPairTarget}
                onChange={setNewPairTarget}
                options={LANGUAGES}
                disabled={isSavingProfile}
              />
            </View>
            <Pressable
              style={[shared.secondaryButton, shared.addActionButton, styles.addLanguageButton]}
              onPress={handleAddLanguage}
              disabled={isSavingProfile}
            >
              <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>
                {t("add_language_button")}
              </Text>
            </Pressable>
          </View>
        )}

        {isSavingProfile && <Text style={shared.hint}>{t("generating_starter_lists")}</Text>}
        {profileMessage && <Text style={shared.hint}>{profileMessage}</Text>}
        {profileError && <Text style={shared.errorText}>{profileError}</Text>}
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
  languageCard: {
    gap: 6,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 10,
    padding: 12,
  },
  languageCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  languagePairLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  removeIcon: {
    fontSize: 16,
    color: colors.error,
    paddingHorizontal: 4,
  },
  accentsRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  accentsLabel: {
    flex: 1,
    gap: 2,
  },
  accentsDesc: {
    fontSize: 12,
    opacity: 0.55,
  },
  addLanguageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  pairField: {
    flex: 1,
    gap: 4,
  },
  addLanguageButton: {
    paddingHorizontal: 16,
  },
});
