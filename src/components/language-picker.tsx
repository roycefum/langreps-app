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
// actually be sent to the API without inviting an edit there (language is
// set on the builder screens, where the list is made). Level isn't shown
// here since it's not a list property — Generate Quiz has its own editable
// CefrLevelPicker instead.
export function LanguageSummary() {
  const { sourceLanguage, targetLanguage } = usePairs();
  return (
    <Text style={shared.hint}>
      {sourceLanguage} → {targetLanguage}
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
