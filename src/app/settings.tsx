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
  getRequireAccents,
  setAdaptiveQuizzesEnabled,
  setAutoDeleteOldQuizzes,
  setDefaultCefrLevel,
  setRequireAccents,
} from "@/lib/settings-storage";
import { DEFAULT_CEFR_LEVEL, type CefrLevel } from "@/lib/types";

export default function Settings() {
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

  return (
    <View style={shared.screen}>
      <BackButton href="/" />
      <Text style={shared.title}>Settings</Text>

      <View style={styles.settingBlock}>
        <Text style={styles.settingTitle}>Default Level</Text>
        <Text style={shared.hint}>
          Used for new quizzes — you can still change it for any single quiz when generating it.
        </Text>
        <CefrLevelPicker value={level} onChange={handleChange} />
      </View>

      <View style={[shared.row, styles.settingBlock]}>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>Adaptive Quizzes</Text>
          <Text style={shared.hint}>
            Get feedback on patterns you struggle with, and an option to target them
          </Text>
        </View>
        <Switch value={adaptiveQuizzes} onValueChange={handleAdaptiveQuizzesChange} />
      </View>

      <View style={[shared.row, styles.settingBlock]}>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>Require Accents</Text>
          <Text style={shared.hint}>Off accepts &quot;cafe&quot; for &quot;café&quot;</Text>
        </View>
        <Switch value={requireAccents} onValueChange={handleRequireAccentsChange} />
      </View>

      <View style={[shared.row, styles.settingBlock]}>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>Auto-Delete Old Quizzes</Text>
          <Text style={shared.hint}>Completed quizzes are removed after 30 days</Text>
        </View>
        <Switch value={autoDelete} onValueChange={handleAutoDeleteChange} />
      </View>

      <Link href="/onboarding" style={[shared.backLink, shared.linkText]}>
        About LangReps
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
