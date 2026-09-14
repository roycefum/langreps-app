import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BackButton } from "@/components/back-button";
import { PairsReview } from "@/components/pairs-review";
import { colors, shared } from "@/constants/styles";
import { usePairs } from "@/lib/pairs-context";

export default function AddWords() {
  const { addPair } = usePairs();
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
      <BackButton href="/" />
      <Text style={shared.title}>Add Words</Text>

      <PairsReview source="manual">
        <View style={shared.row}>
          <TextInput
            style={[shared.input, styles.rowInput]}
            placeholder="Source word"
            placeholderTextColor={colors.placeholder}
            value={sourceWord}
            onChangeText={setSourceWord}
          />
          <TextInput
            style={[shared.input, styles.rowInput]}
            placeholder="Target word"
            placeholderTextColor={colors.placeholder}
            value={targetWord}
            onChangeText={setTargetWord}
          />
        </View>

        <Pressable style={[shared.secondaryButton, shared.addActionButton]} onPress={handleAdd}>
          <Text style={[shared.secondaryButtonText, shared.accentButtonText]}>Add to list</Text>
        </Pressable>
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
