import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { CefrLevelPicker } from "@/components/cefr-level-picker";
import { shared } from "@/constants/styles";
import {
  getAdaptiveQuizzesEnabled,
  getAutoDeleteOldQuizzes,
  getDefaultCefrLevel,
  setAdaptiveQuizzesEnabled,
  setAutoDeleteOldQuizzes,
  setDefaultCefrLevel,
} from "@/lib/settings-storage";
import { DEFAULT_CEFR_LEVEL, type CefrLevel } from "@/lib/types";

export default function Settings() {
  const [level, setLevel] = useState<CefrLevel>(DEFAULT_CEFR_LEVEL);
  const [autoDelete, setAutoDelete] = useState(false);
  const [adaptiveQuizzes, setAdaptiveQuizzes] = useState(true);

  useEffect(() => {
    getDefaultCefrLevel().then(setLevel);
    getAutoDeleteOldQuizzes().then(setAutoDelete);
    getAdaptiveQuizzesEnabled().then(setAdaptiveQuizzes);
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

  return (
    <View style={shared.screen}>
      <BackButton href="/" />
      <Text style={shared.title}>Settings</Text>
      <Text style={shared.hint}>
        Default level for new quizzes — you can still change it for any single quiz when
        generating it.
      </Text>

      <CefrLevelPicker value={level} onChange={handleChange} />

      <View style={shared.row}>
        <Text style={[shared.hint, styles.settingText]}>
          Auto-delete completed quizzes after 30 days
        </Text>
        <Switch value={autoDelete} onValueChange={handleAutoDeleteChange} />
      </View>

      <View style={shared.row}>
        <Text style={[shared.hint, styles.settingText]}>
          Adaptive quizzes — feedback on patterns you struggle with, and an option to target them
        </Text>
        <Switch value={adaptiveQuizzes} onValueChange={handleAdaptiveQuizzesChange} />
      </View>

      <Link href="/onboarding" style={[shared.backLink, shared.linkText]}>
        About LangReps
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  settingText: {
    flex: 1,
  },
});
