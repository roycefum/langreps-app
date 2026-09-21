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
  const { pairs, addPair, savedListId, sourceLanguage, targetLanguage } = usePairs();
  const [sourceWord, setSourceWord] = useState("");
  const [targetWord, setTargetWord] = useState("");

  function handleAdd() {
    if (!sourceWord.trim() || !targetWord.trim()) return;
    addPair(sourceWord.trim(), targetWord.trim());
    setSourceWord("");
    setTargetWord("");
  }

  return (
    <ScrollView style={shared.screen} contentContainerStyle={styles.content}>
      <BackButton href="/" confirmLeave={() => !savedListId && pairs.length >= 3} />
      <Text style={shared.title}>{t("list_details_title")}</Text>

      <PairsReview source="manual">
        <View style={shared.row}>
          <TextInput
            style={[shared.input, styles.rowInput]}
            placeholder={t("source_word_placeholder_dynamic", { language: sourceLanguage })}
            placeholderTextColor={colors.placeholder}
            value={sourceWord}
            onChangeText={setSourceWord}
          />
          <TextInput
            style={[shared.input, styles.rowInput]}
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
  rowInput: {
    flex: 1,
  },
  content: {
    gap: 16,
    paddingBottom: 32,
  },
});
