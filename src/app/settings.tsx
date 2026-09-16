import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { CefrLevelPicker } from "@/components/cefr-level-picker";
import { Dropdown } from "@/components/dropdown";
import { shared } from "@/constants/styles";
import { LOCALES, LOCALE_LABELS, useI18n, type Locale } from "@/lib/i18n";
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
import { DEFAULT_CEFR_LEVEL, type CefrLevel } from "@/lib/types";

const LOCALE_OPTIONS = LOCALES.map((l) => LOCALE_LABELS[l]);

export default function Settings() {
  const { locale, setLocale, t } = useI18n();
  const [level, setLevel] = useState<CefrLevel>(DEFAULT_CEFR_LEVEL);
  const [autoDelete, setAutoDelete] = useState(false);
  const [adaptiveQuizzes, setAdaptiveQuizzes] = useState(true);
  const [requireAccents, setRequireAccentsState] = useState(false);

  useEffect(() => {
    getDefaultCefrLevel().then(setLevel);
    getAutoDeleteOldQuizzes().then(setAutoDelete);
    getAdaptiveQuizzesEnabled().then(setAdaptiveQuizzes);
    getRequireAccents().then(setRequireAccentsState);
  }, []);

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
    const next = LOCALES.find((l) => LOCALE_LABELS[l] === label) as Locale | undefined;
    if (next) setLocale(next);
  }

  return (
    <View style={shared.screen}>
      <BackButton href="/" />
      <Text style={shared.title}>{t("settings_title")}</Text>

      <View style={styles.settingBlock}>
        <Text style={styles.settingTitle}>{t("app_language_title")}</Text>
        <Dropdown value={LOCALE_LABELS[locale]} onChange={handleLocaleChange} options={LOCALE_OPTIONS} />
      </View>

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
});
