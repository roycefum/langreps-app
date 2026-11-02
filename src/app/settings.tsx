import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { CefrLevelPicker } from "@/components/cefr-level-picker";
import { LanguageForm } from "@/components/language-form";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useMode } from "@/lib/mode-context";
import {
  getAdaptiveQuizzesEnabled,
  getAutoDeleteOldQuizzes,
  getLanguagePairs,
  removeLanguagePair,
  setAdaptiveQuizzesEnabled,
  setAutoDeleteOldQuizzes,
  updateLanguagePairSettings,
  type LanguagePairSettings,
} from "@/lib/settings-storage";
import { type CefrLevel } from "@/lib/types";

// Flattened because Link asChild's Slot rejects an array of styles on its child.
const loginButtonStyle = StyleSheet.flatten([
  shared.secondaryButton,
  { backgroundColor: colors.accent, borderBottomColor: colors.accentShadow, alignSelf: "stretch" as const },
]);

export default function Settings() {
  const { t } = useI18n();
  const router = useRouter();
  const { userId, email, deleteAccount } = useAuth();
  const { setMode, refresh: refreshMode } = useMode();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [autoDelete, setAutoDelete] = useState(false);
  const [adaptiveQuizzes, setAdaptiveQuizzes] = useState(true);
  const [languagePairs, setLanguagePairsState] = useState<LanguagePairSettings[]>([]);
  useEffect(() => {
    getAutoDeleteOldQuizzes().then(setAutoDelete);
    getAdaptiveQuizzesEnabled().then(setAdaptiveQuizzes);
    getLanguagePairs().then(setLanguagePairsState);
  }, []);

  async function refreshLanguagePairs() {
    setLanguagePairsState(await getLanguagePairs());
    await refreshMode();
  }

  // Adding a pair makes it the active language mode (and syncs it to the
  // account) — see mode-context.tsx.
  async function handleAddLanguage(source: string, target: string) {
    await setMode(source, target);
    setLanguagePairsState(await getLanguagePairs());
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

  // Moved here from Home — a rare, destructive, irreversible action
  // belongs in account management, not the screen you land on every
  // session. Log out stayed on Home since it's low-risk and reversible.
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
              router.replace("/");
            } catch (e) {
              setDeleteError(e instanceof Error ? e.message : t("error_generic"));
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/" />
      <Text style={shared.title}>{t("settings_title")}</Text>

      {/* Account first — it is the one thing here a guest or a signed-in user
          both come looking for. */}
      {!userId && (
        <View style={styles.settingBlock}>
          <Text style={styles.settingTitle}>{t("account_section_title")}</Text>
          <Text style={shared.hint}>{t("signup_incentive_hint")}</Text>
          <Link href="/login" asChild>
            <PressButton style={loginButtonStyle}>
              <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>{t("log_in_sign_up")}</Text>
            </PressButton>
          </Link>
        </View>
      )}

      {userId && (
        <View style={styles.settingBlock}>
          <Text style={styles.settingTitle}>{t("account_section_title")}</Text>
          <Text style={shared.hint}>
            {t("signed_in_as", { email: "" })}
            <Text style={styles.emailBold}>{email}</Text>
          </Text>
          <Pressable onPress={confirmDeleteAccount} hitSlop={8}>
            <Text style={styles.deleteLink}>{t("delete_account")}</Text>
          </Pressable>
          {deleteError && <Text style={shared.errorText}>{deleteError}</Text>}
        </View>
      )}

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

        <LanguageForm submitLabel={t("add_language_button")} onSubmit={handleAddLanguage} />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 32,
  },
  emailBold: {
    fontWeight: "700",
    color: colors.text,
  },
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
  deleteLink: {
    color: colors.error,
    fontWeight: "600",
  },
});
