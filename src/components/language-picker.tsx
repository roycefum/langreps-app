import { StyleSheet, Text, View } from "react-native";

import { Dropdown } from "@/components/dropdown";
import { shared } from "@/constants/styles";
import { usePairs } from "@/lib/pairs-context";
import { LANGUAGES } from "@/lib/types";

// Editable version — shown on each builder screen (add/paste/file/photo),
// where the language pair for the list being built is chosen.
export function LanguagePicker() {
  const { sourceLanguage, targetLanguage, setSourceLanguage, setTargetLanguage } = usePairs();

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={shared.hint}>I already know</Text>
        <Dropdown value={sourceLanguage} onChange={setSourceLanguage} options={LANGUAGES} />
      </View>
      <View style={styles.field}>
        <Text style={shared.hint}>I'm learning</Text>
        <Dropdown value={targetLanguage} onChange={setTargetLanguage} options={LANGUAGES} />
      </View>
    </View>
  );
}

// Read-only reminder — shown on Generate Quiz, confirming what will
// actually be sent to the API without inviting an edit there (language and
// level are both set on the builder screens, where the list is made).
export function ListSettingsSummary() {
  const { sourceLanguage, targetLanguage, cefrLevel } = usePairs();
  return (
    <Text style={shared.hint}>
      {sourceLanguage} → {targetLanguage} · Level {cefrLevel}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
  },
  field: {
    flex: 1,
    gap: 4,
  },
});
