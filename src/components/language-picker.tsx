import { StyleSheet, Text, TextInput, View } from "react-native";

import { shared } from "@/constants/styles";
import { usePairs } from "@/lib/pairs-context";

// Editable version — shown on each builder screen (add/paste/file/photo),
// where the language pair for the list being built is chosen.
export function LanguagePicker() {
  const { sourceLanguage, targetLanguage, setSourceLanguage, setTargetLanguage } = usePairs();

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={shared.hint}>I already know</Text>
        <TextInput
          style={shared.input}
          value={sourceLanguage}
          onChangeText={setSourceLanguage}
          placeholder="e.g. English"
        />
      </View>
      <View style={styles.field}>
        <Text style={shared.hint}>I'm learning</Text>
        <TextInput
          style={shared.input}
          value={targetLanguage}
          onChangeText={setTargetLanguage}
          placeholder="e.g. Spanish"
        />
      </View>
    </View>
  );
}

// Read-only reminder — shown on the builder screens (add/paste/file/photo),
// so the language pair chosen on Home stays visible while adding words to
// it, since e.g. a reversed-column-order file only makes sense relative to
// a specific language pair.
export function LanguagePickerSummary() {
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
