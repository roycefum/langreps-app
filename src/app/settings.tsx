import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { CefrLevelPicker } from "@/components/cefr-level-picker";
import { shared } from "@/constants/styles";
import { getDefaultCefrLevel, setDefaultCefrLevel } from "@/lib/settings-storage";
import { DEFAULT_CEFR_LEVEL, type CefrLevel } from "@/lib/types";

export default function Settings() {
  const [level, setLevel] = useState<CefrLevel>(DEFAULT_CEFR_LEVEL);

  useEffect(() => {
    getDefaultCefrLevel().then(setLevel);
  }, []);

  async function handleChange(newLevel: CefrLevel) {
    setLevel(newLevel);
    await setDefaultCefrLevel(newLevel);
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.title}>Settings</Text>
      <Text style={shared.hint}>
        Default level for new quizzes — you can still change it for any single quiz when
        generating it.
      </Text>

      <CefrLevelPicker value={level} onChange={handleChange} />

      <Link href="/" style={shared.backLink}>
        <Text>← Back to Home</Text>
      </Link>
    </View>
  );
}
