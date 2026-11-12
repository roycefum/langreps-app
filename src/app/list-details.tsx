import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { PairsReview } from "@/components/pairs-review";
import { PressButton } from "@/components/press-button";
import { colors, shared } from "@/constants/styles";
import { useI18n } from "@/lib/i18n";
import { usePairs } from "@/lib/pairs-context";

export default function ListDetails() {
  const { t } = useI18n();
  const { pairs, addPair, savedListId, sourceLanguage, targetLanguage, hasUnsavedChanges } = usePairs();
  const [sourceWord, setSourceWord] = useState("");
  const [targetWord, setTargetWord] = useState("");

  function handleAdd() {
    if (!sourceWord.trim() || !targetWord.trim()) return;
    addPair(sourceWord.trim(), targetWord.trim());
    setSourceWord("");
    setTargetWord("");
  }

  return (
    // The keyboard used to cover the word boxes: on iOS the scroll view now
    // makes room for it and scrolls the focused box into view, and taps on the
    // Add button still register while the keyboard is up.
    <ScrollView
      style={shared.screen}
      contentContainerStyle={styles.content}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <BackButton href="/" confirmLeave={() => hasUnsavedChanges || (!savedListId && pairs.length >= 3)} />
      <Text style={shared.title}>{t("list_details_title")}</Text>

      <PairsReview source="manual">
        <View style={styles.wordEntry}>
          <TextInput
            style={[shared.input, shared.wordInput]}
            placeholder={t("source_word_placeholder_dynamic", { language: sourceLanguage })}
            placeholderTextColor={colors.placeholder}
            value={sourceWord}
            onChangeText={setSourceWord}
          />
          <TextInput
            style={[shared.input, shared.wordInput]}
            placeholder={t("target_word_placeholder_dynamic", { language: targetLanguage })}
            placeholderTextColor={colors.placeholder}
            value={targetWord}
            onChangeText={setTargetWord}
          />
        </View>

        <PressButton style={[shared.secondaryButton, shared.addActionButton]} onPress={handleAdd}>
          <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>{t("add_to_list")}</Text>
        </PressButton>
      </PairsReview>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // One word box per line, full width, so the words get the room and the type
  // size instead of sharing a row.
  wordEntry: {
    gap: 12,
  },
  content: {
    gap: 16,
    paddingBottom: 32,
  },
});
